import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Accessibility, ArrowLeft, Mic, BookOpen, Brain, Headphones, FileText,
  Volume2, Pause, Play, Square, RotateCcw, ChevronRight, ChevronLeft,
  CheckCircle2, XCircle, Zap, FlaskConical, Dna, Sigma, AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/AppContext';
import { LANGUAGES, getVoiceLanguageTag, type Language } from '@/lib/i18n';
import {
  MEMORY_SUBJECTS, type MemorySubject,
  classLevelToClassId, getAllTopicsForSubject,
  generateDailyActivity, generateMemoryCards, generateRecallQuestion,
  type DailyActivity, type MemoryCard, type RecallQuestion,
} from '@/lib/memoryService';

type ActivityMode = 'voice_tutor' | 'listen_textbook' | 'voice_teachback' | 'audio_flashcards' | 'audio_mocktest' | 'read_aloud';

const ACTIVITY_CONFIG: { mode: ActivityMode; label: string; icon: LucideIcon; description: string }[] = [
  { mode: 'voice_tutor', label: 'Voice Tutor', icon: Mic, description: 'Ask questions by voice and hear answers' },
  { mode: 'listen_textbook', label: 'Listen to Textbook', icon: BookOpen, description: 'Listen to chapter content read aloud' },
  { mode: 'voice_teachback', label: 'Voice Teach It Back', icon: Brain, description: 'Explain concepts by voice to check understanding' },
  { mode: 'audio_flashcards', label: 'Audio Flash Cards', icon: Headphones, description: 'Listen to flash cards and recall answers' },
  { mode: 'audio_mocktest', label: 'Audio Mock Test', icon: FileText, description: '10 audio questions with voice or tap answers' },
  { mode: 'read_aloud', label: 'Read Aloud Controls', icon: Volume2, description: 'Read any text on screen aloud' },
];

const SUBJECT_ICONS: Record<MemorySubject, LucideIcon> = {
  Physics: Zap, Chemistry: FlaskConical, Biology: Dna, Mathematics: Sigma,
};

const SUBJECT_EMOJIS: Record<MemorySubject, string> = {
  Physics: '⚡', Chemistry: '🧪', Biology: '🧬', Mathematics: '📐',
};

const SUBJECT_ACCENTS: Record<MemorySubject, string> = {
  Physics: 'bg-indigo-100 text-indigo-600',
  Chemistry: 'bg-rose-100 text-rose-600',
  Biology: 'bg-emerald-100 text-emerald-600',
  Mathematics: 'bg-amber-100 text-amber-600',
};

// ---- Audio controller hook (shared pattern with Memory Support) ----
type AudioState = 'idle' | 'playing' | 'paused';
function useAudioController(language: Language) {
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const currentTextRef = useRef<string>('');

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    currentTextRef.current = text;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getVoiceLanguageTag(language);
    utterance.rate = 0.85;
    utterance.onend = () => setAudioState('idle');
    utterance.onerror = () => setAudioState('idle');
    window.speechSynthesis.speak(utterance);
    setAudioState('playing');
  }, [language]);

  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setAudioState('paused');
    }
  }, []);

  const resume = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setAudioState('playing');
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setAudioState('idle');
  }, []);

  const repeat = useCallback(() => {
    if (currentTextRef.current) speak(currentTextRef.current);
  }, [speak]);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  return { audioState, speak, pause, resume, stop, repeat, isSupported };
}

// ---- Voice input hook ----
function useVoiceInput(language: Language) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(Boolean(SR));
  }, []);

  const startListening = useCallback((onResult: (text: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (recognitionRef.current) recognitionRef.current.stop();
    const recognition = new SR();
    recognition.lang = getVoiceLanguageTag(language);
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
  }, []);

  return { listening, supported, startListening, stopListening };
}

// ---- Reusable audio controls bar with accessible labels ----
function AudioControlsBar({
  audioState, onPlay, onPause, onResume, onStop, onRepeat, isSupported, labelPrefix,
}: {
  audioState: AudioState;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRepeat: () => void;
  isSupported: boolean;
  labelPrefix: string;
}) {
  if (!isSupported) {
    return <p role="status" className="text-xs text-slate-400">Audio playback is not supported in this browser.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`${labelPrefix} audio controls`}>
      {audioState === 'idle' && (
        <Button variant="ghost" size="sm" className="text-teal-600" onClick={onPlay} aria-label={`${labelPrefix} - play`}>
          <Volume2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Listen
        </Button>
      )}
      {audioState === 'playing' && (
        <Button variant="ghost" size="sm" className="text-teal-600" onClick={onPause} aria-label={`${labelPrefix} - pause`}>
          <Pause className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Pause
        </Button>
      )}
      {audioState === 'paused' && (
        <Button variant="ghost" size="sm" className="text-teal-600" onClick={onResume} aria-label={`${labelPrefix} - resume`}>
          <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Resume
        </Button>
      )}
      <Button variant="ghost" size="sm" className="text-slate-500" onClick={onStop} disabled={audioState === 'idle'} aria-label={`${labelPrefix} - stop`}>
        <Square className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Stop
      </Button>
      <Button variant="ghost" size="sm" className="text-slate-500" onClick={onRepeat} disabled={audioState === 'idle'} aria-label={`${labelPrefix} - repeat`}>
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Repeat
      </Button>
    </div>
  );
}

function getUserId(): string | null {
  try {
    const raw = localStorage.getItem('padanamithra:currentUser');
    if (!raw) return null;
    const user = JSON.parse(raw) as { email: string };
    return user.email?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? null;
  } catch {
    return null;
  }
}

export function AccessibleLearningPage() {
  const { profile, language, setLanguage } = useApp();
  const [selectedActivity, setSelectedActivity] = useState<ActivityMode | null>(null);
  const [activeSubject, setActiveSubject] = useState<MemorySubject | null>(null);

  const classId = classLevelToClassId(profile?.classLevel ?? '');
  const classLabel = profile?.classLevel ?? '';
  const userId = getUserId();

  const availableSubjects = useMemo(() => {
    const selected = profile?.selectedSubjects ?? [];
    return MEMORY_SUBJECTS.filter((s) => selected.includes(s));
  }, [profile?.selectedSubjects]);

  const hasClass = Boolean(classId && profile?.classLevel);

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(activeSubject ?? ('' as MemorySubject))) {
      setActiveSubject(availableSubjects[0]);
    }
  }, [availableSubjects, activeSubject]);

  const handleBack = () => {
    setSelectedActivity(null);
  };

  if (!hasClass) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <Card className="border-amber-200 bg-amber-50/50 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Complete Your Profile</h2>
            <p className="mt-2 text-sm text-slate-600">
              Accessible Learning needs your selected class to provide the right content. Please complete your Padanamithra profile to continue.
            </p>
            <Button className="mt-4" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  // ---- Activity detail view ----
  if (selectedActivity && availableSubjects.length > 0) {
    const subject = activeSubject ?? availableSubjects[0];
    return (
      <ActivityDetail
        mode={selectedActivity}
        subject={subject}
        classId={classId}
        classLabel={classLabel}
        onBack={handleBack}
        language={language}
        availableSubjects={availableSubjects}
        onSubjectChange={setActiveSubject}
        userId={userId ?? ''}
      />
    );
  }

  // ---- Home view: activity selection ----
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
              <Accessibility className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Accessible Learning</h1>
              <p className="mt-0.5 text-sm text-slate-500">Voice-guided learning with audio support for every activity.</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Personalized audio-based learning for your {classLabel} subjects.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-2" role="group" aria-label="Language selection">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setLanguage(lang.value)}
              aria-pressed={language === lang.value}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none',
                language === lang.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-200',
              )}
            >
              {lang.flag} {lang.nativeLabel}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2.5" role="group" aria-label="Your selected subjects">
          {availableSubjects.map((subject) => {
            const Icon = SUBJECT_ICONS[subject];
            return (
              <div key={subject} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', SUBJECT_ACCENTS[subject])}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium text-slate-700">{SUBJECT_EMOJIS[subject]} {subject}</span>
              </div>
            );
          })}
          {availableSubjects.length === 0 && (
            <Card className="col-span-full border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm text-slate-500">
                No supported subjects found in your profile. Accessible Learning works with Physics, Chemistry, Biology and Mathematics.
              </p>
            </Card>
          )}
        </div>

        {availableSubjects.length > 0 && (
          <nav aria-label="Accessible Learning activities">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ACTIVITY_CONFIG.map((activity) => {
                const ActivityIcon = activity.icon;
                return (
                  <button
                    key={activity.mode}
                    onClick={() => setSelectedActivity(activity.mode)}
                    aria-label={`${activity.label} — ${activity.description}`}
                    className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600 transition group-hover:scale-110">
                      <ActivityIcon className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{activity.label}</p>
                    <p className="text-xs text-slate-500">{activity.description}</p>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          Accessible Learning uses your browser's built-in speech and voice features. No microphone recordings are stored.
        </p>
      </div>
    </AppShell>
  );
}

// =====================================================
// ACTIVITY DETAIL CONTAINER
// =====================================================
function ActivityDetail({
  mode, subject, classId, classLabel, onBack, language,
  availableSubjects, onSubjectChange, userId,
}: {
  mode: ActivityMode;
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  onBack: () => void;
  language: Language;
  availableSubjects: MemorySubject[];
  onSubjectChange: (s: MemorySubject) => void;
  userId: string;
}) {
  const Icon = SUBJECT_ICONS[subject];
  const config = ACTIVITY_CONFIG.find((a) => a.mode === mode)!;
  const ActivityIcon = config.icon;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-teal-600 focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Accessible Learning
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
            <ActivityIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{config.label}</h1>
            <p className="text-xs text-slate-500">{config.description}</p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', SUBJECT_ACCENTS[subject])}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-slate-700">{classLabel} {SUBJECT_EMOJIS[subject]} {subject}</span>
        </div>

        {availableSubjects.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Switch subject">
            {availableSubjects.map((s) => (
              <button
                key={s}
                onClick={() => onSubjectChange(s)}
                aria-pressed={subject === s}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none',
                  subject === s ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600',
                )}
              >
                {SUBJECT_EMOJIS[s]} {s}
              </button>
            ))}
          </div>
        )}

        {mode === 'voice_tutor' && <VoiceTutor subject={subject} classId={classId} classLabel={classLabel} language={language} userId={userId} />}
        {mode === 'listen_textbook' && <ListenTextbook subject={subject} classId={classId} classLabel={classLabel} language={language} />}
        {mode === 'voice_teachback' && <VoiceTeachBack subject={subject} classId={classId} classLabel={classLabel} language={language} userId={userId} />}
        {mode === 'audio_flashcards' && <AudioFlashCards subject={subject} classId={classId} classLabel={classLabel} language={language} userId={userId} />}
        {mode === 'audio_mocktest' && <AudioMockTest subject={subject} classId={classId} classLabel={classLabel} language={language} userId={userId} />}
        {mode === 'read_aloud' && <ReadAloud subject={subject} classId={classId} classLabel={classLabel} language={language} />}
      </div>
    </AppShell>
  );
}

// =====================================================
// 1. VOICE TUTOR
// =====================================================
function VoiceTutor({
  subject, classId, classLabel, language, userId,
}: {
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  language: Language;
  userId: string;
}) {
  const audio = useAudioController(language);
  const voice = useVoiceInput(language);
  const [allTopics, setAllTopics] = useState<{ chapter: string; topic: string }[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activity, setActivity] = useState<DailyActivity | null>(null);
  const [transcript, setTranscript] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const topics = getAllTopicsForSubject(classId, subject);
    setAllTopics(topics);
    if (topics.length > 0) {
      const chosen = topics[0];
      const generated = generateDailyActivity(classLabel, subject, chosen.chapter, chosen.topic, language);
      setActivity(generated);
      audio.speak(`${generated.topic}. ${generated.explanation}`);
    }
    return () => audio.stop();
  }, [classId, classLabel, subject, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    if (currentIdx + 1 >= allTopics.length) return;
    audio.stop();
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    const chosen = allTopics[nextIdx];
    const generated = generateDailyActivity(classLabel, subject, chosen.chapter, chosen.topic, language);
    setActivity(generated);
    setShowExplanation(false);
    setTranscript('');
    audio.speak(`${generated.topic}. ${generated.explanation}`);
  };

  const handlePrevious = () => {
    if (currentIdx === 0) return;
    audio.stop();
    const prevIdx = currentIdx - 1;
    setCurrentIdx(prevIdx);
    const chosen = allTopics[prevIdx];
    const generated = generateDailyActivity(classLabel, subject, chosen.chapter, chosen.topic, language);
    setActivity(generated);
    setShowExplanation(false);
    setTranscript('');
  };

  const handleVoiceQuestion = () => {
    if (voice.listening) {
      voice.stopListening();
      return;
    }
    voice.startListening((text) => {
      setTranscript(text);
    });
  };

  if (!activity) {
    return (
      <Card className="border-slate-200 p-8 text-center" role="status">
        <p className="text-sm text-slate-500">No topics available for this subject.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-teal-100 p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <Badge variant="secondary" className="bg-teal-100 text-teal-600">{activity.chapter}</Badge>
          <span className="text-xs text-slate-400" aria-live="polite">{currentIdx + 1} of {allTopics.length}</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900">{activity.topic}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700" aria-live="polite">{activity.explanation}</p>

        <div className="mt-3">
          <AudioControlsBar
            audioState={audio.audioState}
            onPlay={() => audio.speak(`${activity.topic}. ${activity.explanation}`)}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onRepeat={audio.repeat}
            isSupported={audio.isSupported}
            labelPrefix="Voice Tutor"
          />
        </div>
      </Card>

      <Card className="border-slate-200 p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Ask a Question by Voice</h3>
        <div className="flex gap-2">
          <Button
            onClick={handleVoiceQuestion}
            className={cn(voice.listening ? 'bg-rose-500 hover:bg-rose-600' : 'bg-teal-600 hover:bg-teal-700')}
            aria-label={voice.listening ? 'Stop voice input' : 'Start voice input'}
          >
            <Mic className="mr-2 h-4 w-4" />
            {voice.listening ? 'Listening...' : 'Ask by Voice'}
          </Button>
        </div>
        {!voice.supported && (
          <p className="mt-2 text-xs text-slate-400">Voice input is not supported in this browser. You can still use the Listen controls above.</p>
        )}
        {voice.listening && <p className="mt-2 text-xs text-teal-600" aria-live="polite">Listening... Speak your question.</p>}
        {transcript && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">You asked:</p>
            <p className="text-sm text-slate-800">{transcript}</p>
          </div>
        )}

        {showExplanation && (
          <div className="mt-3 rounded-xl bg-teal-50 border border-teal-200 p-3" role="region" aria-label="Answer">
            <p className="text-sm text-teal-800"><strong>Key point:</strong> {activity.feedback}</p>
            <div className="mt-2">
              <AudioControlsBar
                audioState={audio.audioState}
                onPlay={() => audio.speak(activity.feedback)}
                onPause={audio.pause}
                onResume={audio.resume}
                onStop={audio.stop}
                onRepeat={audio.repeat}
                isSupported={audio.isSupported}
                labelPrefix="Answer"
              />
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setShowExplanation(!showExplanation)}
          aria-expanded={showExplanation}
        >
          {showExplanation ? 'Hide Key Point' : 'Show Key Point'}
        </Button>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={handlePrevious} disabled={currentIdx === 0} aria-label="Previous topic">
          <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
          Previous
        </Button>
        <Button variant="ghost" size="sm" onClick={handleNext} disabled={currentIdx + 1 >= allTopics.length} aria-label="Next topic">
          Next
          <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// 2. LISTEN TO TEXTBOOK
// =====================================================
function ListenTextbook({
  subject, classId, classLabel, language,
}: {
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  language: Language;
}) {
  const audio = useAudioController(language);
  const [allTopics, setAllTopics] = useState<{ chapter: string; topic: string }[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activity, setActivity] = useState<DailyActivity | null>(null);

  useEffect(() => {
    const topics = getAllTopicsForSubject(classId, subject);
    setAllTopics(topics);
    if (topics.length > 0) {
      const generated = generateDailyActivity(classLabel, subject, topics[0].chapter, topics[0].topic, language);
      setActivity(generated);
    }
    return () => audio.stop();
  }, [classId, classLabel, subject, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (idx: number) => {
    audio.stop();
    setCurrentIdx(idx);
    const chosen = allTopics[idx];
    const generated = generateDailyActivity(classLabel, subject, chosen.chapter, chosen.topic, language);
    setActivity(generated);
  };

  const fullText = activity ? `${activity.chapter}, ${activity.topic}. ${activity.explanation} Visual: ${activity.visualDescription}` : '';

  if (!activity) {
    return (
      <Card className="border-slate-200 p-8 text-center" role="status">
        <p className="text-sm text-slate-500">No textbook content available for this subject.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-teal-100 p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <Badge variant="secondary" className="bg-teal-100 text-teal-600">{activity.chapter}</Badge>
          <span className="text-xs text-slate-400" aria-live="polite">{currentIdx + 1} of {allTopics.length}</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900">{activity.topic}</h2>

        <section className="mt-3" aria-label="Explanation">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Explanation</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{activity.explanation}</p>
        </section>

        <section className="mt-3" aria-label="Visual description">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Visual</h3>
          <p className="mt-1 text-sm text-slate-600">{activity.visualDescription}</p>
        </section>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <AudioControlsBar
            audioState={audio.audioState}
            onPlay={() => audio.speak(fullText)}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onRepeat={audio.repeat}
            isSupported={audio.isSupported}
            labelPrefix="Textbook"
          />
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0} aria-label="Previous section">
          <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
          Previous
        </Button>
        <Button variant="ghost" size="sm" onClick={() => goTo(currentIdx + 1)} disabled={currentIdx + 1 >= allTopics.length} aria-label="Next section">
          Next
          <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// 3. VOICE TEACH IT BACK
// =====================================================
function VoiceTeachBack({
  subject, classId, classLabel, language, userId,
}: {
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  language: Language;
  userId: string;
}) {
  const audio = useAudioController(language);
  const voice = useVoiceInput(language);
  const [allTopics, setAllTopics] = useState<{ chapter: string; topic: string }[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activity, setActivity] = useState<DailyActivity | null>(null);
  const [transcript, setTranscript] = useState('');
  const [evaluated, setEvaluated] = useState(false);
  const [evaluation, setEvaluation] = useState<{ score: number; feedback: string } | null>(null);

  useEffect(() => {
    const topics = getAllTopicsForSubject(classId, subject);
    setAllTopics(topics);
    if (topics.length > 0) {
      const generated = generateDailyActivity(classLabel, subject, topics[0].chapter, topics[0].topic, language);
      setActivity(generated);
    }
    return () => audio.stop();
  }, [classId, classLabel, subject, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (idx: number) => {
    audio.stop();
    setCurrentIdx(idx);
    const chosen = allTopics[idx];
    const generated = generateDailyActivity(classLabel, subject, chosen.chapter, chosen.topic, language);
    setActivity(generated);
    setTranscript('');
    setEvaluated(false);
    setEvaluation(null);
  };

  const handleVoice = () => {
    if (voice.listening) {
      voice.stopListening();
      return;
    }
    setTranscript('');
    setEvaluated(false);
    voice.startListening((text) => setTranscript(text));
  };

  const handleEvaluate = () => {
    if (!activity || !transcript.trim()) return;
    const topicWords = activity.topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const explanationWords = activity.explanation.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const transcriptLower = transcript.toLowerCase();
    const matchedTopic = topicWords.filter((w) => transcriptLower.includes(w)).length;
    const matchedExplanation = explanationWords.filter((w) => transcriptLower.includes(w)).length;
    const totalWords = topicWords.length + explanationWords.length;
    const score = totalWords > 0 ? Math.min(100, Math.round(((matchedTopic + matchedExplanation) / totalWords) * 100)) : 0;
    let feedback: string;
    if (score >= 60) {
      feedback = `Great job! You explained ${activity.topic} well. You covered the key points.`;
    } else if (score >= 30) {
      feedback = `Good start. You mentioned some ideas about ${activity.topic}. Try to include more key terms from the explanation.`;
    } else {
      feedback = `Keep practicing. Listen to the explanation again and try to use words like: ${topicWords.slice(0, 3).join(', ')}.`;
    }
    setEvaluation({ score, feedback });
    setEvaluated(true);
    audio.speak(feedback);
  };

  if (!activity) {
    return (
      <Card className="border-slate-200 p-8 text-center" role="status">
        <p className="text-sm text-slate-500">No topics available for this subject.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-teal-100 p-5 shadow-sm">
        <Badge variant="secondary" className="bg-teal-100 text-teal-600">{activity.chapter}</Badge>
        <h2 className="mt-2 text-lg font-bold text-slate-900">{activity.topic}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{activity.explanation}</p>
        <div className="mt-3">
          <AudioControlsBar
            audioState={audio.audioState}
            onPlay={() => audio.speak(`${activity.topic}. ${activity.explanation}`)}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onRepeat={audio.repeat}
            isSupported={audio.isSupported}
            labelPrefix="Teach Back"
          />
        </div>
      </Card>

      <Card className="border-slate-200 p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Explain It Back in Your Own Words</h3>
        <p className="mb-3 text-xs text-slate-500">Tap the microphone and explain what you just learned. Your voice is not stored.</p>
        <div className="flex gap-2">
          <Button
            onClick={handleVoice}
            className={cn(voice.listening ? 'bg-rose-500 hover:bg-rose-600' : 'bg-teal-600 hover:bg-teal-700')}
            aria-label={voice.listening ? 'Stop recording' : 'Start recording your explanation'}
          >
            <Mic className="mr-2 h-4 w-4" />
            {voice.listening ? 'Stop' : 'Record Explanation'}
          </Button>
        </div>
        {!voice.supported && (
          <p className="mt-2 text-xs text-slate-400">Voice input is not supported in this browser. You can still listen to the explanation and practice mentally.</p>
        )}
        {voice.listening && <p className="mt-2 text-xs text-teal-600" aria-live="polite">Listening... Explain the concept.</p>}

        {transcript && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Your explanation:</p>
            <p className="text-sm text-slate-800">{transcript}</p>
          </div>
        )}

        {transcript && !evaluated && (
          <Button size="sm" className="mt-3" onClick={handleEvaluate}>Check My Explanation</Button>
        )}

        {evaluation && (
          <div className="mt-3 rounded-xl bg-teal-50 border border-teal-200 p-4" role="region" aria-label="Evaluation result">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-teal-700">{evaluation.score}%</span>
              <span className="text-sm text-teal-600">coverage</span>
            </div>
            <p className="mt-1 text-sm text-teal-800">{evaluation.feedback}</p>
            <div className="mt-2">
              <AudioControlsBar
                audioState={audio.audioState}
                onPlay={() => audio.speak(evaluation.feedback)}
                onPause={audio.pause}
                onResume={audio.resume}
                onStop={audio.stop}
                onRepeat={audio.repeat}
                isSupported={audio.isSupported}
                labelPrefix="Evaluation"
              />
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0} aria-label="Previous topic">
          <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
          Previous
        </Button>
        <Button variant="ghost" size="sm" onClick={() => goTo(currentIdx + 1)} disabled={currentIdx + 1 >= allTopics.length} aria-label="Next topic">
          Next
          <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// 4. AUDIO FLASH CARDS (at least 5 cards)
// =====================================================
function AudioFlashCards({
  subject, classId, classLabel, language, userId,
}: {
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  language: Language;
  userId: string;
}) {
  const audio = useAudioController(language);
  const voice = useVoiceInput(language);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [resultState, setResultState] = useState<'none' | 'correct' | 'wrong'>('none');

  const generateCards = useCallback(() => {
    const allTopics = getAllTopicsForSubject(classId, subject);
    if (allTopics.length === 0) return;
    // Pick 5+ topics spread across chapters
    const shuffled = [...allTopics].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(5, shuffled.length));
    const generated = selected.map((t, i) => {
      const activity = generateDailyActivity(classLabel, subject, t.chapter, t.topic, language);
      return {
        id: `afc-${i}-${Date.now()}`,
        chapter: t.chapter,
        topic: t.topic,
        front: activity.question,
        back: `${activity.options[activity.answerIndex]} — ${activity.feedback}`,
        visualDescription: activity.visualDescription,
        hint: activity.options.find((_, idx) => idx !== activity.answerIndex) ?? activity.feedback,
      };
    });
    setCards(generated);
    setCurrentIdx(0);
    setShowBack(false);
    setUserAnswer('');
    setResultState('none');
  }, [classId, classLabel, subject, language]);

  useEffect(() => {
    generateCards();
    return () => audio.stop();
  }, [generateCards]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    audio.stop();
    setShowBack(false);
    setUserAnswer('');
    setResultState('none');
    setCurrentIdx((i) => (i + 1 < cards.length ? i + 1 : 0));
  };

  const handlePrevious = () => {
    audio.stop();
    setShowBack(false);
    setUserAnswer('');
    setResultState('none');
    setCurrentIdx((i) => (i - 1 >= 0 ? i - 1 : cards.length - 1));
  };

  const handleVoiceAnswer = () => {
    if (voice.listening) {
      voice.stopListening();
      return;
    }
    voice.startListening((text) => setUserAnswer(text));
  };

  const handleCheckAnswer = () => {
    if (!cards[currentIdx] || !userAnswer.trim()) return;
    const card = cards[currentIdx];
    const answerText = card.back.split(' — ')[0].toLowerCase();
    const userLower = userAnswer.toLowerCase();
    const isCorrect = userLower.includes(answerText.slice(0, Math.min(5, answerText.length))) || answerText.includes(userLower.slice(0, Math.min(5, userLower.length)));
    setResultState(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      audio.speak(`Correct! ${card.back}`);
    } else {
      audio.speak(`The answer is: ${card.back}`);
      setShowBack(true);
    }
  };

  if (cards.length === 0) {
    return (
      <Card className="border-slate-200 p-8 text-center" role="status">
        <p className="text-sm text-slate-500">No flash cards available for this subject.</p>
      </Card>
    );
  }

  const card = cards[currentIdx];
  const fullCardText = `Question: ${card.front}. ${showBack ? `Answer: ${card.back}` : ''}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500" aria-live="polite">Card {currentIdx + 1} of {cards.length}</span>
        <Button variant="ghost" size="sm" onClick={generateCards} aria-label="Generate new cards">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          New Cards
        </Button>
      </div>

      <Card className="min-h-[240px] border-slate-200 p-6 shadow-sm" role="region" aria-label={`Flash card ${currentIdx + 1}: ${card.topic}`}>
        <Badge variant="secondary" className="bg-teal-100 text-teal-600">{card.chapter}</Badge>
        <p className="mt-1 text-xs text-slate-500">{card.topic}</p>
        <p className="mt-3 text-base font-semibold text-slate-900">{card.front}</p>

        {showBack && (
          <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4" role="region" aria-label="Answer">
            <p className="text-sm font-medium text-emerald-800">{card.back}</p>
          </div>
        )}

        <div className="mt-4 border-t border-slate-100 pt-3">
          <AudioControlsBar
            audioState={audio.audioState}
            onPlay={() => audio.speak(fullCardText)}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onRepeat={audio.repeat}
            isSupported={audio.isSupported}
            labelPrefix="Flash card"
          />
        </div>
      </Card>

      <Card className="border-slate-200 p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Your Answer</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckAnswer()}
            placeholder="Type or speak your answer..."
            aria-label="Your answer"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          {voice.supported && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoiceAnswer}
              className={cn(voice.listening && 'border-rose-200 text-rose-600')}
              aria-label={voice.listening ? 'Stop voice input' : 'Speak your answer'}
            >
              {voice.listening ? 'Stop' : <Mic className="h-4 w-4" />}
            </Button>
          )}
        </div>
        {voice.listening && <p className="mt-1 text-xs text-teal-600" aria-live="polite">Listening...</p>}
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={handleCheckAnswer} disabled={!userAnswer.trim()}>Check Answer</Button>
          <Button size="sm" variant="outline" onClick={() => setShowBack(!showBack)} aria-expanded={showBack}>
            {showBack ? 'Hide Answer' : 'Reveal Answer'}
          </Button>
        </div>
        {resultState === 'correct' && (
          <p className="mt-2 flex items-center gap-1 text-sm text-emerald-600" role="status">
            <CheckCircle2 className="h-4 w-4" /> Correct!
          </p>
        )}
        {resultState === 'wrong' && (
          <p className="mt-2 flex items-center gap-1 text-sm text-rose-600" role="status">
            <XCircle className="h-4 w-4" /> The answer is shown above.
          </p>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={handlePrevious} aria-label="Previous card">
          <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
          Previous
        </Button>
        <Button variant="ghost" size="sm" onClick={handleNext} aria-label="Next card">
          Next
          <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// 5. AUDIO MOCK TEST (10 questions)
// =====================================================
function AudioMockTest({
  subject, classId, classLabel, language, userId,
}: {
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  language: Language;
  userId: string;
}) {
  const audio = useAudioController(language);
  const voice = useVoiceInput(language);
  const [questions, setQuestions] = useState<DailyActivity[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [voiceAnswer, setVoiceAnswer] = useState('');

  const generateQuestions = useCallback(() => {
    const allTopics = getAllTopicsForSubject(classId, subject);
    if (allTopics.length === 0) return;
    // We need 10 questions. Shuffle topics and cycle if fewer than 10.
    const shuffled = [...allTopics].sort(() => Math.random() - 0.5);
    const generated: DailyActivity[] = [];
    for (let i = 0; i < 10; i++) {
      const t = shuffled[i % shuffled.length];
      const activity = generateDailyActivity(classLabel, subject, t.chapter, t.topic, language);
      generated.push(activity);
    }
    setQuestions(generated);
    setCurrentIdx(0);
    setSelectedOption(null);
    setShowResult(false);
    setScore(0);
    setFinished(false);
    setVoiceAnswer('');
  }, [classId, classLabel, subject, language]);

  useEffect(() => {
    generateQuestions();
    return () => audio.stop();
  }, [generateQuestions]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = (index: number) => {
    if (showResult || !questions[currentIdx]) return;
    setSelectedOption(index);
    setShowResult(true);
    const isCorrect = index === questions[currentIdx].answerIndex;
    if (isCorrect) setScore((s) => s + 1);
    audio.speak(isCorrect
      ? `Correct! ${questions[currentIdx].feedback}`
      : `Not quite. The correct answer is: ${questions[currentIdx].options[questions[currentIdx].answerIndex]}. ${questions[currentIdx].feedback}`);
  };

  const handleVoiceAnswer = () => {
    if (voice.listening) {
      voice.stopListening();
      return;
    }
    setVoiceAnswer('');
    voice.startListening((text) => {
      setVoiceAnswer(text);
      // Try to match spoken text to an option
      const lowerText = text.toLowerCase();
      const matchIdx = questions[currentIdx]?.options.findIndex((opt) =>
        opt.toLowerCase().split(/\s+/).some((w) => w.length > 3 && lowerText.includes(w))
      );
      if (matchIdx !== undefined && matchIdx >= 0) {
        handleAnswer(matchIdx);
      }
    });
  };

  const handleNext = () => {
    audio.stop();
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelectedOption(null);
    setShowResult(false);
    setVoiceAnswer('');
  };

  const handlePrevious = () => {
    audio.stop();
    if (currentIdx === 0) return;
    setCurrentIdx((i) => i - 1);
    setSelectedOption(null);
    setShowResult(false);
    setVoiceAnswer('');
  };

  const handleRestart = () => {
    audio.stop();
    generateQuestions();
  };

  if (questions.length === 0) {
    return (
      <Card className="border-slate-200 p-8 text-center" role="status">
        <p className="text-sm text-slate-500">No questions available for this subject.</p>
      </Card>
    );
  }

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    const resultText = `Test complete! You scored ${score} out of ${questions.length}. That is ${percentage} percent.`;
    return (
      <Card className="border-teal-100 p-8 text-center shadow-sm" role="region" aria-label="Test results">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
          {percentage >= 60 ? <CheckCircle2 className="h-8 w-8 text-teal-600" /> : <Brain className="h-8 w-8 text-teal-600" />}
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">Test Complete</h2>
        <p className="mt-2 text-3xl font-bold text-teal-600">{score}/{questions.length}</p>
        <p className="mt-1 text-sm text-slate-500">{percentage}% correct</p>
        <div className="mt-4 flex justify-center">
          <AudioControlsBar
            audioState={audio.audioState}
            onPlay={() => audio.speak(resultText)}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onRepeat={audio.repeat}
            isSupported={audio.isSupported}
            labelPrefix="Results"
          />
        </div>
        <Button className="mt-4" onClick={handleRestart}>
          <RotateCcw className="mr-2 h-4 w-4" />
          New Test
        </Button>
      </Card>
    );
  }

  const q = questions[currentIdx];
  const questionText = `Question ${currentIdx + 1} of ${questions.length}. ${q.question} Option A: ${q.options[0]}. Option B: ${q.options[1]}. Option C: ${q.options[2]}. ${q.options[3] ? `Option D: ${q.options[3]}.` : ''}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500" aria-live="polite">Question {currentIdx + 1} of {questions.length}</span>
        <Badge variant="secondary" className="bg-teal-100 text-teal-600">Score: {score}</Badge>
      </div>

      <Card className="border-slate-200 p-5 shadow-sm" role="region" aria-label={`Question ${currentIdx + 1}`}>
        <Badge variant="secondary" className="bg-slate-100 text-slate-600">{q.chapter}</Badge>
        <p className="mt-2 text-xs text-slate-500">{q.topic}</p>
        <h2 className="mt-3 text-base font-semibold text-slate-900">{q.question}</h2>

        <div className="mt-3">
          <AudioControlsBar
            audioState={audio.audioState}
            onPlay={() => audio.speak(questionText)}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onRepeat={audio.repeat}
            isSupported={audio.isSupported}
            labelPrefix={`Question ${currentIdx + 1}`}
          />
        </div>

        <div className="mt-4 space-y-2.5" role="group" aria-label="Answer options">
          {q.options.map((option, i) => {
            const showCorrect = showResult && i === q.answerIndex;
            const showWrong = showResult && selectedOption === i && i !== q.answerIndex;
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={showResult}
                aria-label={`Option ${String.fromCharCode(65 + i)}: ${option}`}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none',
                  showCorrect
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : showWrong
                      ? 'border-rose-300 bg-rose-50 text-rose-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-200',
                )}
              >
                <span><span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>{option}</span>
                {showCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {showWrong && <XCircle className="h-4 w-4 text-rose-600" />}
              </button>
            );
          })}
        </div>

        {voice.supported && !showResult && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoiceAnswer}
              className={cn(voice.listening && 'border-rose-200 text-rose-600')}
              aria-label={voice.listening ? 'Stop voice answer' : 'Speak your answer'}
            >
              <Mic className="mr-1.5 h-3.5 w-3.5" />
              {voice.listening ? 'Listening...' : 'Speak Answer'}
            </Button>
            {voice.listening && <p className="mt-1 text-xs text-teal-600" aria-live="polite">Say the option letter or the answer text.</p>}
            {voiceAnswer && !showResult && <p className="mt-1 text-xs text-slate-500">Heard: "{voiceAnswer}"</p>}
          </div>
        )}

        {showResult && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4" role="region" aria-label="Feedback">
            <p className="text-sm text-slate-700">{q.feedback}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleNext}>
                {currentIdx + 1 >= questions.length ? 'Finish Test' : 'Next Question'}
                <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
              {currentIdx > 0 && (
                <Button size="sm" variant="outline" onClick={handlePrevious}>
                  <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
                  Previous
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// =====================================================
// 6. READ ALOUD CONTROLS
// =====================================================
function ReadAloud({
  subject, classId, classLabel, language,
}: {
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  language: Language;
}) {
  const audio = useAudioController(language);
  const [allTopics, setAllTopics] = useState<{ chapter: string; topic: string }[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activity, setActivity] = useState<DailyActivity | null>(null);
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    const topics = getAllTopicsForSubject(classId, subject);
    setAllTopics(topics);
    if (topics.length > 0) {
      const generated = generateDailyActivity(classLabel, subject, topics[0].chapter, topics[0].topic, language);
      setActivity(generated);
    }
    return () => audio.stop();
  }, [classId, classLabel, subject, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (idx: number) => {
    audio.stop();
    setCurrentIdx(idx);
    const chosen = allTopics[idx];
    const generated = generateDailyActivity(classLabel, subject, chosen.chapter, chosen.topic, language);
    setActivity(generated);
  };

  const textToRead = customText.trim() || (activity ? `${activity.topic}. ${activity.explanation} ${activity.visualDescription}` : '');

  return (
    <div className="space-y-5">
      <Card className="border-teal-100 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Read Aloud</h2>
        <p className="mt-1 text-sm text-slate-500">Listen to any text from your textbook, or type your own text to hear it read aloud.</p>

        <div className="mt-4">
          <label htmlFor="custom-read-aloud" className="text-xs font-medium text-slate-600">Type or paste text to read aloud (optional)</label>
          <textarea
            id="custom-read-aloud"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Type text here, or leave blank to read the current topic..."
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <AudioControlsBar
            audioState={audio.audioState}
            onPlay={() => audio.speak(textToRead)}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onRepeat={audio.repeat}
            isSupported={audio.isSupported}
            labelPrefix="Read aloud"
          />
        </div>
      </Card>

      {activity && !customText.trim() && (
        <Card className="border-slate-200 p-5 shadow-sm" role="region" aria-label="Current topic content">
          <div className="mb-2 flex items-center justify-between">
            <Badge variant="secondary" className="bg-teal-100 text-teal-600">{activity.chapter}</Badge>
            <span className="text-xs text-slate-400" aria-live="polite">{currentIdx + 1} of {allTopics.length}</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">{activity.topic}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{activity.explanation}</p>
          <p className="mt-2 text-sm text-slate-600">{activity.visualDescription}</p>
        </Card>
      )}

      {!customText.trim() && (
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0} aria-label="Previous topic">
            <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
            Previous
          </Button>
          <Button variant="ghost" size="sm" onClick={() => goTo(currentIdx + 1)} disabled={currentIdx + 1 >= allTopics.length} aria-label="Next topic">
            Next
            <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

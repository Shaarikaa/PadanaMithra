import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Brain, ArrowLeft, Zap, FlaskConical, Dna, Sigma, BookOpen, RefreshCw,
  Layers, Eye, Lightbulb, BarChart3, Volume2, Pause, Play, Square,
  RotateCcw, ChevronRight, ChevronLeft, CheckCircle2, XCircle, Sparkles,
  Calendar, TrendingUp, AlertCircle, Mic, MicOff,
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
  MEMORY_SUBJECTS, type MemorySubject, type ActivityType, type DailyActivity,
  type MemoryCard, type RecallQuestion, type VisualLearningItem,
  type MemoryTopic, type MemoryProgressSummary,
  getClassLevelLabel, classLevelToClassId, getChaptersForMemorySubject, getAllTopicsForSubject,
  generateDailyActivity, generateMemoryCards, generateRecallQuestion,
  generateVisualLearningItems, fetchMemoryTopics, upsertMemoryTopic,
  updateMemoryTopic, recordProgress, recordSession, scheduleReview,
  fetchProgressSummary, computeNextReviewDate, getReviewInterval,
  computeAdaptiveStatus, getAdaptiveRecommendation,
} from '@/lib/memoryService';

type ViewMode = 'home' | 'activity' | 'progress';

const SUBJECT_ICONS: Record<MemorySubject, LucideIcon> = {
  Physics: Zap,
  Chemistry: FlaskConical,
  Biology: Dna,
  Mathematics: Sigma,
};

const SUBJECT_EMOJIS: Record<MemorySubject, string> = {
  Physics: '⚛️',
  Chemistry: '🧪',
  Biology: '🧬',
  Mathematics: '📐',
};

const SUBJECT_ACCENTS: Record<MemorySubject, string> = {
  Physics: 'bg-indigo-100 text-indigo-600',
  Chemistry: 'bg-rose-100 text-rose-600',
  Biology: 'bg-emerald-100 text-emerald-600',
  Mathematics: 'bg-amber-100 text-amber-600',
};

const ACTIVITY_TYPES: { type: ActivityType; label: string; icon: LucideIcon; description: string }[] = [
  { type: 'daily_activity', label: "Today's Memory Activity", icon: BookOpen, description: 'A new concept to learn today' },
  { type: 'review', label: 'Review Previous Learning', icon: RefreshCw, description: 'Spaced review of past topics' },
  { type: 'memory_cards', label: 'Memory Cards', icon: Layers, description: 'Flashcards with hints and help' },
  { type: 'visual_learning', label: 'Visual Learning', icon: Eye, description: 'Learn through diagrams and visuals' },
  { type: 'recall_practice', label: 'Recall Practice', icon: Brain, description: 'Progressive recall with hints' },
  { type: 'progress', label: 'Progress', icon: BarChart3, description: 'Track your memory journey' },
];

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

// ---- Audio controller hook ----
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
    utterance.rate = 0.9;
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
    if (currentTextRef.current) {
      speak(currentTextRef.current);
    }
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
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
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
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  }, []);

  return { listening, supported, startListening, stopListening };
}

// ---- Audio controls bar ----
function AudioControls({
  audioState, onPlay, onPause, onResume, onStop, onRepeat, isSupported,
}: {
  audioState: AudioState;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRepeat: () => void;
  isSupported: boolean;
}) {
  if (!isSupported) {
    return <p className="text-xs text-slate-400">Audio playback isn't supported in this browser.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {audioState === 'idle' && (
        <Button variant="ghost" size="sm" className="text-indigo-600" onClick={onPlay}>
          <Volume2 className="mr-1.5 h-3.5 w-3.5" />
          Listen
        </Button>
      )}
      {audioState === 'playing' && (
        <Button variant="ghost" size="sm" className="text-indigo-600" onClick={onPause}>
          <Pause className="mr-1.5 h-3.5 w-3.5" />
          Pause
        </Button>
      )}
      {audioState === 'paused' && (
        <Button variant="ghost" size="sm" className="text-indigo-600" onClick={onResume}>
          <Play className="mr-1.5 h-3.5 w-3.5" />
          Resume
        </Button>
      )}
      <Button variant="ghost" size="sm" className="text-slate-500" onClick={onStop} disabled={audioState === 'idle'}>
        <Square className="mr-1.5 h-3.5 w-3.5" />
        Stop
      </Button>
      <Button variant="ghost" size="sm" className="text-slate-500" onClick={onRepeat} disabled={audioState === 'idle'}>
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Repeat
      </Button>
    </div>
  );
}

export function MemorySupportPage() {
  const { profile, language, setLanguage } = useApp();
  const [view, setView] = useState<ViewMode>('home');
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [activeSubject, setActiveSubject] = useState<MemorySubject | null>(null);

  const classId = classLevelToClassId(profile?.classLevel ?? '');
  const classLabel = profile?.classLevel ?? '';
  const userId = getUserId();

  // Auto-select subjects from the student's profile — no manual selector
  const availableSubjects = useMemo(() => {
    const selected = profile?.selectedSubjects ?? [];
    return MEMORY_SUBJECTS.filter((s) => selected.includes(s));
  }, [profile?.selectedSubjects]);

  const hasClass = Boolean(classId && profile?.classLevel && profile?.classLevel !== '');

  // Auto-set active subject when available subjects change
  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(activeSubject ?? ('' as MemorySubject))) {
      setActiveSubject(availableSubjects[0]);
    }
  }, [availableSubjects, activeSubject]);

  const handleSelectActivity = (type: ActivityType) => {
    if (type === 'progress') {
      setView('progress');
      return;
    }
    setSelectedActivity(type);
    setView('activity');
  };

  const handleBack = () => {
    if (view === 'activity' || view === 'progress') {
      setView('home');
      setSelectedActivity(null);
    }
  };

  if (!hasClass) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <Card className="border-amber-200 bg-amber-50/50 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Complete Your Profile</h2>
            <p className="mt-2 text-sm text-slate-600">
              Memory Support needs your selected class to provide the right content. Please complete your Padanamithra profile to continue.
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

  // ---- Home view: activity selection (no subject selector) ----
  if (view === 'home') {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <Brain className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Memory Support</h1>
                <p className="mt-0.5 text-sm text-slate-500">Learn, remember and revise at your own pace.</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Personalized memory-based learning for your {classLabel} subjects.
            </p>
          </div>

          <div className="mb-6 flex items-center gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                  language === lang.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-200',
                )}
              >
                {lang.flag} {lang.nativeLabel}
              </button>
            ))}
          </div>

          {/* Show which subjects are being used (read-only, not a selector) */}
          <div className="mb-6 flex flex-wrap gap-2.5">
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
                  No supported subjects found in your profile. Memory Support works with Physics, Chemistry, Biology and Mathematics.
                </p>
              </Card>
            )}
          </div>

          {availableSubjects.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ACTIVITY_TYPES.map((activity) => {
                const ActivityIcon = activity.icon;
                return (
                  <button
                    key={activity.type}
                    onClick={() => handleSelectActivity(activity.type)}
                    className="group flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition group-hover:scale-110">
                      <ActivityIcon className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{activity.label}</p>
                    <p className="text-xs text-slate-500">{activity.description}</p>
                  </button>
                );
              })}
            </div>
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            Memory Support is an educational learning tool. It does not diagnose, monitor, or treat dementia or any medical condition.
          </p>
        </div>
      </AppShell>
    );
  }

  // ---- Progress view ----
  if (view === 'progress') {
    return (
      <ProgressView
        userId={userId ?? ''}
        classLabel={classLabel}
        onBack={handleBack}
        language={language}
        availableSubjects={availableSubjects}
      />
    );
  }

  // ---- Activity view ----
  if (view === 'activity' && selectedActivity && availableSubjects.length > 0) {
    return (
      <ActivityView
        userId={userId ?? ''}
        subject={activeSubject ?? availableSubjects[0]}
        classId={classId}
        classLabel={classLabel}
        activityType={selectedActivity}
        onBack={handleBack}
        language={language}
        availableSubjects={availableSubjects}
        onSubjectChange={setActiveSubject}
      />
    );
  }

  return null;
}

// =====================================================
// ACTIVITY VIEW
// =====================================================
function ActivityView({
  userId, subject, classId, classLabel, activityType, onBack, language,
  availableSubjects, onSubjectChange,
}: {
  userId: string;
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  activityType: ActivityType;
  onBack: () => void;
  language: Language;
  availableSubjects: MemorySubject[];
  onSubjectChange: (s: MemorySubject) => void;
}) {
  const Icon = SUBJECT_ICONS[subject];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Memory Support
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', SUBJECT_ACCENTS[subject])}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {classLabel} {subject}
            </h1>
            <p className="text-xs text-slate-500">
              {ACTIVITY_TYPES.find((a) => a.type === activityType)?.label}
            </p>
          </div>
        </div>

        {/* Subject switcher — only if student has multiple selected subjects */}
        {availableSubjects.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {availableSubjects.map((s) => (
              <button
                key={s}
                onClick={() => onSubjectChange(s)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  subject === s ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600',
                )}
              >
                {SUBJECT_EMOJIS[s]} {s}
              </button>
            ))}
          </div>
        )}

        {activityType === 'daily_activity' && (
          <DailyActivityView userId={userId} subject={subject} classId={classId} classLabel={classLabel} language={language} />
        )}
        {activityType === 'review' && (
          <ReviewView userId={userId} subject={subject} classId={classId} classLabel={classLabel} language={language} />
        )}
        {activityType === 'memory_cards' && (
          <MemoryCardsView userId={userId} subject={subject} classId={classId} classLabel={classLabel} language={language} />
        )}
        {activityType === 'visual_learning' && (
          <VisualLearningView userId={userId} subject={subject} classId={classId} classLabel={classLabel} language={language} />
        )}
        {activityType === 'recall_practice' && (
          <RecallPracticeView userId={userId} subject={subject} classId={classId} classLabel={classLabel} language={language} />
        )}
      </div>
    </AppShell>
  );
}

// =====================================================
// DAILY ACTIVITY
// =====================================================
function DailyActivityView({
  userId, subject, classId, classLabel, language,
}: {
  userId: string;
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  language: Language;
}) {
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<DailyActivity | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [topicRecord, setTopicRecord] = useState<MemoryTopic | null>(null);
  const [activityHistory, setActivityHistory] = useState<DailyActivity[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const audio = useAudioController(language);

  const generateActivity = useCallback((allTopics: { chapter: string; topic: string }[]) => {
    if (allTopics.length === 0) {
      setLoading(false);
      return null;
    }
    const dayOfYear = Math.floor(Date.now() / 86400000);
    const chosen = allTopics[dayOfYear % allTopics.length];
    const generated = generateDailyActivity(classLabel, subject, chosen.chapter, chosen.topic, language);
    upsertMemoryTopic(userId, subject, classLabel, chosen.chapter, chosen.topic).then(setTopicRecord);
    return generated;
  }, [classLabel, subject, userId, language]);

  useEffect(() => {
    const allTopics = getAllTopicsForSubject(classId, subject);
    const generated = generateActivity(allTopics);
    if (generated) {
      setActivity(generated);
      setActivityHistory([generated]);
      setHistoryIndex(0);
    }
    setLoading(false);
  }, [classId, classLabel, subject, userId, language, generateActivity]);

  const handleAnswer = (index: number) => {
    if (!activity || showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    const isCorrect = index === activity.answerIndex;
    const result = isCorrect ? 'correct' : 'incorrect';
    if (topicRecord) {
      recordProgress(userId, subject, topicRecord.id, 'daily_activity', result, 0);
      if (isCorrect) {
        updateMemoryTopic(topicRecord.id, {
          correct_count: (topicRecord.correct_count ?? 0) + 1,
          last_reviewed_at: new Date().toISOString(),
        });
      }
      recordSession(userId, subject, classLabel, 'daily_activity', [activity.topic], isCorrect ? 1 : 0, 1, 0);
    }
  };

  const handleNext = () => {
    audio.stop();
    setLoading(true);
    setSelectedOption(null);
    setShowResult(false);
    setActivity(null);
    setTimeout(() => {
      const allTopics = getAllTopicsForSubject(classId, subject);
      const generated = generateActivity(allTopics);
      if (generated) {
        const newHistory = [...activityHistory.slice(0, historyIndex + 1), generated];
        setActivityHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setActivity(generated);
      }
      setLoading(false);
    }, 300);
  };

  const handlePrevious = () => {
    if (historyIndex <= 0) return;
    audio.stop();
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setActivity(activityHistory[newIndex]);
    setSelectedOption(null);
    setShowResult(false);
  };

  useEffect(() => () => audio.stop(), [audio]);

  if (loading) {
    return (
      <Card className="border-slate-200 p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-indigo-200" />
        <p className="mt-3 text-sm text-slate-500">Preparing your activity...</p>
      </Card>
    );
  }

  if (!activity) {
    return (
      <Card className="border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500">No topics available for this subject.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step 1: Visual */}
      <Card className="border-indigo-100 p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Eye className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">Visualize</h3>
        </div>
        <p className="text-sm text-slate-600">{activity.visualDescription}</p>
        <AudioControls
          audioState={audio.audioState}
          onPlay={() => audio.speak(activity.visualDescription)}
          onPause={audio.pause}
          onResume={audio.resume}
          onStop={audio.stop}
          onRepeat={audio.repeat}
          isSupported={audio.isSupported}
        />
      </Card>

      {/* Step 2: Explanation */}
      <Card className="border-slate-200 p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Explanation</h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">{activity.explanation}</p>
        <AudioControls
          audioState={audio.audioState}
          onPlay={() => audio.speak(activity.explanation)}
          onPause={audio.pause}
          onResume={audio.resume}
          onStop={audio.stop}
          onRepeat={audio.repeat}
          isSupported={audio.isSupported}
        />
      </Card>

      {/* Step 3: Question */}
      <Card className="border-slate-200 p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">Quick Question</h3>
        </div>
        <p className="mb-4 text-sm font-medium text-slate-800">{activity.question}</p>
        <div className="space-y-2.5">
          {activity.options.map((option, i) => {
            const isSelected = selectedOption === i;
            const isCorrect = i === activity.answerIndex;
            const showCorrect = showResult && isCorrect;
            const showWrong = showResult && isSelected && !isCorrect;
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={showResult}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm transition',
                  showCorrect
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : showWrong
                      ? 'border-rose-300 bg-rose-50 text-rose-800'
                      : isSelected
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/30',
                )}
              >
                <span>{option}</span>
                {showCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {showWrong && <XCircle className="h-4 w-4 text-rose-600" />}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-700">
              {selectedOption === activity.answerIndex ? 'Correct! ' : "Let's try again. "}
              {activity.feedback}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleNext}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Next Activity
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrevious} disabled={historyIndex <= 0}>
                <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
                Previous
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// =====================================================
// REVIEW PREVIOUS LEARNING
// =====================================================
function ReviewView({
  userId, subject, classId, classLabel, language,
}: {
  userId: string;
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  language: Language;
}) {
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<MemoryTopic[]>([]);
  const [reviewTopic, setReviewTopic] = useState<MemoryTopic | null>(null);
  const [activity, setActivity] = useState<DailyActivity | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const audio = useAudioController(language);

  useEffect(() => {
    fetchMemoryTopics(userId, subject).then((allTopics) => {
      const reviewable = allTopics.filter(
        (t) => computeAdaptiveStatus(t) === 'needs_review' || computeAdaptiveStatus(t) === 'learning',
      );
      setTopics(reviewable.length > 0 ? reviewable : allTopics);
      setLoading(false);
    });
  }, [userId, subject]);

  const startReview = (topic: MemoryTopic) => {
    setReviewTopic(topic);
    const generated = generateDailyActivity(classLabel, subject, topic.chapter, topic.topic, language);
    setActivity(generated);
    setSelectedOption(null);
    setShowResult(false);
  };

  const handleAnswer = (index: number) => {
    if (!activity || showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    const isCorrect = index === activity.answerIndex;
    const result = isCorrect ? 'correct' : 'incorrect';
    if (reviewTopic) {
      recordProgress(userId, subject, reviewTopic.id, 'review', result, 0);
      const newInterval = getReviewInterval(
        computeAdaptiveStatus(reviewTopic),
        reviewTopic.review_interval_days,
        isCorrect ? 'correct' : 'incorrect',
      );
      updateMemoryTopic(reviewTopic.id, {
        last_reviewed_at: new Date().toISOString(),
        next_review_at: computeNextReviewDate(newInterval),
        review_interval_days: newInterval,
        correct_count: isCorrect ? (reviewTopic.correct_count ?? 0) + 1 : reviewTopic.correct_count,
      });
      scheduleReview(userId, reviewTopic.id, subject, computeNextReviewDate(newInterval).split('T')[0]);
      recordSession(userId, subject, classLabel, 'review', [activity.topic], isCorrect ? 1 : 0, 1, 0);
    }
  };

  useEffect(() => () => audio.stop(), [audio]);

  if (loading) {
    return (
      <Card className="border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500">Loading topics for review...</p>
      </Card>
    );
  }

  if (reviewTopic && activity) {
    return (
      <div className="space-y-5">
        <Card className="border-indigo-100 p-5 shadow-sm">
          <p className="mb-1 text-xs font-medium text-indigo-600">Reviewing: {reviewTopic.chapter}</p>
          <h3 className="text-sm font-semibold text-slate-900">{reviewTopic.topic}</h3>
        </Card>
        <Card className="border-slate-200 p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-slate-800">{activity.question}</p>
          <AudioControls
            audioState={audio.audioState}
            onPlay={() => audio.speak(activity.question)}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onRepeat={audio.repeat}
            isSupported={audio.isSupported}
          />
          <div className="mt-3 space-y-2.5">
            {activity.options.map((option, i) => {
              const showCorrect = showResult && i === activity.answerIndex;
              const showWrong = showResult && selectedOption === i && i !== activity.answerIndex;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={showResult}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm transition',
                    showCorrect
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : showWrong
                        ? 'border-rose-300 bg-rose-50 text-rose-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200',
                  )}
                >
                  <span>{option}</span>
                  {showCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  {showWrong && <XCircle className="h-4 w-4 text-rose-600" />}
                </button>
              );
            })}
          </div>
          {showResult && (
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setReviewTopic(null); setActivity(null); audio.stop(); }}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Review Another Topic
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 p-8 text-center">
        <RefreshCw className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">No topics need review yet. Complete some daily activities first!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Topics ready for review:</p>
      {topics.map((topic) => {
        const status = computeAdaptiveStatus(topic);
        return (
          <button
            key={topic.id}
            onClick={() => startReview(topic)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-200 hover:shadow-sm"
          >
            <div>
              <p className="text-sm font-medium text-slate-800">{topic.topic}</p>
              <p className="text-xs text-slate-500">{topic.chapter}</p>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                status === 'needs_review' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600',
              )}
            >
              {status === 'needs_review' ? 'Needs Review' : 'Learning'}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

// =====================================================
// MEMORY CARDS
// =====================================================
function MemoryCardsView({
  userId, subject, classId, classLabel, language,
}: {
  userId: string;
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  language: Language;
}) {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [topicRecord, setTopicRecord] = useState<MemoryTopic | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const audio = useAudioController(language);

  const generateCards = useCallback(() => {
    const chapters = getChaptersForMemorySubject(classId, subject);
    if (chapters.length === 0) {
      setLoading(false);
      return;
    }
    // Pick a random chapter to generate cards from
    const chapter = chapters[Math.floor(Math.random() * chapters.length)];
    const generated = generateMemoryCards(classLabel, subject, chapter.name, chapter.topics[0] ?? 'Key concept', language, 5);
    setCards(generated);
    upsertMemoryTopic(userId, subject, classLabel, chapter.name, generated[0]?.topic ?? chapter.topics[0] ?? 'Key concept').then(setTopicRecord);
    setCurrentIndex(0);
    setShowBack(false);
    setShowHint(false);
    setHintsUsed(0);
    setLoading(false);
  }, [classId, classLabel, subject, userId, language]);

  useEffect(() => {
    generateCards();
  }, [generateCards]);

  const handleResponse = (remembered: boolean) => {
    if (!cards[currentIndex]) return;
    if (remembered) {
      audio.stop();
      if (topicRecord) {
        recordProgress(userId, subject, topicRecord.id, 'memory_cards', 'correct', hintsUsed);
        updateMemoryTopic(topicRecord.id, {
          correct_count: (topicRecord.correct_count ?? 0) + 1,
          last_reviewed_at: new Date().toISOString(),
        });
        recordSession(userId, subject, classLabel, 'memory_cards', [cards[currentIndex].topic], 1, 1, hintsUsed);
      }
      handleNextCard();
      return;
    }
    if (!showHint) {
      setShowHint(true);
      setHintsUsed((h) => h + 1);
    } else if (!showBack) {
      setShowBack(true);
      if (topicRecord) {
        recordProgress(userId, subject, topicRecord.id, 'memory_cards', 'correct_with_hint', hintsUsed);
        updateMemoryTopic(topicRecord.id, {
          hint_count: (topicRecord.hint_count ?? 0) + hintsUsed,
          correct_after_hint: (topicRecord.correct_after_hint ?? 0) + 1,
          last_reviewed_at: new Date().toISOString(),
        });
        recordSession(userId, subject, classLabel, 'memory_cards', [cards[currentIndex].topic], 0, 1, hintsUsed);
      }
    } else {
      handleNextCard();
    }
  };

  const handleNextCard = () => {
    audio.stop();
    setShowBack(false);
    setShowHint(false);
    setHintsUsed(0);
    setCurrentIndex((i) => (i + 1 < cards.length ? i + 1 : 0));
  };

  const handlePreviousCard = () => {
    audio.stop();
    setShowBack(false);
    setShowHint(false);
    setHintsUsed(0);
    setCurrentIndex((i) => (i - 1 >= 0 ? i - 1 : cards.length - 1));
  };

  const handleNewCards = () => {
    audio.stop();
    setLoading(true);
    setCards([]);
    generateCards();
  };

  useEffect(() => () => audio.stop(), [audio]);

  if (loading) {
    return (
      <Card className="border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500">Creating your memory cards...</p>
      </Card>
    );
  }

  if (cards.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-slate-500">No topics available for memory cards.</p>
      </Card>
    );
  }

  const card = cards[currentIndex];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Card {currentIndex + 1} of {cards.length}
        </span>
        <Button variant="ghost" size="sm" onClick={handleNewCards}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          New cards
        </Button>
      </div>

      <Card className="min-h-[280px] border-slate-200 p-6 shadow-sm">
        <div className="mb-3">
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-600">
            {card.chapter}
          </Badge>
          <p className="mt-1 text-xs text-slate-500">{card.topic}</p>
        </div>

        <div className="mb-4">
          <p className="text-base font-semibold text-slate-900">{card.front}</p>
        </div>

        <div className="mb-4 rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-slate-400" />
            <p className="text-xs text-slate-600">{card.visualDescription}</p>
          </div>
        </div>

        {showHint && !showBack && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 text-amber-500" />
              <p className="text-sm text-amber-800">{card.hint}</p>
            </div>
          </div>
        )}

        {showBack && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-sm font-medium text-emerald-800">{card.back}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <AudioControls
            audioState={audio.audioState}
            onPlay={() => audio.speak(showBack ? card.back : card.front)}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onRepeat={audio.repeat}
            isSupported={audio.isSupported}
          />
          {!showBack && (
            <Button
              variant="outline"
              size="sm"
              className="border-amber-200 text-amber-600 hover:bg-amber-50"
              onClick={() => { setShowHint(true); setHintsUsed((h) => h + 1); }}
            >
              <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
              Hint
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBack(!showBack)}
          >
            {showBack ? 'Hide Answer' : 'Show Answer'}
          </Button>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => handleResponse(true)}
        >
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          I Remember
        </Button>
        <Button
          className="flex-1 bg-amber-500 hover:bg-amber-600"
          onClick={() => handleResponse(false)}
        >
          <Lightbulb className="mr-1.5 h-4 w-4" />
          I Need Help
        </Button>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={handlePreviousCard}>
          <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
          Previous
        </Button>
        <Button variant="ghost" size="sm" onClick={handleNextCard}>
          Next
          <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// VISUAL LEARNING
// =====================================================
function VisualLearningView({
  userId, subject, classId, classLabel, language,
}: {
  userId: string;
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  language: Language;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VisualLearningItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [topicRecord, setTopicRecord] = useState<MemoryTopic | null>(null);
  const audio = useAudioController(language);

  const generateItems = useCallback(() => {
    const chapters = getChaptersForMemorySubject(classId, subject);
    if (chapters.length === 0) {
      setLoading(false);
      return;
    }
    const chapter = chapters[Math.floor(Math.random() * chapters.length)];
    const generated = generateVisualLearningItems(classLabel, subject, chapter.name, language, 4);
    setItems(generated);
    upsertMemoryTopic(userId, subject, classLabel, chapter.name, generated[0]?.topic ?? chapter.topics[0] ?? 'Key concept').then(setTopicRecord);
    setCurrentIndex(0);
    setLoading(false);
  }, [classId, classLabel, subject, userId, language]);

  useEffect(() => {
    generateItems();
  }, [generateItems]);

  useEffect(() => () => audio.stop(), [audio]);

  if (loading) {
    return (
      <Card className="border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500">Creating visual learning content...</p>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-slate-500">No visual content available.</p>
      </Card>
    );
  }

  const item = items[currentIndex];

  const handleNext = () => {
    audio.stop();
    setCurrentIndex((i) => (i + 1 < items.length ? i + 1 : 0));
  };

  const handlePrevious = () => {
    audio.stop();
    setCurrentIndex((i) => (i - 1 >= 0 ? i - 1 : items.length - 1));
  };

  const handleMarkLearned = () => {
    if (topicRecord) {
      recordProgress(userId, subject, topicRecord.id, 'visual_learning', 'correct', 0);
      updateMemoryTopic(topicRecord.id, {
        correct_count: (topicRecord.correct_count ?? 0) + 1,
        last_reviewed_at: new Date().toISOString(),
      });
      recordSession(userId, subject, classLabel, 'visual_learning', [item.topic], 1, 1, 0);
    }
    handleNext();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {currentIndex + 1} of {items.length}
        </span>
      </div>

      <Card className="border-slate-200 p-6 shadow-sm">
        <div className="mb-3">
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-600">
            {item.chapter}
          </Badge>
        </div>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{item.title}</h3>

        <div className="mb-4 rounded-xl bg-indigo-50/60 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Eye className="h-4 w-4 text-indigo-600" />
            <h4 className="text-sm font-semibold text-indigo-900">Visual</h4>
          </div>
          <p className="text-sm text-slate-700">{item.visualDescription}</p>
          <AudioControls
            audioState={audio.audioState}
            onPlay={() => audio.speak(item.visualDescription)}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onRepeat={audio.repeat}
            isSupported={audio.isSupported}
          />
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-600" />
            <h4 className="text-sm font-semibold text-slate-900">How it helps</h4>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{item.explanation}</p>
          <AudioControls
            audioState={audio.audioState}
            onPlay={() => audio.speak(item.explanation)}
            onPause={audio.pause}
            onResume={audio.resume}
            onStop={audio.stop}
            onRepeat={audio.repeat}
            isSupported={audio.isSupported}
          />
        </div>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={handlePrevious}>
          <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
          Previous
        </Button>
        <Button size="sm" onClick={handleMarkLearned}>
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          Got it — Next
        </Button>
        <Button variant="ghost" size="sm" onClick={handleNext}>
          Skip
          <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// RECALL PRACTICE
// =====================================================
function RecallPracticeView({
  userId, subject, classId, classLabel, language,
}: {
  userId: string;
  subject: MemorySubject;
  classId: string;
  classLabel: string;
  language: Language;
}) {
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<RecallQuestion | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [resultState, setResultState] = useState<'none' | 'correct' | 'wrong'>('none');
  const [topicRecord, setTopicRecord] = useState<MemoryTopic | null>(null);
  const [questionHistory, setQuestionHistory] = useState<RecallQuestion[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const audio = useAudioController(language);
  const voice = useVoiceInput(language);

  const generateNew = useCallback(() => {
    const allTopics = getAllTopicsForSubject(classId, subject);
    if (allTopics.length === 0) {
      setLoading(false);
      return;
    }
    const chosen = allTopics[Math.floor(Math.random() * allTopics.length)];
    const generated = generateRecallQuestion(classLabel, subject, chosen.chapter, chosen.topic, language);
    setQuestion(generated);
    upsertMemoryTopic(userId, subject, classLabel, chosen.chapter, chosen.topic).then(setTopicRecord);
    setHintLevel(0);
    setShowAnswer(false);
    setUserAnswer('');
    setResultState('none');
    setLoading(false);
  }, [classId, classLabel, subject, userId, language]);

  useEffect(() => {
    generateNew();
  }, [generateNew]);

  useEffect(() => () => audio.stop(), [audio]);

  const handleShowHint = () => {
    if (hintLevel < 3) {
      setHintLevel((h) => h + 1);
    }
  };

  const handleHelpMeRemember = () => {
    if (hintLevel < 4) {
      const newLevel = hintLevel + 1;
      setHintLevel(newLevel);
      if (newLevel === 4) {
        setShowAnswer(true);
      }
    }
  };

  const handleCheckAnswer = () => {
    if (!question || !userAnswer.trim()) return;
    const isCorrect = userAnswer.trim().toLowerCase().includes(question.answer.toLowerCase().slice(0, Math.min(5, question.answer.length)));
    setResultState(isCorrect ? 'correct' : 'wrong');
    const result = isCorrect
      ? hintLevel > 0 ? 'correct_with_hint' : 'correct'
      : 'incorrect';
    if (topicRecord) {
      recordProgress(userId, subject, topicRecord.id, 'recall_practice', result, hintLevel);
      if (isCorrect) {
        if (hintLevel > 0) {
          updateMemoryTopic(topicRecord.id, {
            hint_count: (topicRecord.hint_count ?? 0) + hintLevel,
            correct_after_hint: (topicRecord.correct_after_hint ?? 0) + 1,
            last_reviewed_at: new Date().toISOString(),
          });
        } else {
          updateMemoryTopic(topicRecord.id, {
            correct_count: (topicRecord.correct_count ?? 0) + 1,
            last_reviewed_at: new Date().toISOString(),
          });
        }
      } else {
        updateMemoryTopic(topicRecord.id, {
          hint_count: (topicRecord.hint_count ?? 0) + hintLevel,
          last_reviewed_at: new Date().toISOString(),
        });
      }
      recordSession(userId, subject, classLabel, 'recall_practice', [question.topic], isCorrect ? 1 : 0, 1, hintLevel);
    }
  };

  const handleNext = () => {
    audio.stop();
    if (question) {
      const newHistory = [...questionHistory.slice(0, historyIndex + 1), question];
      setQuestionHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    setLoading(true);
    generateNew();
  };

  const handlePrevious = () => {
    if (historyIndex <= 0) return;
    audio.stop();
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setQuestion(questionHistory[newIndex]);
    setHintLevel(0);
    setShowAnswer(false);
    setUserAnswer('');
    setResultState('none');
  };

  if (loading) {
    return (
      <Card className="border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500">Creating recall question...</p>
      </Card>
    );
  }

  if (!question) {
    return (
      <Card className="border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-slate-500">No topics available for recall practice.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-slate-200 p-6 shadow-sm">
        <div className="mb-3">
          <Badge variant="secondary" className="bg-indigo-100 text-indigo-600">
            {question.chapter}
          </Badge>
          <p className="mt-1 text-xs text-slate-500">{question.topic}</p>
        </div>
        <h3 className="mb-4 text-base font-semibold text-slate-900">{question.question}</h3>
        <AudioControls
          audioState={audio.audioState}
          onPlay={() => audio.speak(question.question)}
          onPause={audio.pause}
          onResume={audio.resume}
          onStop={audio.stop}
          onRepeat={audio.repeat}
          isSupported={audio.isSupported}
        />

        {/* Hints */}
        {hintLevel >= 1 && (
          <div className="mt-3 mb-3 rounded-xl bg-sky-50 border border-sky-200 p-3">
            <div className="flex items-start gap-2">
              <Eye className="mt-0.5 h-4 w-4 text-sky-500" />
              <p className="text-sm text-sky-800">
                <span className="font-medium">Hint 1:</span> {question.hints[0]}
              </p>
            </div>
          </div>
        )}
        {hintLevel >= 2 && (
          <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 text-amber-500" />
              <p className="text-sm text-amber-800">
                <span className="font-medium">Hint 2:</span> {question.hints[1]}
              </p>
            </div>
          </div>
        )}
        {hintLevel >= 3 && (
          <div className="mb-3 rounded-xl bg-violet-50 border border-violet-200 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-violet-500" />
              <p className="text-sm text-violet-800">
                <span className="font-medium">Hint 3:</span> {question.hints[2]}
              </p>
            </div>
          </div>
        )}

        {showAnswer && (
          <div className="mb-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-sm font-medium text-emerald-800">
              Answer: {question.answer}
            </p>
          </div>
        )}

        {resultState === 'none' && !showAnswer && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckAnswer()}
                placeholder="Type your answer..."
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              {voice.supported && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (voice.listening) {
                      voice.stopListening();
                    } else {
                      voice.startListening((text) => setUserAnswer(text));
                    }
                  }}
                  className={cn(voice.listening && 'border-rose-200 text-rose-600')}
                >
                  {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleCheckAnswer} disabled={!userAnswer.trim()}>
                Check Answer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-200 text-amber-600 hover:bg-amber-50"
                onClick={handleShowHint}
                disabled={hintLevel >= 3}
              >
                <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
                Hint ({hintLevel}/3)
              </Button>
            </div>
            {voice.listening && (
              <p className="text-xs text-indigo-600">Listening... Speak your answer.</p>
            )}
            {!voice.supported && (
              <p className="text-xs text-slate-400">Voice input isn't supported in this browser. You can type your answer instead.</p>
            )}
          </div>
        )}

        {resultState === 'correct' && (
          <div className="mt-3 rounded-xl bg-emerald-50 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">
                Correct! {hintLevel > 0 ? 'Great work using the hints!' : 'Perfect recall!'}
              </p>
            </div>
          </div>
        )}
        {resultState === 'wrong' && (
          <div className="mt-3 rounded-xl bg-rose-50 p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" />
              <p className="text-sm font-medium text-rose-800">
                That's okay. Let's try with a hint.
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setResultState('none'); setUserAnswer(''); }}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Try Again
              </Button>
              <Button size="sm" onClick={handleNext}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Next Question
              </Button>
            </div>
          </div>
        )}
      </Card>

      {resultState === 'none' && !showAnswer && (
        <Button
          className="w-full bg-amber-500 hover:bg-amber-600"
          onClick={handleHelpMeRemember}
          disabled={hintLevel >= 4}
        >
          <Lightbulb className="mr-2 h-4 w-4" />
          Help Me Remember {hintLevel > 0 && `(Level ${hintLevel}/4)`}
        </Button>
      )}

      {resultState === 'correct' && !showAnswer && (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleNext}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Next Question
          </Button>
          <Button variant="outline" onClick={handlePrevious} disabled={historyIndex <= 0}>
            <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
            Previous
          </Button>
        </div>
      )}

      {showAnswer && (
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleNext}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Next Question
          </Button>
          <Button variant="outline" onClick={handlePrevious} disabled={historyIndex <= 0}>
            <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
            Previous
          </Button>
        </div>
      )}
    </div>
  );
}

// =====================================================
// PROGRESS VIEW
// =====================================================
function ProgressView({
  userId, classLabel, onBack, language, availableSubjects,
}: {
  userId: string;
  classLabel: string;
  onBack: () => void;
  language: Language;
  availableSubjects: MemorySubject[];
}) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<MemoryProgressSummary | null>(null);
  const [topics, setTopics] = useState<MemoryTopic[]>([]);
  const [filter, setFilter] = useState<MemorySubject | 'all'>('all');

  useEffect(() => {
    Promise.all([
      fetchProgressSummary(userId),
      fetchMemoryTopics(userId),
    ]).then(([s, t]) => {
      setSummary(s);
      setTopics(t);
      setLoading(false);
    });
  }, [userId]);

  const filteredTopics = useMemo(() => {
    if (filter === 'all') return topics;
    return topics.filter((t) => t.subject === filter);
  }, [topics, filter]);

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl">
          <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <Card className="border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-500">Loading progress...</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" />
          Back to Memory Support
        </button>

        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Memory Progress</h1>
          <p className="text-sm text-slate-500">{classLabel}</p>
        </div>

        {summary && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="border-emerald-100 p-4 text-center shadow-sm">
              <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" />
              <p className="mt-2 text-2xl font-bold text-slate-900">{summary.remembered}</p>
              <p className="text-xs text-slate-500">Remembered</p>
            </Card>
            <Card className="border-rose-100 p-4 text-center shadow-sm">
              <AlertCircle className="mx-auto h-6 w-6 text-rose-500" />
              <p className="mt-2 text-2xl font-bold text-slate-900">{summary.needsReview}</p>
              <p className="text-xs text-slate-500">Needs Review</p>
            </Card>
            <Card className="border-amber-100 p-4 text-center shadow-sm">
              <Brain className="mx-auto h-6 w-6 text-amber-500" />
              <p className="mt-2 text-2xl font-bold text-slate-900">{summary.learning}</p>
              <p className="text-xs text-slate-500">Learning</p>
            </Card>
            <Card className="border-indigo-100 p-4 text-center shadow-sm">
              <TrendingUp className="mx-auto h-6 w-6 text-indigo-500" />
              <p className="mt-2 text-2xl font-bold text-slate-900">{summary.reviewStreak}</p>
              <p className="text-xs text-slate-500">Day Streak</p>
            </Card>
          </div>
        )}

        {/* Filter — only show student's selected subjects */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600',
            )}
          >
            All
          </button>
          {availableSubjects.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                filter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600',
              )}
            >
              {SUBJECT_EMOJIS[s]} {s}
            </button>
          ))}
        </div>

        {filteredTopics.length > 0 ? (
          <div className="space-y-2">
            {filteredTopics.map((topic) => {
              const status = computeAdaptiveStatus(topic);
              const recommendation = getAdaptiveRecommendation(topic);
              return (
                <Card key={topic.id} className="border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{topic.topic}</span>
                        <Badge variant="secondary" className={cn(
                          status === 'remembered' ? 'bg-emerald-100 text-emerald-600' :
                          status === 'needs_review' ? 'bg-rose-100 text-rose-600' :
                          'bg-amber-100 text-amber-600',
                        )}>
                          {status === 'remembered' ? 'Remembered' : status === 'needs_review' ? 'Needs Review' : 'Learning'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {SUBJECT_EMOJIS[topic.subject as MemorySubject] ?? '📚'} {topic.subject} • {topic.chapter}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{recommendation}</p>
                      {topic.last_reviewed_at && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          Last reviewed: {new Date(topic.last_reviewed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-slate-300 p-8 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              No memory topics yet. Start a daily activity to build your progress!
            </p>
          </Card>
        )}

        {summary && summary.recentSessions.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Calendar className="h-4 w-4 text-slate-400" />
              Recent Memory Activities
            </h3>
            <div className="space-y-2">
              {summary.recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {SUBJECT_EMOJIS[session.subject as MemorySubject] ?? '📚'} {session.subject}
                    </p>
                    <p className="text-xs text-slate-500">
                      {session.activity_type.replace(/_/g, ' ')} • {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {session.score}/{session.total}
                    </p>
                    {session.hints_used > 0 && (
                      <p className="text-xs text-amber-600">{session.hints_used} hints</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          Memory Support is an educational learning tool. It does not diagnose, monitor, or treat dementia or any medical condition.
        </p>
      </div>
    </AppShell>
  );
}

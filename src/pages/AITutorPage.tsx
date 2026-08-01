import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, Volume2, Square, Sparkles, Bot, User as UserIcon, Brain, Lightbulb, BookOpen, Globe, RotateCcw, CircleCheck as CheckCircle2, Target, Compass, ChevronRight, GraduationCap, Mic, Loader as Loader2, CircleAlert as AlertCircle } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';
import { useApp } from '@/lib/AppContext';
import { getChaptersForSubject } from '@/lib/curriculum';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';
import {
  classifyIntent,
  findConcept,
  analyzeStudentResponse,
  getHint,
  getSubjectOpeningQuestion,
  getFactualResponse,
  getCasualResponse,
  buildConceptUnlocked,
  getHelpResponse,
  recordLearningSignal,
  createInitialSessionState,
  type LearningSessionState,
  type ConceptEntry,
  type MessageIntent,
  type HelpAction,
  type ConceptUnlockedSummary,
} from '@/lib/guidedLearning';
import { generateTutorReply } from '@/lib/mockData';
import { addToLearningCurve, getLearningCurveSummary } from '@/lib/learningCurve';
import { useVoiceInput } from '@/hooks/useVoiceInput';

const LANGUAGES = [
  { value: 'en-US', label: 'English' },
  { value: 'ml-IN', label: 'Malayalam' },
  { value: 'hi-IN', label: 'Hindi' },
];

const SUGGESTED = ['What is velocity?', 'Why does an object fall toward Earth?', 'What is photosynthesis?', 'Explain Ohms Law'];

const HELP_ACTIONS: { action: HelpAction; label: string; icon: typeof Lightbulb; accent: string }[] = [
  { action: 'hint', label: 'Give me a Hint', icon: Lightbulb, accent: 'text-amber-600 hover:bg-amber-50 border-amber-200' },
  { action: 'smaller_clue', label: 'Smaller Clue', icon: Compass, accent: 'text-sky-600 hover:bg-sky-50 border-sky-200' },
  { action: 'explain_concept', label: 'Explain the Concept', icon: BookOpen, accent: 'text-indigo-600 hover:bg-indigo-50 border-indigo-200' },
  { action: 'real_life_example', label: 'Real-Life Example', icon: Globe, accent: 'text-emerald-600 hover:bg-emerald-50 border-emerald-200' },
  { action: 'try_again', label: 'Let me Try Again', icon: RotateCcw, accent: 'text-slate-600 hover:bg-slate-50 border-slate-200' },
  { action: 'show_answer', label: 'Show the Answer', icon: CheckCircle2, accent: 'text-rose-600 hover:bg-rose-50 border-rose-200' },
];

interface GuidedMessage extends ChatMessage {
  isGuided?: boolean;
  showHelpButtons?: boolean;
  showTryButtons?: boolean;
  conceptUnlocked?: ConceptUnlockedSummary;
  showSimilarQuestion?: boolean;
  similarQuestion?: string;
}

export function AITutorPage() {
  const { profile } = useApp();
  const tutorContext = profile ? {
    name: profile.fullName,
    classLevel: profile.classLevel,
    board: profile.board,
    subject: profile.currentSubject,
    chapter: profile.currentChapter,
    topic: profile.currentTopic,
  } : undefined;

  const [whatDoYouKnow, setWhatDoYouKnow] = useState(() =>
    loadJSON<boolean>(STORAGE_KEYS.whatDoYouKnowEnabled, true),
  );

  const welcomeMsg = profile?.currentSubject && profile?.currentChapter
    ? `Hi ${profile.fullName.split(' ')[0]}! I am your AI Learning Companion. I see you're studying ${profile.currentSubject} — ${profile.currentChapter}${profile.currentTopic ? ` (${profile.currentTopic})` : ''}.\n\nI won't just give you answers — I'll help you discover them yourself. Ask me anything!`
    : "Hi! I am your AI Learning Companion. 😊\n\nI won't just give you answers — I'll help you discover them yourself. Ask me about any topic, and we'll explore it together!";

  const [messages, setMessages] = useState<GuidedMessage[]>([
    { id: 'welcome', role: 'bot', content: welcomeMsg, timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const [speaking, setSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [session, setSession] = useState<LearningSessionState>(() => createInitialSessionState(whatDoYouKnow));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.whatDoYouKnowEnabled, whatDoYouKnow);
    setSession((s) => ({ ...s, whatDoYouKnowEnabled: whatDoYouKnow }));
  }, [whatDoYouKnow]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const [lcAdded, setLcAdded] = useState<Record<string, boolean>>({});
  const [dueReviews, setDueReviews] = useState(0);

  // Voice input for the chat input field
  const voice = useVoiceInput({
    language,
    onTranscript: (text) => {
      setInput((prev) => (prev ? prev + ' ' + text : text));
    },
  });

  const handleMicToggle = () => {
    if (voice.state === 'listening') {
      voice.stop();
    } else {
      voice.start();
    }
  };

  useEffect(() => {
    getLearningCurveSummary().then((s) => setDueReviews(s.dueToday));
  }, []);

  const handleAddToLearningCurve = async (concept: ConceptEntry) => {
    await addToLearningCurve({
      subject: concept.subject,
      chapter: concept.chapter,
      topic: concept.topic,
      reason: 'Added from AI Tutor',
      difficulty: 'medium',
    });
    setLcAdded((prev) => ({ ...prev, [concept.topic]: true }));
    const s = await getLearningCurveSummary();
    setDueReviews(s.dueToday);
  };

  const addBotMessage = (content: string, extras?: Partial<GuidedMessage>) => {
    const botMsg: GuidedMessage = {
      id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'bot',
      content,
      timestamp: Date.now(),
      ...extras,
    };
    setMessages((m) => [...m, botMsg]);
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;

    const userMsg: GuidedMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);

    setTimeout(() => {
      // If we're in a guided session, route to the appropriate handler
      if (session.phase === 'eliciting' || session.phase === 'hinting') {
        handleStudentAttempt(text);
      } else if (session.phase === 'practicing') {
        handleSimilarAnswer(text);
      } else {
        processUserMessage(text);
      }
      setThinking(false);
    }, 600 + Math.random() * 400);
  };

  const processUserMessage = (text: string) => {
    const intent = classifyIntent(text);
    const lower = text.toLowerCase();

    // Check for "give me something to study" — recommend due reviews
    if (lower.includes('something to study') || lower.includes('what should i study') || lower.includes('what to study') || lower.includes('give me something')) {
      if (dueReviews > 0) {
        addBotMessage(`You have ${dueReviews} concept${dueReviews === 1 ? '' : 's'} due for review today in your Learning Curve. 🧠\n\nWould you like to review them now? You can go to the Learning Curve page to start.`, { isGuided: true });
      } else {
        addBotMessage(`You have no concepts due for review right now. 🎉\n\nTry asking me about a new topic, or take a mock test to find areas to improve!`);
      }
      return;
    }

    // --- Casual conversation ---
    if (intent === 'casual') {
      addBotMessage(getCasualResponse(text));
      return;
    }

    // --- Factual request ---
    if (intent === 'factual') {
      const concept = findConcept(text, profile);
      addBotMessage(getFactualResponse(text, concept), { isGuided: true });
      return;
    }

    // --- Learning request ---
    const concept = findConcept(text, profile);

    if (!concept) {
      // No guided concept found — fall back to the existing knowledge base reply
      const reply = generateTutorReply(text, tutorContext);
      addBotMessage(reply);
      return;
    }

    // Start guided learning session
    const newSession: LearningSessionState = {
      phase: 'eliciting',
      concept,
      hintLevel: 0,
      attemptCount: 0,
      studentKnowledge: '',
      identifiedGaps: [],
      correctPoints: [],
      whatDoYouKnowEnabled: whatDoYouKnow,
      showAnswerRequested: false,
    };
    setSession(newSession);

    if (whatDoYouKnow) {
      const opening = getSubjectOpeningQuestion(concept);
      addBotMessage(opening, {
        isGuided: true,
        showTryButtons: true,
      });
    } else {
      // What Do You Know mode is OFF — give the explanation directly
      addBotMessage(concept.explanation, { isGuided: true });
      setSession((s) => ({ ...s, phase: 'complete' }));
    }
  };

  // Student clicked "I'll Try" or typed their understanding
  const handleStudentAttempt = (text: string) => {
    if (!session.concept || session.phase === 'idle') {
      processUserMessage(text);
      return;
    }

    const concept = session.concept;
    const analysis = analyzeStudentResponse(text, concept);

    setSession((s) => ({
      ...s,
      phase: 'analyzing',
      studentKnowledge: text,
      attemptCount: s.attemptCount + 1,
      correctPoints: analysis.correctPoints,
      identifiedGaps: analysis.gaps,
    }));

    if (analysis.isComplete) {
      // Student got it right!
      handleConceptComplete(concept, analysis, session.hintLevel);
      return;
    }

    // Build the analysis response
    let response = `${analysis.encouragement}\n\n`;

    if (analysis.correctPoints.length > 0) {
      response += `**What you got right:**\n`;
      for (const point of analysis.correctPoints) {
        response += `✓ ${point}\n`;
      }
      response += '\n';
    }

    if (analysis.gaps.length > 0) {
      response += `**What's missing:**\n`;
      for (const gap of analysis.gaps) {
        response += `→ ${gap}\n`;
      }
      response += '\n';
    }

    // Give a hint
    const nextHintLevel = Math.min(session.hintLevel + 1, 3);
    const hint = getHint(concept, nextHintLevel);
    response += `💡 **Hint ${nextHintLevel}:**\n${hint}`;

    setSession((s) => ({ ...s, phase: 'hinting', hintLevel: nextHintLevel }));

    addBotMessage(response, {
      isGuided: true,
      showHelpButtons: true,
    });
  };

  const handleConceptComplete = (
    concept: ConceptEntry,
    analysis: ReturnType<typeof analyzeStudentResponse>,
    hintLevel: number,
  ) => {
    const summary = buildConceptUnlocked(concept, analysis, hintLevel);

    let response = `🎯 **Concept Unlocked!**\n\n`;
    response += `**What you already knew:**\n`;
    for (const point of summary.whatYouKnew) {
      response += `• ${point}\n`;
    }
    response += `\n**What you discovered:**\n`;
    for (const point of summary.whatYouDiscovered) {
      response += `• ${point}\n`;
    }
    response += `\n**Remember:** ${summary.keyTakeaway}\n\n`;
    response += `Now let's test your understanding with a similar question:`;

    addBotMessage(response, {
      isGuided: true,
      conceptUnlocked: summary,
      showSimilarQuestion: true,
      similarQuestion: concept.similarQuestion,
    });

    setSession((s) => ({ ...s, phase: 'practicing' }));

    // Record learning signal
    recordLearningSignal({
      subject: concept.subject,
      chapter: concept.chapter,
      topic: concept.topic,
      question: concept.similarQuestion,
      correct: true,
      hintLevelsUsed: hintLevel,
      attempts: session.attemptCount + 1,
      gapsIdentified: analysis.gaps,
    });
  };

  // Help button click
  const handleHelpAction = (action: HelpAction) => {
    if (!session.concept) return;

    if (action === 'try_again') {
      addBotMessage("Go ahead and try again! Take your time. 😊\n\nWhat do you think?", {
        isGuided: true,
        showTryButtons: true,
      });
      setSession((s) => ({ ...s, phase: 'eliciting' }));
      return;
    }

    if (action === 'show_answer') {
      const concept = session.concept;
      addBotMessage(
        `✅ **Here's the answer:**\n\n${concept.coreIdea}\n\n${concept.explanation}\n\nNow let's test your understanding with a similar question:`,
        {
          isGuided: true,
          showSimilarQuestion: true,
          similarQuestion: concept.similarQuestion,
        },
      );
      setSession((s) => ({ ...s, phase: 'practicing', showAnswerRequested: true }));

      recordLearningSignal({
        subject: concept.subject,
        chapter: concept.chapter,
        topic: concept.topic,
        question: concept.similarQuestion,
        correct: false,
        hintLevelsUsed: s_hintLevel(session),
        attempts: session.attemptCount,
        gapsIdentified: session.identifiedGaps,
      });
      return;
    }

    const result = getHelpResponse(action, session.concept, session.hintLevel);
    setSession((s) => ({ ...s, hintLevel: result.newHintLevel }));

    if (action === 'hint' || action === 'smaller_clue') {
      addBotMessage(result.text, { isGuided: true, showHelpButtons: true });
    } else {
      addBotMessage(result.text, { isGuided: true, showHelpButtons: true });
    }
  };

  // Handle similar question answer
  const handleSimilarAnswer = (text: string) => {
    if (!session.concept) return;

    // Simple check — did they attempt it?
    const analysis = analyzeStudentResponse(text, session.concept);

    if (analysis.isComplete || analysis.isPartiallyCorrect) {
      addBotMessage(
        `Great work! 🎉 You're applying what you learned.\n\n${analysis.encouragement}\n\nYour learning progress has been updated. Keep it up! 💪`,
        { isGuided: true },
      );
    } else {
      addBotMessage(
        `Good attempt! 😊 Here's a quick check:\n\n${session.concept.coreIdea}\n\nYour learning progress has been updated. Try another topic whenever you're ready!`,
        { isGuided: true },
      );
    }

    setSession((s) => ({ ...s, phase: 'complete' }));
  };

  const handleListen = (content: string, id: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speaking && speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content.replace(/\*\*/g, '').replace(/[💡🎯✓→•🌍📖🔄✅]/g, ''));
    utterance.lang = language;
    utterance.onend = () => {
      setSpeaking(false);
      setSpeakingId(null);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setSpeakingId(null);
    };
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
    setSpeakingId(id);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setSpeakingId(null);
  };

  const profileChapters = profile?.currentSubject ? getChaptersForSubject('class-9', profile.currentSubject) : [];
  const allChapters = profileChapters.length > 0 ? profileChapters.map(c => c.name) : ['Motion', 'Laws of Motion', 'Chemical Reactions', 'Trigonometry', 'Cell', 'Life Processes'];

  return (
    <AppShell
      title="AI Tutor Chatbot"
      subtitle="I won't just give you answers — I'll help you discover them yourself."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="flex h-[calc(100vh-320px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Header with What Do You Know toggle */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-slate-700">Guided Learning</span>
              {session.phase !== 'idle' && session.concept && (
                <span className="ml-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                  {session.concept.subject} → {session.concept.topic}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">🧠 What Do You Know?</span>
                <Switch
                  checked={whatDoYouKnow}
                  onCheckedChange={setWhatDoYouKnow}
                />
              </div>
            </div>
          </div>

          {/* Voice language bar */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Voice language
            </div>
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {speaking && (
                <Button size="sm" variant="outline" onClick={stopSpeaking} className="h-9 border-rose-200 text-rose-600 hover:bg-rose-50">
                  <Square className="mr-1.5 h-3.5 w-3.5" />
                  Stop
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 px-4" ref={scrollRef as never}>
            <div className="space-y-4 py-4">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', msg.role === 'bot' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600')}>
                      {msg.role === 'bot' ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    </div>
                    <div className={cn('max-w-[80%]', msg.role === 'user' ? 'items-end' : 'items-start')}>
                      <div className={cn('whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed', msg.role === 'bot' ? 'rounded-tl-sm bg-slate-100 text-slate-800' : 'rounded-tr-sm bg-indigo-600 text-white')}>
                        {renderMessageContent(msg.content)}
                      </div>
                      {msg.role === 'bot' && msg.id !== 'welcome' && (
                        <button onClick={() => handleListen(msg.content, msg.id)} className={cn('mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition', speaking && speakingId === msg.id ? 'bg-rose-100 text-rose-600' : 'text-indigo-600 hover:bg-indigo-50')}>
                          {speaking && speakingId === msg.id ? (<><Square className="h-3 w-3" />Stop</>) : (<><Volume2 className="h-3 w-3" />Listen</>)}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Try buttons — "I'll Try" / "I'm Not Sure" */}
                  {msg.role === 'bot' && msg.showTryButtons && (
                    <div className="ml-11 mt-2 flex gap-2">
                      <button onClick={() => { const el = document.getElementById('tutor-input'); el?.focus(); }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700">
                        I'll Try
                      </button>
                      <button onClick={() => { if (session.concept) { addBotMessage(`No worries! Let me give you a starting point. 😊\n\n💡 ${getHint(session.concept, 1)}`, { isGuided: true, showHelpButtons: true }); setSession((s) => ({ ...s, phase: 'hinting', hintLevel: 1 })); } }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                        I'm Not Sure
                      </button>
                    </div>
                  )}

                  {/* Help buttons */}
                  {msg.role === 'bot' && msg.showHelpButtons && (
                    <div className="ml-11 mt-2 flex flex-wrap gap-2">
                      {HELP_ACTIONS.map((h) => {
                        const Icon = h.icon;
                        return (
                          <button key={h.action} onClick={() => handleHelpAction(h.action)} className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition', h.accent)}>
                            <Icon className="h-3.5 w-3.5" />
                            {h.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Concept Unlocked card */}
                  {msg.role === 'bot' && msg.conceptUnlocked && (
                    <div className="ml-11 mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-800">Concept Unlocked</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-slate-500">What you already knew:</p>
                          {msg.conceptUnlocked.whatYouKnew.map((p, i) => (
                            <p key={i} className="text-sm text-slate-700">• {p}</p>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">What you discovered:</p>
                          {msg.conceptUnlocked.whatYouDiscovered.map((p, i) => (
                            <p key={i} className="text-sm text-slate-700">• {p}</p>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">Remember:</p>
                          <p className="text-sm font-medium text-indigo-700">{msg.conceptUnlocked.keyTakeaway}</p>
                        </div>
                      </div>
                      {session.concept && (
                        <button
                          onClick={() => handleAddToLearningCurve(session.concept!)}
                          disabled={lcAdded[session.concept.topic]}
                          className={cn(
                            'mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                            lcAdded[session.concept.topic]
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                              : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                          )}
                        >
                          {lcAdded[session.concept.topic] ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Added to Learning Curve
                            </>
                          ) : (
                            <>
                              <Brain className="h-3.5 w-3.5" />
                              Add to Learning Curve
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Similar question card */}
                  {msg.role === 'bot' && msg.showSimilarQuestion && msg.similarQuestion && (
                    <div className="ml-11 mt-3 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Target className="h-5 w-5 text-indigo-600" />
                        <span className="text-sm font-semibold text-indigo-800">Try a Similar Question</span>
                      </div>
                      <p className="text-sm text-slate-700">{msg.similarQuestion}</p>
                      <p className="mt-2 text-xs text-slate-500">Type your answer below — there's no pressure, this is practice!</p>
                    </div>
                  )}
                </div>
              ))}

              {thinking && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="border-t border-slate-100 p-3">
            {voice.error && (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-rose-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {voice.error}
              </p>
            )}
            <div className="flex gap-2">
              <Input id="tutor-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={session.phase === 'eliciting' || session.phase === 'hinting' ? "Share what you think..." : session.phase === 'practicing' ? "Type your answer to the practice question..." : "Ask about any topic..."} className="flex-1" />
              {voice.isSupported && (
                <Button
                  type="button"
                  onClick={handleMicToggle}
                  variant="outline"
                  className={cn(
                    'shrink-0 border-slate-300',
                    voice.state === 'listening' ? 'border-rose-200 bg-rose-50 text-rose-600' : 'text-indigo-600 hover:bg-indigo-50',
                  )}
                >
                  {voice.state === 'listening' ? (
                    <><span className="mr-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" /><Square className="h-4 w-4" /></>
                  ) : voice.state === 'processing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button type="submit" disabled={!input.trim() || thinking} className="bg-indigo-600 hover:bg-indigo-700">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          {/* What Do You Know explainer */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">How PadanaMithra Teaches</h3>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Instead of just giving answers, I help you discover them. When you ask a question, I'll first ask what you already know, then guide you with hints until you reach the answer yourself.
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">🧠 What Do You Know? mode</span>
              <Switch checked={whatDoYouKnow} onCheckedChange={setWhatDoYouKnow} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Try asking</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED.map((s) => (
                <button key={s} onClick={() => { setInput(s); }} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Chapters available</h3>
            <p className="mt-1 text-xs text-slate-500">From the uploaded syllabus PDF</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {allChapters.slice(0, 14).map((c) => (
                <button key={c} onClick={() => { setInput(`Explain ${c}`); }} className="rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-700 transition hover:bg-indigo-100">
                  {c}
                </button>
              ))}
            </div>
          </div>

          {whatDoYouKnow && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
              <p className="text-xs text-emerald-800">
                <span className="font-semibold">Guided mode is ON.</span> I'll ask you to share what you know before guiding you to the answer. You can turn this off anytime.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// Render message content with basic markdown bold support
function renderMessageContent(content: string): React.ReactNode {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Helper to read hint level from session safely
function s_hintLevel(s: LearningSessionState): number {
  return s.hintLevel;
}

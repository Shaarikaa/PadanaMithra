import { useEffect, useState, useCallback } from 'react';
import { Brain, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, RotateCcw, ChevronRight, Sparkles, BookOpen, Zap, FlaskConical, Dna, Sigma, Target, Lightbulb, Mic, Square, Loader as Loader2, Frown, Meh, Smile, Laugh } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/AppContext';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import {
  getLearningCurveSummary,
  recordReview,
  generateRecallQuestion,
  evaluateRecallResponse,
  getQuickReview,
  addToLearningCurve,
  autoAddFromDifficultySignals,
  type LearningCurveItem,
  type LearningCurveSummary,
  type ReviewResult,
  type RetentionStatus,
} from '@/lib/learningCurve';
import { findConcept, getHint, getSubjectOpeningQuestion, type ConceptEntry } from '@/lib/guidedLearning';

const SUBJECT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, FlaskConical, Dna, Sigma,
};

const STATUS_CONFIG: Record<RetentionStatus, { label: string; color: string; bg: string; icon: string }> = {
  learning: { label: 'Learning', color: 'text-amber-600', bg: 'bg-amber-50', icon: '🟡' },
  reviewing: { label: 'Reviewing', color: 'text-sky-600', bg: 'bg-sky-50', icon: '🔵' },
  retained: { label: 'Retained', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '🟢' },
  needs_reinforcement: { label: 'Needs Reinforcement', color: 'text-rose-600', bg: 'bg-rose-50', icon: '🔴' },
};

type Phase = 'overview' | 'guided-recall' | 'guided-hint' | 'guided-explain' | 'guided-practice' | 'confidence' | 'done';

type Confidence = 'still-difficult' | 'getting-there' | 'i-understand' | 'can-solve-confidently';

const CONFIDENCE_OPTIONS: { value: Confidence; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { value: 'still-difficult', label: 'Still difficult', icon: Frown, color: 'text-rose-600' },
  { value: 'getting-there', label: 'Getting there', icon: Meh, color: 'text-amber-600' },
  { value: 'i-understand', label: 'I understand', icon: Smile, color: 'text-sky-600' },
  { value: 'can-solve-confidently', label: 'I can solve it confidently', icon: Laugh, color: 'text-emerald-600' },
];

export function LearningCurvePage() {
  const { profile } = useApp();
  const [summary, setSummary] = useState<LearningCurveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('overview');
  const [currentItem, setCurrentItem] = useState<LearningCurveItem | null>(null);
  const [reviewQueue, setReviewQueue] = useState<LearningCurveItem[]>([]);
  const [concept, setConcept] = useState<ConceptEntry | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [studentResponse, setStudentResponse] = useState('');
  const [feedback, setFeedback] = useState<string>('');
  const [quickReview, setQuickReview] = useState<string>('');
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [confidence, setConfidence] = useState<Confidence | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    const s = await getLearningCurveSummary();
    setSummary(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Voice input for the recall/practice text areas
  const voice = useVoiceInput({
    language: 'en-US',
    onTranscript: (text) => {
      setStudentResponse((prev) => (prev ? prev + ' ' + text : text));
    },
  });

  const startReview = async () => {
    if (!summary || summary.dueItems.length === 0) return;
    // Also check difficulty signals and auto-add
    await autoAddFromDifficultySignals().catch(() => {});
    const refreshed = await getLearningCurveSummary();
    setSummary(refreshed);
    const items = refreshed.dueItems;
    if (items.length === 0) return;
    setReviewQueue(items);
    startItemReview(items[0]);
  };

  const startItemReview = (item: LearningCurveItem) => {
    setCurrentItem(item);
    setStudentResponse('');
    setFeedback('');
    setQuickReview('');
    setReviewResult(null);
    setHintLevel(0);
    setConfidence(null);
    setPracticeAnswer('');

    // Find matching concept from the guided learning database
    const matched = findConcept(item.topic);
    setConcept(matched);

    setPhase('guided-recall');
  };

  const handleMicToggle = () => {
    if (voice.state === 'listening') {
      voice.stop();
    } else {
      voice.start();
    }
  };

  const submitRecall = () => {
    if (!currentItem || studentResponse.trim().length < 3) return;

    const evaluation = evaluateRecallResponse(currentItem.topic, studentResponse);
    setReviewResult(evaluation.result);
    setFeedback(evaluation.feedback);
    setQuickReview(evaluation.quickReview || '');

    if (evaluation.result === 'correct') {
      // Student got it right — go to confidence
      setPhase('confidence');
    } else {
      // Student struggled — show hint or explanation
      if (concept && hintLevel < 3) {
        const hint = getHint(concept, hintLevel + 1);
        setHintLevel(hintLevel + 1);
        setFeedback(hint);
        setPhase('guided-hint');
      } else {
        // Show full explanation
        setPhase('guided-explain');
      }
    }
  };

  const requestAnotherHint = () => {
    if (!concept) {
      setPhase('guided-explain');
      return;
    }
    const nextLevel = Math.min(hintLevel + 1, 3);
    setHintLevel(nextLevel);
    setFeedback(getHint(concept, nextLevel));
    // Stay in guided-hint phase
  };

  const showExplanation = () => {
    if (concept) {
      setFeedback(concept.explanation);
    } else {
      setFeedback(getQuickReview(currentItem?.topic || ''));
    }
    setPhase('guided-explain');
  };

  const goToPractice = () => {
    setPhase('guided-practice');
    setPracticeAnswer('');
  };

  const submitPractice = () => {
    // Practice is optional — go to confidence
    setPhase('confidence');
  };

  const handleConfidenceSelect = async (selected: Confidence) => {
    setConfidence(selected);
    if (!currentItem) return;

    // Map confidence to review result
    let result: ReviewResult;
    if (selected === 'can-solve-confidently' || selected === 'i-understand') {
      result = 'correct';
    } else if (selected === 'getting-there') {
      result = 'partial';
    } else {
      result = 'incorrect';
    }

    // Use the review result from the recall evaluation if available, otherwise use confidence
    const finalResult = reviewResult && reviewResult === 'correct' ? 'correct' : result;

    await recordReview({
      itemId: currentItem.id,
      response: studentResponse,
      result: finalResult,
    });

    // Move to next item in queue
    const remaining = reviewQueue.slice(1);
    setReviewQueue(remaining);

    if (remaining.length > 0) {
      startItemReview(remaining[0]);
    } else {
      setPhase('done');
      await loadSummary();
    }
  };

  if (loading) {
    return (
      <AppShell title="My Learning Curve" subtitle="Spaced reviews to help you remember what you learn.">
        <div className="mx-auto max-w-2xl">
          <Card className="border-slate-200 p-8 text-center shadow-sm">
            <Brain className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">Loading your Learning Curve...</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!summary || summary.total === 0) {
    return (
      <AppShell title="My Learning Curve" subtitle="Spaced reviews to help you remember what you learn.">
        <div className="mx-auto max-w-2xl">
          <Card className="border-slate-200 p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Brain className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No concepts in your Learning Curve yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              When you find a concept difficult, make mistakes, or need repeated revision, I'll remember it and bring it back for review at the right time.
            </p>
            <div className="mt-6 space-y-2 text-left">
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="text-lg">🧠</span>
                <span>Topics are added automatically when you struggle with questions</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="text-lg">📝</span>
                <span>After a mock test, wrong answers are added for spaced review</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="text-lg">⚡</span>
                <span>I'll schedule reviews at the right time using spaced repetition</span>
              </div>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  // ---- Guided Review Flow ----

  if (phase === 'guided-recall' && currentItem) {
    return (
      <AppShell title="Learning Curve Review" subtitle="Active recall — try to answer without looking at your notes.">
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              Review {reviewQueue.length > 0 ? `1 of ${reviewQueue.length + reviewQueue.filter((_, i) => i > 0).length}` : ''}
            </span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
              {currentItem.subject} → {currentItem.topic}
            </span>
          </div>

          <Card className="border-indigo-100 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">What do you remember?</h3>
            </div>
            <p className="text-sm text-slate-600">
              You learned <span className="font-semibold text-slate-800">{currentItem.topic}</span> previously.
              {currentItem.reason && (
                <span className="mt-1 block text-xs text-slate-500">Reason for review: {currentItem.reason}</span>
              )}
            </p>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-sm font-medium text-slate-800">
                {generateRecallQuestion(currentItem.subject, currentItem.chapter, currentItem.topic)}
              </p>
            </div>
            {concept && (
              <p className="mt-3 text-xs text-indigo-600">
                💡 {getSubjectOpeningQuestion(concept)}
              </p>
            )}
          </Card>

          <Card className="border-slate-200 p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Your answer</span>
              {voice.isSupported && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMicToggle}
                  className={cn(
                    'h-8',
                    voice.state === 'listening' ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50',
                  )}
                >
                  {voice.state === 'listening' ? (
                    <><span className="mr-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />Listening...</>
                  ) : voice.state === 'processing' ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Processing...</>
                  ) : (
                    <><Mic className="mr-1.5 h-3.5 w-3.5" />Speak</>
                  )}
                </Button>
              )}
            </div>
            <Textarea
              placeholder="Type or speak what you remember about this topic..."
              value={studentResponse}
              onChange={(e) => setStudentResponse(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="mt-2 text-xs text-slate-400">{studentResponse.trim().length} characters</p>
            {voice.error && (
              <p className="mt-1 text-xs text-rose-600">{voice.error}</p>
            )}
            <div className="mt-4 flex justify-between">
              <Button variant="ghost" onClick={() => { setPhase('overview'); }} className="text-slate-500">
                Cancel
              </Button>
              <Button
                onClick={submitRecall}
                disabled={studentResponse.trim().length < 3}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Submit Answer
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (phase === 'guided-hint' && currentItem) {
    return (
      <AppShell title="Learning Curve Review" subtitle="Let's work through this together.">
        <div className="mx-auto max-w-2xl space-y-5">
          <Card className="border-amber-100 p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-slate-900">Here's a hint (Level {hintLevel})</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">{feedback}</p>
          </Card>

          <Card className="border-slate-200 p-6 shadow-sm">
            <p className="mb-3 text-sm font-medium text-slate-700">Try again with this hint:</p>
            <Textarea
              placeholder="Update your answer using the hint..."
              value={studentResponse}
              onChange={(e) => setStudentResponse(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={submitRecall}
                disabled={studentResponse.trim().length < 3}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Try Again
              </Button>
              {concept && hintLevel < 3 && (
                <Button variant="outline" onClick={requestAnotherHint} className="border-amber-200 text-amber-700 hover:bg-amber-50">
                  <Lightbulb className="mr-1.5 h-4 w-4" />
                  Another Hint
                </Button>
              )}
              <Button variant="ghost" onClick={showExplanation} className="text-slate-500">
                Show Explanation
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (phase === 'guided-explain' && currentItem) {
    return (
      <AppShell title="Learning Curve Review" subtitle="Let's understand the concept fully.">
        <div className="mx-auto max-w-2xl space-y-5">
          <Card className="border-indigo-100 p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">Concept Explanation</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">{feedback || (concept ? concept.explanation : getQuickReview(currentItem.topic))}</p>
            {concept && (
              <div className="mt-4 rounded-xl bg-indigo-50/40 p-4">
                <p className="text-xs font-semibold text-indigo-700">Real-life example</p>
                <p className="mt-1 text-sm text-slate-700">{concept.realLifeExample}</p>
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button onClick={goToPractice} className="bg-indigo-600 hover:bg-indigo-700">
              <Target className="mr-1.5 h-4 w-4" />
              Try a Practice Question
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (phase === 'guided-practice' && currentItem && concept) {
    return (
      <AppShell title="Learning Curve Review" subtitle="Test your understanding.">
        <div className="mx-auto max-w-2xl space-y-5">
          <Card className="border-indigo-100 p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">Practice Question</h3>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-sm font-medium text-slate-800">{concept.similarQuestion}</p>
            </div>
          </Card>

          <Card className="border-slate-200 p-6 shadow-sm">
            <Textarea
              placeholder="Type your answer to the practice question..."
              value={practiceAnswer}
              onChange={(e) => setPracticeAnswer(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="mt-4 flex justify-between">
              <Button variant="ghost" onClick={() => setPhase('confidence')} className="text-slate-500">
                Skip to Feedback
              </Button>
              <Button onClick={submitPractice} className="bg-indigo-600 hover:bg-indigo-700">
                Submit & Continue
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (phase === 'confidence' && currentItem) {
    return (
      <AppShell title="Learning Curve Review" subtitle="Almost done!">
        <div className="mx-auto max-w-2xl space-y-5">
          {reviewResult === 'correct' && (
            <Card className="border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-800">Great job!</p>
                  <p className="text-sm text-emerald-700">{feedback}</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="border-slate-200 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">How confident do you feel about this topic now?</h3>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Your answer helps me schedule the next review at the right time.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {CONFIDENCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleConfidenceSelect(opt.value)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm',
                      confidence === opt.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:border-indigo-200',
                    )}
                  >
                    <Icon className={cn('h-6 w-6', opt.color)} />
                    <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (phase === 'done') {
    return (
      <AppShell title="My Learning Curve" subtitle="Spaced reviews to help you remember what you learn.">
        <div className="mx-auto max-w-2xl">
          <Card className="border-emerald-200 p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">All reviews complete!</h3>
            <p className="mt-2 text-sm text-slate-500">
              Great job! Your next review has been scheduled based on your performance and confidence.
              I'll remind you when it's time to review again.
            </p>
            <Button onClick={() => { setPhase('overview'); loadSummary(); }} className="mt-6 bg-indigo-600 hover:bg-indigo-700">
              Back to Learning Curve
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  // ---- Overview ----
  return (
    <AppShell title="My Learning Curve" subtitle="Spaced reviews to help you remember what you learn.">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-slate-500">Due Today</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.dueToday}</p>
          </Card>
          <Card className="border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-sky-600" />
              <span className="text-xs font-medium text-slate-500">Needs Practice</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.needsPractice}</p>
          </Card>
          <Card className="border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-slate-500">Retained</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.mastered}</p>
          </Card>
          <Card className="border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-medium text-slate-500">Total</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.total}</p>
          </Card>
        </div>

        {/* Today's Review */}
        {summary.dueToday > 0 && (
          <Card className="overflow-hidden border-indigo-100 shadow-sm">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 p-4 text-white">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                <h3 className="text-sm font-semibold">Topics to Review Today</h3>
              </div>
              <p className="mt-1 text-xs text-white/80">{summary.dueToday} concept{summary.dueToday === 1 ? '' : 's'} waiting for review</p>
            </div>
            <div className="p-5">
              <div className="space-y-2">
                {summary.dueItems.slice(0, 10).map((item) => {
                  const Icon = SUBJECT_ICONS[Object.keys(SUBJECT_ICONS).find((k) => k === item.subject) || ''] || Brain;
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{item.topic}</p>
                        <p className="text-xs text-slate-500">
                          {item.subject} → {item.chapter}
                          {item.reason ? ` · ${item.reason}` : ''}
                          {' · '}Day {item.review_interval_days} review
                        </p>
                      </div>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CONFIG[item.retention_status].bg, STATUS_CONFIG[item.retention_status].color)}>
                        {STATUS_CONFIG[item.retention_status].icon} {STATUS_CONFIG[item.retention_status].label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Button onClick={startReview} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700">
                <Brain className="mr-1.5 h-4 w-4" />
                Start Today's Review
              </Button>
            </div>
          </Card>
        )}

        {/* All Concepts */}
        <Card className="border-slate-200 p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">All Concepts in My Learning Curve</h3>
          {summary.allItems.length > 0 ? (
            <div className="space-y-2">
              {summary.allItems.map((item) => {
                const Icon = SUBJECT_ICONS[Object.keys(SUBJECT_ICONS).find((k) => k === item.subject) || ''] || Brain;
                const isDue = new Date(item.next_review_at) <= new Date();
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{item.topic}</p>
                      <p className="text-xs text-slate-500">
                        {item.subject} → {item.chapter}
                        {item.reason ? ` · ${item.reason}` : ''}
                        {isDue ? ' · Due now' : ` · Next: ${new Date(item.next_review_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CONFIG[item.retention_status].bg, STATUS_CONFIG[item.retention_status].color)}>
                        {STATUS_CONFIG[item.retention_status].label}
                      </span>
                      <p className="mt-0.5 text-xs text-slate-400">{item.review_count} review{item.review_count === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-slate-400">No concepts yet. Start learning and difficult topics will be added automatically!</p>
          )}
        </Card>

        {/* Legend */}
        <Card className="border-slate-200 p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold text-slate-500">Status Legend</p>
          <div className="flex flex-wrap gap-4">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2 text-xs text-slate-600">
                <span className={cn('rounded-full px-2 py-0.5 font-medium', cfg.bg, cfg.color)}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

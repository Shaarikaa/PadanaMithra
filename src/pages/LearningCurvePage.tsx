import { useEffect, useState, useCallback } from 'react';
import { Brain, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, RotateCcw, ChevronRight, Sparkles, BookOpen, Zap, FlaskConical, Dna, Sigma } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/AppContext';
import {
  getLearningCurveSummary,
  recordReview,
  generateRecallQuestion,
  evaluateRecallResponse,
  type LearningCurveItem,
  type LearningCurveSummary,
  type ReviewResult,
  type RetentionStatus,
} from '@/lib/learningCurve';

const SUBJECT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, FlaskConical, Dna, Sigma,
};

const STATUS_CONFIG: Record<RetentionStatus, { label: string; color: string; bg: string; icon: string }> = {
  learning: { label: 'Learning', color: 'text-amber-600', bg: 'bg-amber-50', icon: '🟡' },
  reviewing: { label: 'Reviewing', color: 'text-sky-600', bg: 'bg-sky-50', icon: '🔵' },
  retained: { label: 'Retained', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '🟢' },
  needs_reinforcement: { label: 'Needs Reinforcement', color: 'text-rose-600', bg: 'bg-rose-50', icon: '🔴' },
};

type Phase = 'overview' | 'recall' | 'feedback' | 'done';

export function LearningCurvePage() {
  const { profile } = useApp();
  const [summary, setSummary] = useState<LearningCurveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('overview');
  const [currentItem, setCurrentItem] = useState<LearningCurveItem | null>(null);
  const [recallAnswer, setRecallAnswer] = useState('');
  const [reviewResult, setReviewResult] = useState<{ result: ReviewResult; feedback: string; quickReview: string } | null>(null);
  const [reviewQueue, setReviewQueue] = useState<LearningCurveItem[]>([]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    const s = await getLearningCurveSummary();
    setSummary(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const startReview = async () => {
    if (!summary || summary.dueItems.length === 0) return;
    setReviewQueue(summary.dueItems);
    setCurrentItem(summary.dueItems[0]);
    setPhase('recall');
    setRecallAnswer('');
    setReviewResult(null);
  };

  const submitRecall = () => {
    if (!currentItem || recallAnswer.trim().length < 3) return;

    const evaluation = evaluateRecallResponse(currentItem.topic, recallAnswer);
    setReviewResult(evaluation);
    setPhase('feedback');
  };

  const handleNextReview = async () => {
    if (!currentItem || !reviewResult) return;

    await recordReview({
      itemId: currentItem.id,
      response: recallAnswer,
      result: reviewResult.result,
    });

    // Move to next item in queue
    const remaining = reviewQueue.slice(1);
    setReviewQueue(remaining);

    if (remaining.length > 0) {
      setCurrentItem(remaining[0]);
      setRecallAnswer('');
      setReviewResult(null);
      setPhase('recall');
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
              When you find a concept difficult, add it to your Learning Curve. I'll remind you to review it at the right time using spaced repetition.
            </p>
            <div className="mt-6 space-y-2 text-left">
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="text-lg">🧠</span>
                <span>Click "Add to Learning Curve" while learning in the AI Tutor</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="text-lg">📝</span>
                <span>After a mock test, add wrong answers for spaced review</span>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="text-lg">⚡</span>
                <span>I'll also suggest topics automatically based on your activity</span>
              </div>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  // ---- Review Flow ----
  if (phase === 'recall' && currentItem) {
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
              <h3 className="font-semibold text-slate-900">Recall Check</h3>
            </div>
            <p className="text-sm text-slate-600">
              You learned <span className="font-semibold text-slate-800">{currentItem.topic}</span> recently.
              Let's see if you still remember it.
            </p>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-sm font-medium text-slate-800">
                {generateRecallQuestion(currentItem.subject, currentItem.chapter, currentItem.topic)}
              </p>
            </div>
          </Card>

          <Card className="border-slate-200 p-6 shadow-sm">
            <Textarea
              placeholder="Type your answer here — don't look at your notes!"
              value={recallAnswer}
              onChange={(e) => setRecallAnswer(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="mt-2 text-xs text-slate-400">{recallAnswer.trim().length} characters</p>
            <div className="mt-4 flex justify-between">
              <Button variant="ghost" onClick={() => { setPhase('overview'); }} className="text-slate-500">
                Cancel
              </Button>
              <Button
                onClick={submitRecall}
                disabled={recallAnswer.trim().length < 3}
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

  if (phase === 'feedback' && reviewResult && currentItem) {
    const isCorrect = reviewResult.result === 'correct';
    return (
      <AppShell title="Learning Curve Review" subtitle="Active recall — try to answer without looking at your notes.">
        <div className="mx-auto max-w-2xl space-y-5">
          <Card className={cn('border-0 p-6 shadow-sm', isCorrect ? 'bg-emerald-50' : reviewResult.result === 'partial' ? 'bg-amber-50' : 'bg-rose-50')}>
            <div className="flex items-center gap-3">
              {isCorrect ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-rose-600" />
              )}
              <div>
                <p className="text-xs font-medium text-slate-500">Your Answer</p>
                <p className="text-sm text-slate-700">{recallAnswer}</p>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 p-6 shadow-sm">
            <p className={cn('text-lg font-semibold', isCorrect ? 'text-emerald-700' : reviewResult.result === 'partial' ? 'text-amber-700' : 'text-rose-700')}>
              {reviewResult.feedback}
            </p>

            {reviewResult.quickReview && (
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-indigo-700">Quick Review</span>
                </div>
                <p className="text-sm text-slate-700">{reviewResult.quickReview}</p>
              </div>
            )}
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleNextReview} className="bg-indigo-600 hover:bg-indigo-700">
              {reviewQueue.length > 1 ? 'Next Review' : 'Finish Reviews'}
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
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
              Great job! Your next review has been scheduled based on your performance.
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
                <h3 className="text-sm font-semibold">Today's Review</h3>
              </div>
              <p className="mt-1 text-xs text-white/80">{summary.dueToday} concept{summary.dueToday === 1 ? '' : 's'} waiting for review</p>
            </div>
            <div className="p-5">
              <div className="space-y-2">
                {summary.dueItems.slice(0, 5).map((item) => {
                  const Icon = SUBJECT_ICONS[Object.keys(SUBJECT_ICONS).find((k) => k === item.subject) || ''] || Brain;
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{item.topic}</p>
                        <p className="text-xs text-slate-500">
                          {item.subject} → {item.chapter} · Day {item.review_interval_days} review
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
            <p className="py-4 text-center text-sm text-slate-400">No concepts yet. Start learning and add difficult topics!</p>
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

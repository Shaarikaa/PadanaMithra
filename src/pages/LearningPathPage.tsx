import { useMemo } from 'react';
import { Route, CheckCircle2, Circle, AlertCircle, Target, ArrowRight, Brain, Sparkles, Zap, FlaskConical, Dna, Sigma } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/AppContext';
import { SUBJECT_INFOS, getChaptersForSubject } from '@/lib/curriculum';
import { computeLearningPath, computeLearningDNA, computeNextBestStep, getConceptGaps } from '@/lib/learningEngine';

const SUBJECT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, FlaskConical, Dna, Sigma,
};

const STATUS_CONFIG = {
  mastered: { Icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Mastered', symbol: '✓' },
  current: { Icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Current Topic', symbol: '🟡' },
  'in-progress': { Icon: Target, color: 'text-amber-600', bg: 'bg-amber-50', label: 'In Progress', symbol: '🟡' },
  weak: { Icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Needs Work', symbol: '🔴' },
  'not-started': { Icon: Circle, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Not Started', symbol: '○' },
};

export function LearningPathPage() {
  const { profile, navigate } = useApp();

  const path = useMemo(() => computeLearningPath(profile), [profile]);
  const dna = useMemo(() => computeLearningDNA(profile), [profile]);
  const nextStep = useMemo(() => computeNextBestStep(profile), [profile]);
  const gaps = useMemo(() => getConceptGaps(), []);

  if (!profile) return null;

  const subjectInfo = SUBJECT_INFOS.find((s) => s.id === profile.currentSubject);
  const SubjIcon = subjectInfo ? SUBJECT_ICONS[subjectInfo.icon] : Zap;
  const chapters = getChaptersForSubject('class-9', profile.currentSubject);

  return (
    <AppShell title="My Learning Path" subtitle="Your personalized learning journey based on real activity.">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Next Best Step */}
        {nextStep.hasData ? (
          <Card className="overflow-hidden border-indigo-100 shadow-sm">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                <h3 className="text-sm font-semibold">Your Next Best Step</h3>
              </div>
            </div>
            <div className="p-5">
              {nextStep.improvingTopic && (
                <p className="text-sm text-slate-600">
                  You are improving in <span className="font-semibold text-emerald-700">{nextStep.improvingTopic}</span>.
                </p>
              )}
              {nextStep.weakTopic && (
                <p className="mt-1 text-sm text-slate-600">
                  Before moving ahead, strengthen:{' '}
                  <span className="font-semibold text-rose-700">{nextStep.weakTopic}</span>
                </p>
              )}
              {nextStep.missedCount && (
                <p className="mt-1 text-xs text-slate-400">You missed {nextStep.missedCount} related question{nextStep.missedCount === 1 ? '' : 's'}.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate({ name: 'feature', id: 'ai-tutor' })}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  5-Min Concept Review
                </Button>
                <Button size="sm" variant="outline" className="border-slate-300" onClick={() => navigate({ name: 'feature', id: 'mock-test' })}>
                  <Target className="mr-1.5 h-3.5 w-3.5" />
                  3 Practice Questions
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="border-dashed border-slate-300 p-6 text-center">
            <Brain className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">Keep practicing to unlock personalized insights.</p>
          </Card>
        )}

        {/* Learning Path */}
        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Route className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Learning Path</h3>
            {subjectInfo && (
              <span className="ml-1 flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                <SubjIcon className="h-3.5 w-3.5" />
                {subjectInfo.label}
              </span>
            )}
          </div>

          {path.length > 0 ? (
            <div className="space-y-1">
              {path.map((step, i) => {
                const config = STATUS_CONFIG[step.status];
                const { Icon } = config;
                return (
                  <div key={i} className="flex items-center gap-3">
                    {/* Connector line */}
                    {i < path.length - 1 && (
                      <div className="absolute ml-[18px] mt-10 h-[calc(100%-20px)] w-0.5 bg-slate-200" style={{ height: '40px' }} />
                    )}
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', config.bg)}>
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-sm font-medium text-slate-800">{step.topic}</p>
                      <p className={cn('text-xs', config.color)}>{config.label}</p>
                      {step.recommendation && (
                        <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs text-indigo-700">
                          <ArrowRight className="h-3 w-3" />
                          Recommended: {step.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {chapters.length > 0
                ? 'Start a mock test or ask the AI Tutor to build your learning path.'
                : 'Study materials will appear here once they are added.'}
            </p>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={cn('flex h-5 w-5 items-center justify-center rounded-full', cfg.bg)}>
                  <cfg.Icon className={cn('h-3 w-3', cfg.color)} />
                </span>
                {cfg.label}
              </div>
            ))}
          </div>
        </Card>

        {/* Learning DNA */}
        <Card className="border-slate-200 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Dna className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Learning DNA</h3>
          </div>

          {dna.length > 0 ? (
            <div className="space-y-5">
              {dna.map((subj) => {
                const info = SUBJECT_INFOS.find((s) => s.id === subj.subject);
                const SubjIcon2 = info ? SUBJECT_ICONS[info.icon] : Zap;
                return (
                  <div key={subj.subject}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', info?.accent)}>
                        <SubjIcon2 className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm font-semibold text-slate-800">{info?.emoji} {info?.label ?? subj.subject}</span>
                    </div>
                    {subj.hasData ? (
                      <div className="space-y-2 pl-9">
                        {subj.indicators.map((ind) => (
                          <div key={ind.label}>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">{ind.label}</span>
                              <span className={cn('font-medium', ind.hasData ? 'text-slate-700' : 'text-slate-300')}>
                                {ind.hasData ? `${ind.score}%` : 'Not enough data yet'}
                              </span>
                            </div>
                            <Progress value={ind.hasData ? ind.score : 0} className="mt-1 h-1.5" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="pl-9 text-xs text-slate-400">Not enough data yet</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Keep practicing to unlock personalized insights.</p>
          )}
        </Card>

        {/* Concept Gaps */}
        {gaps.length > 0 && (
          <Card className="border-rose-100 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <h3 className="font-semibold text-slate-900">Identified Concept Gaps</h3>
            </div>
            <div className="space-y-2">
              {gaps.map((gap, i) => (
                <div key={i} className="rounded-xl border border-rose-100 bg-rose-50/30 p-3">
                  <p className="text-sm font-medium text-slate-800">
                    {gap.subject} → {gap.chapter}{gap.topic ? ` → ${gap.topic}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{gap.description}</p>
                  <p className="mt-1 text-xs text-rose-500">Missed {gap.missedCount} question{gap.missedCount === 1 ? '' : 's'}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Quick links */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate({ name: 'feature', id: 'mock-test' })} className="bg-indigo-600 hover:bg-indigo-700">
            <Target className="mr-1.5 h-4 w-4" />
            Take a Mock Test
          </Button>
          <Button variant="outline" className="border-slate-300" onClick={() => navigate({ name: 'feature', id: 'teach-back' })}>
            <Dna className="mr-1.5 h-4 w-4" />
            Teach It Back
          </Button>
          <Button variant="outline" className="border-slate-300" onClick={() => navigate({ name: 'dashboard' })}>
            <ArrowRight className="mr-1.5 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

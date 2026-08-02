import { useMemo, useState, useEffect } from 'react';
import { Sparkles, Search, Zap, FlaskConical, Dna, Sigma, Bot, ScanLine, Timer, Layers, CalendarDays, ArrowRight, Target, Sun, Moon, CloudSun, Brain, Compass, GraduationCap } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { FEATURES } from '@/lib/features';
import { FeatureCard } from '@/components/FeatureCard';
import { UpgradeModal } from '@/components/UpgradeModal';
import { AppShell } from '@/components/AppShell';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { SUBJECT_INFOS } from '@/lib/curriculum';
import { loadJSON, STORAGE_KEYS } from '@/lib/storage';
import { computeNextBestStep, computeLearningDNA, computeLearningInsights } from '@/lib/learningEngine';
import { getAssignedMentor } from '@/lib/mentorService';

const SUBJECT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, FlaskConical, Dna, Sigma,
};

function getGreeting(): { text: string; Icon: React.ComponentType<{ className?: string }> } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', Icon: Sun };
  if (hour < 17) return { text: 'Good Afternoon', Icon: CloudSun };
  return { text: 'Good Evening', Icon: Moon };
}

const QUICK_ACTIONS = [
  { id: 'ai-tutor', label: 'Ask AI', icon: Bot, color: 'bg-indigo-100 text-indigo-600' },
  { id: 'doubt-solver', label: 'Scan Question', icon: ScanLine, color: 'bg-rose-100 text-rose-600' },
  { id: 'mock-test', label: 'Mock Test', icon: Timer, color: 'bg-sky-100 text-sky-600' },
  { id: 'flashcards', label: '1-Min Revision', icon: Layers, color: 'bg-violet-100 text-violet-600' },
  { id: 'timetable', label: 'My Timetable', icon: CalendarDays, color: 'bg-cyan-100 text-cyan-600' },
];

export function DashboardPage() {
  const { profile, navigate, isPremium } = useApp();
  const [query, setQuery] = useState('');
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);

  useEffect(() => {
    const scores = loadJSON<number[]>(STORAGE_KEYS.mockTestScores, []);
    setLastScore(scores.length > 0 ? scores[scores.length - 1] : null);
  }, []);

  const nextStep = useMemo(() => computeNextBestStep(profile), [profile]);
  const learningDNA = useMemo(() => computeLearningDNA(profile), [profile]);
  const learningInsights = useMemo(() => computeLearningInsights(profile), [profile]);
  const [mentorName, setMentorName] = useState<string | null>(null);

  useEffect(() => {
    getAssignedMentor().then((a) => { if (a?.mentor) setMentorName(a.mentor.name); });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FEATURES;
    return FEATURES.filter(
      (f) => f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
    );
  }, [query]);

  const handleFeatureClick = (id: string, premium: boolean) => {
    if (premium) {
      const f = FEATURES.find((x) => x.id === id);
      setUpgradeFeature(f?.title ?? null);
      return;
    }
    navigate({ name: 'feature', id });
  };

  const { text: greetingText, Icon: GreetingIcon } = getGreeting();
  const firstName = profile?.fullName?.split(' ')[0] ?? 'learner';
  const freeCount = FEATURES.filter((f) => !f.premium).length;
  const proCount = FEATURES.filter((f) => f.premium).length;

  return (
    <AppShell>
      {/* Personalized hero */}
      <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-200/50 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <GreetingIcon className="h-7 w-7" />
              {greetingText}, {firstName}!
            </h1>
            <p className="mt-1.5 text-sm text-indigo-100">
              {profile?.classLevel} • {profile?.board}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate({ name: 'profile' })}
            className="border-0 bg-white/15 text-white backdrop-blur hover:bg-white/25"
          >
            My Profile
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        {/* Currently learning */}
        {profile?.currentSubject && profile?.currentChapter && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-indigo-200" />
              <span className="text-indigo-100">Currently Learning:</span>
            </div>
            <div className="flex items-center gap-2">
              {(() => {
                const info = SUBJECT_INFOS.find((s) => s.id === profile.currentSubject);
                const SubjIcon = info ? SUBJECT_ICONS[info.icon] : Zap;
                return (
                  <>
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1 text-sm font-semibold">
                      <SubjIcon className="h-4 w-4" />
                      {profile.currentSubject}
                    </span>
                    <ArrowRight className="h-4 w-4 text-indigo-200" />
                    <span className="text-sm font-semibold">{profile.currentChapter}</span>
                    {profile.currentTopic && (
                      <span className="text-sm text-indigo-200">— {profile.currentTopic}</span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Subjects + Quick Actions */}
      <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Subjects */}
        <Card className="border-slate-200 p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Your Subjects</h3>
          <div className="flex flex-wrap gap-2.5">
            {profile?.selectedSubjects.map((subjId) => {
              const info = SUBJECT_INFOS.find((s) => s.id === subjId);
              const Icon = info ? SUBJECT_ICONS[info.icon] : Zap;
              return (
                <div key={subjId} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', info?.accent)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-medium text-slate-700">{info?.emoji} {info?.label ?? subjId}</span>
                </div>
              );
            })}
            {(!profile || profile.selectedSubjects.length === 0) && (
              <p className="text-sm text-slate-400">No subjects selected.</p>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="border-slate-200 p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Quick Actions</h3>
          <div className="flex flex-wrap gap-2.5">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => navigate({ name: 'feature', id: action.id })}
                  className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm"
                >
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-110', action.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-medium text-slate-700">{action.label}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Next Best Step + Learning DNA */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Next Best Step */}
        {nextStep.hasData ? (
          <Card className="overflow-hidden border-indigo-100 shadow-sm">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                <h3 className="text-sm font-semibold">Your Next Best Step</h3>
              </div>
            </div>
            <div className="p-4">
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
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate({ name: 'feature', id: 'ai-tutor' })}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  5-Min Review
                </Button>
                <Button size="sm" variant="outline" className="border-slate-300" onClick={() => navigate({ name: 'feature', id: 'mock-test' })}>
                  <Target className="mr-1.5 h-3.5 w-3.5" />
                  Practice
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="border-dashed border-slate-300 p-6 text-center">
            <Brain className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">Your Next Best Step</p>
            <p className="mt-1 text-xs text-slate-400">Keep practicing to unlock personalized insights.</p>
          </Card>
        )}

        {/* Learning DNA mini */}
        <Card className="border-slate-200 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dna className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">Learning DNA</h3>
            </div>
            <Button size="sm" variant="ghost" className="text-indigo-600" onClick={() => navigate({ name: 'feature', id: 'learning-path' })}>
              View full
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
          {learningDNA.some((s) => s.hasData) ? (
            <div className="space-y-3">
              {learningDNA.slice(0, 2).map((subj) => {
                const info = SUBJECT_INFOS.find((s) => s.id === subj.subject);
                return (
                  <div key={subj.subject}>
                    <p className="mb-1 text-xs font-medium text-slate-700">{info?.emoji} {info?.label ?? subj.subject}</p>
                    {subj.hasData ? (
                      <div className="space-y-1">
                        {subj.indicators.map((ind) => (
                          <div key={ind.label} className="flex items-center gap-2">
                            <span className="w-28 shrink-0 text-xs text-slate-500">{ind.label}</span>
                            <Progress value={ind.hasData ? ind.score : 0} className="h-1.5 flex-1" />
                            <span className={cn('w-9 shrink-0 text-right text-xs font-medium', ind.hasData ? 'text-slate-600' : 'text-slate-300')}>
                              {ind.hasData ? `${ind.score}%` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300">Not enough data yet</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-slate-400">Take a mock test or teach-back to build your Learning DNA.</p>
          )}
        </Card>
      </div>

      {/* Your Learning Insight */}
      <div className="mb-6">
        <Card className="overflow-hidden border-indigo-100 shadow-sm">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <h3 className="text-sm font-semibold">Your Learning Insight</h3>
            </div>
          </div>
          <div className="p-5">
            {learningInsights.hasData ? (
              <div className="space-y-4">
                {/* Summary line */}
                <p className="text-sm text-slate-700">
                  {learningInsights.currentTopic ? (
                    <>
                      You are currently working on:{' '}
                      <span className="font-semibold text-indigo-700">{learningInsights.currentTopic}</span>
                      {learningInsights.currentTopicStatus && (
                        <span className={cn(
                          'ml-2 rounded-full px-2 py-0.5 text-xs font-medium',
                          learningInsights.currentTopicStatus === 'mastered' ? 'bg-emerald-100 text-emerald-700' :
                          learningInsights.currentTopicStatus === 'developing' ? 'bg-amber-100 text-amber-700' :
                          learningInsights.currentTopicStatus === 'needs-review' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-600'
                        )}>
                          {learningInsights.currentTopicStatus === 'mastered' ? 'Mastered' :
                           learningInsights.currentTopicStatus === 'developing' ? 'Developing' :
                           learningInsights.currentTopicStatus === 'needs-review' ? 'Needs Review' :
                           'Not enough data yet'}
                        </span>
                      )}
                    </>
                  ) : (
                    <>You've started your guided learning journey. Keep asking questions to build your insight!</>
                  )}
                </p>

                {/* Topic status list */}
                {learningInsights.topics.length > 0 && (
                  <div className="space-y-2">
                    {learningInsights.topics.slice(0, 5).map((topic, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                            topic.status === 'mastered' ? 'bg-emerald-100 text-emerald-600' :
                            topic.status === 'developing' ? 'bg-amber-100 text-amber-600' :
                            topic.status === 'needs-review' ? 'bg-rose-100 text-rose-600' :
                            'bg-slate-100 text-slate-400'
                          )}>
                            {topic.status === 'mastered' ? '🟢' :
                             topic.status === 'developing' ? '🟡' :
                             topic.status === 'needs-review' ? '🔴' : '○'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{topic.topic}</p>
                            <p className="text-xs text-slate-500">{topic.subject} · {topic.attempts} attempt{topic.attempts === 1 ? '' : 's'}</p>
                          </div>
                        </div>
                        <span className={cn(
                          'text-xs font-medium',
                          topic.status === 'mastered' ? 'text-emerald-600' :
                          topic.status === 'developing' ? 'text-amber-600' :
                          topic.status === 'needs-review' ? 'text-rose-600' : 'text-slate-400'
                        )}>
                          {topic.status === 'mastered' ? 'Understanding' :
                           topic.status === 'developing' ? 'Developing' :
                           topic.status === 'needs-review' ? 'Needs Review' : 'No data yet'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Next step recommendation */}
                {learningInsights.nextStepRecommendation && (
                  <div className="flex items-start gap-3 rounded-xl bg-indigo-50/60 px-4 py-3">
                    <Compass className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                    <div>
                      <p className="text-xs font-medium text-indigo-700">Your Next Learning Step</p>
                      <p className="mt-0.5 text-sm text-slate-700">{learningInsights.nextStepRecommendation}</p>
                    </div>
                  </div>
                )}

                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate({ name: 'feature', id: 'ai-tutor' })}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Continue Learning
                </Button>
              </div>
            ) : (
              <div className="py-6 text-center">
                <Brain className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">Ask the AI Tutor a question to start building your learning insight.</p>
                <Button className="mt-3 bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate({ name: 'feature', id: 'ai-tutor' })}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Start Learning
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Mentor quick card */}
      <div className="mb-6">
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <button onClick={() => navigate({ name: 'feature', id: 'mentoring' })} className="w-full text-left">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Personal Mentor</p>
                  <p className="text-xs text-slate-500">{mentorName ? `Connected with ${mentorName.split(' — ')[1] || mentorName}` : isPremium ? 'Awaiting assignment' : 'Premium feature'}</p>
                </div>
              </div>
              {isPremium ? (
                <ArrowRight className="h-4 w-4 text-slate-400" />
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600">PRO</span>
              )}
            </div>
          </button>
        </Card>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Free tools</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{freeCount}</p>
          <p className="mt-1 text-xs text-emerald-600">Ready to use</p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5 shadow-sm">
          <p className="text-sm text-indigo-700">Premium tools</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">{proCount}</p>
          <p className="mt-1 text-xs text-indigo-600">Unlock with Pro</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Last Mock Test</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {lastScore !== null ? `${lastScore}/10` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {lastScore !== null ? 'Keep practicing!' : 'Take your first test'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search features..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          {filtered.length} of {FEATURES.length} tools
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((feature, i) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            index={i}
            onClick={() => handleFeatureClick(feature.id, feature.premium)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-slate-500">No features match "{query}".</p>
        </div>
      )}

      <UpgradeModal
        open={upgradeFeature !== null}
        onClose={() => setUpgradeFeature(null)}
        featureName={upgradeFeature ?? undefined}
      />
    </AppShell>
  );
}

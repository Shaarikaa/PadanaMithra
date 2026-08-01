import { useState, useMemo } from 'react';
import { Mic, Send, RotateCcw, BookOpen, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Lightbulb, ArrowRight, Sparkles, Target, ChevronRight } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/AppContext';
import { SUBJECT_INFOS, getChaptersForSubject, getTopicsForChapter } from '@/lib/curriculum';
import { evaluateTeachBack, saveTeachBackSession, getTeachBackSessions } from '@/lib/learningEngine';
import { KNOWLEDGE_BASE } from '@/lib/mockData';
import type { TeachBackEvaluation } from '@/lib/types';

type Phase = 'select' | 'explain' | 'result';

export function TeachBackPage() {
  const { profile, navigate } = useApp();
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedSubject, setSelectedSubject] = useState(profile?.currentSubject ?? '');
  const [selectedChapter, setSelectedChapter] = useState(profile?.currentChapter ?? '');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [response, setResponse] = useState('');
  const [evaluation, setEvaluation] = useState<TeachBackEvaluation | null>(null);
  const [sessions] = useState(() => getTeachBackSessions());

  const chapters = useMemo(() => getChaptersForSubject('class-9', selectedSubject), [selectedSubject]);
  const topics = useMemo(() => getTopicsForChapter('class-9', selectedSubject, selectedChapter), [selectedSubject, selectedChapter]);
  const knowledgeText = KNOWLEDGE_BASE[selectedChapter] ?? '';

  const handleStartExplain = () => {
    setPhase('explain');
  };

  const handleSubmit = () => {
    if (response.trim().length < 10) return;
    const eval_ = evaluateTeachBack(selectedSubject, selectedChapter, selectedTopic || selectedChapter, response);
    setEvaluation(eval_);
    saveTeachBackSession({
      subject: selectedSubject,
      chapter: selectedChapter,
      topic: selectedTopic || selectedChapter,
      studentResponse: response,
      evaluation: eval_,
    });
    setPhase('result');
  };

  const handleReset = () => {
    setPhase('select');
    setResponse('');
    setEvaluation(null);
    setSelectedTopic('');
  };

  const understandingConfig = {
    Strong: { color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: CheckCircle2 },
    Developing: { color: 'text-amber-600', bg: 'bg-amber-50', Icon: Lightbulb },
    'Needs Review': { color: 'text-rose-600', bg: 'bg-rose-50', Icon: AlertCircle },
  };

  if (!profile) return null;

  return (
    <AppShell title="Teach It Back" subtitle="Explain a concept in your own words. We will evaluate your understanding.">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Phase: Select topic */}
        {phase === 'select' && (
          <Card className="border-slate-200 p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">Choose a topic to teach back</h3>
            </div>

            <div className="space-y-5">
              {/* Subject */}
              <div>
                <Label className="mb-2 block text-sm font-medium text-slate-700">Subject</Label>
                <div className="flex flex-wrap gap-2">
                  {profile.selectedSubjects.map((subjId) => {
                    const info = SUBJECT_INFOS.find((s) => s.id === subjId);
                    return (
                      <button
                        key={subjId}
                        onClick={() => { setSelectedSubject(subjId); setSelectedChapter(''); setSelectedTopic(''); }}
                        className={cn(
                          'rounded-xl border px-4 py-2 text-sm font-medium transition',
                          selectedSubject === subjId
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-200 text-slate-600 hover:border-indigo-300',
                        )}
                      >
                        {info?.emoji} {info?.label ?? subjId}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chapter */}
              {chapters.length > 0 && (
                <div>
                  <Label className="mb-2 block text-sm font-medium text-slate-700">Chapter</Label>
                  <div className="flex flex-wrap gap-2">
                    {chapters.map((ch) => (
                      <button
                        key={ch.name}
                        onClick={() => { setSelectedChapter(ch.name); setSelectedTopic(''); }}
                        className={cn(
                          'rounded-xl border px-3 py-1.5 text-sm transition',
                          selectedChapter === ch.name
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 text-slate-600 hover:border-indigo-300',
                        )}
                      >
                        {ch.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Topic */}
              {topics.length > 0 && (
                <div>
                  <Label className="mb-2 block text-sm font-medium text-slate-700">Topic (optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTopic(t)}
                        className={cn(
                          'rounded-xl border px-3 py-1 text-sm transition',
                          selectedTopic === t
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 text-slate-600 hover:border-indigo-300',
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleStartExplain}
              disabled={!selectedChapter}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700"
            >
              Start Teaching
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
        )}

        {/* Phase: Explain */}
        {phase === 'explain' && (
          <Card className="border-slate-200 p-6 shadow-sm">
            <div className="mb-4 rounded-xl bg-indigo-50/60 px-4 py-3">
              <p className="text-sm font-medium text-indigo-700">
                {selectedSubject} → {selectedChapter}{selectedTopic ? ` → ${selectedTopic}` : ''}
              </p>
            </div>

            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Now you're the teacher.</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Explain <span className="font-medium text-slate-700">{selectedTopic || selectedChapter}</span> in your own words.
                  Don't worry about grammar — focus on the concept.
                </p>
              </div>
            </div>

            {knowledgeText && (
              <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-xs font-medium text-slate-400">Reference material available for this chapter.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="teachback">Your explanation</Label>
              <Textarea
                id="teachback"
                placeholder="Start explaining the concept here..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-slate-400">{response.trim().length} characters · minimum 10 to submit</p>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setPhase('select')} className="text-slate-500">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={response.trim().length < 10}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Send className="mr-1.5 h-4 w-4" />
                Submit Explanation
              </Button>
            </div>
          </Card>
        )}

        {/* Phase: Result */}
        {phase === 'result' && evaluation && (
          <div className="space-y-4">
            <Card className={cn('border-0 p-6 shadow-sm', understandingConfig[evaluation.understanding].bg)}>
              <div className="flex items-center gap-3">
                {(() => {
                  const { Icon, color } = understandingConfig[evaluation.understanding];
                  return <Icon className={cn('h-8 w-8', color)} />;
                })()}
                <div>
                  <p className="text-xs font-medium text-slate-500">Understanding</p>
                  <p className={cn('text-xl font-bold', understandingConfig[evaluation.understanding].color)}>
                    {evaluation.understanding}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-medium text-slate-500">Concept Coverage</p>
                  <p className={cn('text-xl font-bold', understandingConfig[evaluation.understanding].color)}>
                    {evaluation.coverageScore}%
                  </p>
                </div>
              </div>
            </Card>

            {/* What you explained well */}
            <Card className="border-emerald-100 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h4 className="text-sm font-semibold text-slate-900">What you explained well</h4>
              </div>
              <ul className="space-y-1.5">
                {evaluation.explainedWell.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 text-emerald-500">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            {/* What to improve */}
            <Card className="border-amber-100 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <h4 className="text-sm font-semibold text-slate-900">What to improve</h4>
              </div>
              <ul className="space-y-1.5">
                {evaluation.toImprove.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 text-amber-500">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            {/* One thing to remember */}
            <Card className="border-indigo-100 bg-indigo-50/30 p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                <h4 className="text-sm font-semibold text-slate-900">One thing to remember</h4>
              </div>
              <p className="text-sm text-slate-700">{evaluation.oneThingToRemember}</p>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleReset} className="bg-indigo-600 hover:bg-indigo-700">
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" className="border-slate-300" onClick={() => navigate({ name: 'feature', id: 'mock-test' })}>
                <Target className="mr-1.5 h-4 w-4" />
                Practice Question
              </Button>
              <Button variant="outline" className="border-slate-300" onClick={() => navigate({ name: 'feature', id: 'ai-tutor' })}>
                <BookOpen className="mr-1.5 h-4 w-4" />
                Review Topic
              </Button>
            </div>
          </div>
        )}

        {/* Past sessions */}
        {sessions.length > 0 && phase === 'select' && (
          <Card className="border-slate-200 p-5 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Past Teach-Back Sessions</h4>
            <div className="space-y-2">
              {sessions.slice(-3).reverse().map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{s.subject} → {s.chapter}</span>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                  <span className={cn('font-medium', understandingConfig[s.evaluation.understanding].color)}>
                    {s.evaluation.understanding}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

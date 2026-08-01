import { useState } from 'react';
import { TrendingUp, Sparkles, Flame, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
// To Do: Replace with real Gemini API Key here — analyze the PYQ PDF via Gemini.
import { predictQuestions, SUBJECTS, CHAPTERS } from '@/lib/mockData';
import type { PredictedQuestion } from '@/lib/types';

export function PYQPredictorPage() {
  const [subject, setSubject] = useState('Physics');
  const [chapter, setChapter] = useState('');
  const [questions, setQuestions] = useState<PredictedQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);

  const chapters = CHAPTERS[subject] ?? [];

  const handlePredict = () => {
    if (!chapter) return;
    setLoading(true);
    setQuestions(null);
    setTimeout(() => {
      setQuestions(predictQuestions(subject, chapter));
      setLoading(false);
    }, 1300);
  };

  return (
    <AppShell
      title="Previous Year Question Predictor"
      subtitle="Select a subject and chapter to predict the 10 most likely exam questions."
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="border-slate-200 p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={(v) => { setSubject(v); setChapter(''); setQuestions(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chapter</Label>
              <Select value={chapter} onValueChange={(v) => { setChapter(v); setQuestions(null); }}>
                <SelectTrigger><SelectValue placeholder="Select a chapter" /></SelectTrigger>
                <SelectContent>
                  {chapters.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handlePredict}
            disabled={!chapter || loading}
            className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing PYQ patterns...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Predict top 10 questions
              </>
            )}
          </Button>
        </Card>

        {questions && !loading && (
          <div className="space-y-3 animate-fade-in-up">
            <div className="flex items-center gap-2 px-1">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">Top 10 Most Likely Questions</h3>
              <span className="text-sm text-slate-400">— {subject} / {chapter}</span>
            </div>
            <div className="space-y-2.5">
              {questions.map((q, i) => (
                <Card key={q.id} className="flex items-start gap-4 border-slate-200 p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-relaxed text-slate-800">{q.question}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Flame className={cn('h-3.5 w-3.5', q.frequency >= 8 ? 'text-rose-500' : q.frequency >= 5 ? 'text-amber-500' : 'text-slate-400')} />
                      <span className={cn('text-xs font-medium',
                        q.frequency >= 8 ? 'text-rose-600' : q.frequency >= 5 ? 'text-amber-600' : 'text-slate-500')}>
                        {q.frequency >= 8 ? 'Very high probability' : q.frequency >= 5 ? 'High probability' : 'Moderate probability'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

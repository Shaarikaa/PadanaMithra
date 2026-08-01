import { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, CircleCheck as CheckCircle2, Lightbulb, RotateCcw, FileText, X, Loader as Loader2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
// To Do: Replace with real Gemini API Key here — connect image analysis to Gemini Vision.
import { generateDoubtFeedback, generateDoubtSolution } from '@/lib/mockData';

const MAX_HINT_ATTEMPTS = 3;

export function DoubtSolverPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'idle' | 'evaluating' | 'feedback' | 'solution'>('idle');
  const [feedback, setFeedback] = useState<{ status: 'correct' | 'hint'; message: string } | null>(null);
  const [solution, setSolution] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setStatus('evaluating');
      setFeedback(null);
      setSolution([]);

      setTimeout(() => {
        const nextAttempt = attempt + 1;
        setAttempt(nextAttempt);
        if (nextAttempt > MAX_HINT_ATTEMPTS) {
          setSolution(generateDoubtSolution());
          setStatus('solution');
        } else {
          setFeedback(generateDoubtFeedback(nextAttempt));
          setStatus('feedback');
        }
      }, 1800);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setImagePreview(null);
    setStatus('idle');
    setFeedback(null);
    setSolution([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const attemptsLeft = Math.max(0, MAX_HINT_ATTEMPTS - attempt);

  return (
    <AppShell
      title="Scanned Photo Doubt Solver"
      subtitle="Upload a photo of your handwritten solution. Get hints first, then the full solution."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={cn(
              'rounded-2xl border-2 border-dashed p-8 text-center transition',
              imagePreview ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/40 hover:border-indigo-300',
            )}
          >
            {!imagePreview ? (
              <div className="py-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Upload your solution</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                  Drag and drop a photo of your handwritten work, or click to browse.
                </p>
                <Button onClick={() => fileRef.current?.click()} className="mt-5 bg-indigo-600 hover:bg-indigo-700">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Choose image
                </Button>
              </div>
            ) : (
              <div className="relative">
                <img src={imagePreview} alt="Your solution" className="mx-auto max-h-80 rounded-xl object-contain" />
                {status !== 'evaluating' && (
                  <button
                    onClick={handleReset}
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-600 shadow transition hover:bg-white"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {status === 'evaluating' && (
            <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 animate-fade-in">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <div>
                <p className="font-semibold text-indigo-900">Evaluating your solution...</p>
                <p className="text-sm text-indigo-700">Analyzing each step against the syllabus.</p>
              </div>
            </div>
          )}

          {status === 'feedback' && feedback && (
            <div
              className={cn(
                'rounded-2xl border p-5 animate-pop-in',
                feedback.status === 'correct' ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70',
              )}
            >
              <div className="flex items-start gap-3">
                {feedback.status === 'correct' ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                ) : (
                  <Lightbulb className="h-6 w-6 shrink-0 text-amber-600" />
                )}
                <div className="flex-1">
                  <p className={cn('font-semibold', feedback.status === 'correct' ? 'text-emerald-900' : 'text-amber-900')}>
                    {feedback.status === 'correct' ? 'Correct!' : `Hint for attempt ${attempt}`}
                  </p>
                  <p className={cn('mt-1 text-sm', feedback.status === 'correct' ? 'text-emerald-800' : 'text-amber-800')}>
                    {feedback.message}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={handleReset} className="border-slate-300">
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Try again
                    </Button>
                    {attemptsLeft > 0 ? (
                      <span className="self-center text-xs text-slate-500">
                        {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left before full solution
                      </span>
                    ) : (
                      <span className="self-center text-xs font-medium text-amber-600">
                        Next upload shows the full step-by-step solution
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'solution' && (
            <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm animate-pop-in">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900">Full step-by-step solution</h3>
              </div>
              <p className="mb-4 text-sm text-slate-500">
                Based on the Syllabus PDF, here is the complete approach:
              </p>
              <ol className="space-y-3">
                {solution.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-slate-700">{step}</span>
                  </li>
                ))}
              </ol>
              <Button onClick={handleReset} variant="outline" className="mt-5 border-slate-300">
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Solve another doubt
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">How it works</h3>
            <ol className="mt-3 space-y-2.5 text-sm text-slate-600">
              <li className="flex gap-2"><span className="font-semibold text-indigo-600">1.</span> Upload a photo of your solution.</li>
              <li className="flex gap-2"><span className="font-semibold text-indigo-600">2.</span> Get instant feedback or a hint.</li>
              <li className="flex gap-2"><span className="font-semibold text-indigo-600">3.</span> Re-upload up to 3 times for hints.</li>
              <li className="flex gap-2"><span className="font-semibold text-indigo-600">4.</span> On the 4th attempt, see the full solution.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Attempts</h3>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-slate-500">Current</span>
              <Badge variant="secondary" className="text-sm">{attempt} / {MAX_HINT_ATTEMPTS + 1}</Badge>
            </div>
            <div className="mt-3 flex gap-1.5">
              {Array.from({ length: MAX_HINT_ATTEMPTS + 1 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-2 flex-1 rounded-full transition',
                    i < attempt ? 'bg-indigo-600' : 'bg-slate-200',
                  )}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {attemptsLeft > 0
                ? `${attemptsLeft} hint${attemptsLeft === 1 ? '' : 's'} remaining`
                : 'Full solution unlocks on next upload'}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

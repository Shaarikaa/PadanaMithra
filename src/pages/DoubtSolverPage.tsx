import { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, CircleCheck as CheckCircle2, Lightbulb, RotateCcw, FileText, X, Loader as Loader2, Calculator, Mic, Square, CircleAlert as AlertCircle, Send, ScanLine, BookOpen, AlertTriangle, ListOrdered } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { solveQuestion, identifySubject, splitMultipleQuestions, type SolveResult } from '@/lib/questionSolver';
import { useVoiceInput } from '@/hooks/useVoiceInput';

type Status = 'idle' | 'ocr-processing' | 'solving' | 'solved' | 'no-solution' | 'ocr-failed';

interface MultiSolution {
  question: string;
  result: SolveResult;
}

export function DoubtSolverPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [solution, setSolution] = useState<SolveResult | null>(null);
  const [multiSolutions, setMultiSolutions] = useState<MultiSolution[]>([]);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const voice = useVoiceInput({
    language: 'en-US',
    onTranscript: (text) => {
      setQuestionText((prev) => (prev ? prev + ' ' + text : text));
    },
  });

  const canSolve = questionText.trim().length > 0 || imagePreview !== null;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      // Automatically run OCR
      runOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runOCR = async (imageDataUrl: string) => {
    setStatus('ocr-processing');
    setOcrProgress(0);
    setOcrWarning(null);
    setSolution(null);
    setMultiSolutions([]);

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data } = await worker.recognize(imageDataUrl);
      await worker.terminate();

      const extractedText = data.text.trim();

      if (!extractedText || extractedText.length < 5) {
        setOcrWarning("I couldn't clearly read this question. Please upload a clearer image or type the question manually.");
        setStatus('idle');
        return;
      }

      // Clean up common OCR artifacts
      const cleaned = extractedText
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^\s+|\s+$/g, '')
        .trim();

      setQuestionText(cleaned);
      setStatus('idle');
    } catch {
      setOcrWarning("OCR processing failed. Please type the question manually.");
      setStatus('idle');
    }
  };

  const handleSolve = () => {
    const q = questionText.trim();
    if (!q) return;

    setStatus('solving');
    setSolution(null);
    setMultiSolutions([]);
    setOcrWarning(null);

    setTimeout(() => {
      // Check for multiple questions
      const questions = splitMultipleQuestions(q);

      if (questions.length > 1) {
        const results: MultiSolution[] = questions.map((question) => ({
          question,
          result: solveQuestion(question),
        }));
        setMultiSolutions(results);
        setStatus(results.every((r) => r.result.solved) ? 'solved' : 'no-solution');
      } else {
        const result = solveQuestion(q);
        setSolution(result);
        setStatus(result.solved ? 'solved' : 'no-solution');
      }
    }, 600);
  };

  const handleReset = () => {
    setImagePreview(null);
    setQuestionText('');
    setStatus('idle');
    setSolution(null);
    setMultiSolutions([]);
    setOcrWarning(null);
    setOcrProgress(0);
    voice.reset();
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleMicToggle = () => {
    if (voice.state === 'listening') {
      voice.stop();
    } else {
      voice.start();
    }
  };

  return (
    <AppShell
      title="Doubt Solver"
      subtitle="Upload a photo of your question, or type or speak it. I'll solve it step by step."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* Image upload */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={cn(
              'rounded-2xl border-2 border-dashed p-6 text-center transition',
              imagePreview ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/40 hover:border-indigo-300',
            )}
          >
            {!imagePreview ? (
              <div className="py-4">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <Upload className="h-7 w-7" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Upload a photo of your question</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                  I'll automatically read the text from your image and solve the question.
                </p>
                <Button onClick={() => fileRef.current?.click()} variant="outline" className="mt-4 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Choose image
                </Button>
              </div>
            ) : (
              <div className="relative">
                <img src={imagePreview} alt="Your question" className="mx-auto max-h-60 rounded-xl object-contain" />
                <button
                  onClick={() => { setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; setOcrWarning(null); }}
                  className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-600 shadow transition hover:bg-white"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
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

          {/* OCR Processing state */}
          {status === 'ocr-processing' && (
            <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 animate-fade-in">
              <ScanLine className="h-6 w-6 animate-pulse text-indigo-600" />
              <div className="flex-1">
                <p className="font-semibold text-indigo-900">Reading your question...</p>
                <p className="text-sm text-indigo-700">Extracting text from the image using OCR.</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                  <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${ocrProgress}%` }} />
                </div>
                <p className="mt-1 text-xs text-indigo-600">{ocrProgress}%</p>
              </div>
            </div>
          )}

          {/* OCR Warning */}
          {ocrWarning && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 animate-fade-in">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">{ocrWarning}</p>
                <p className="mt-1 text-xs text-amber-700">You can edit the text below and try solving again.</p>
              </div>
            </div>
          )}

          {/* Question input with mic */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">Your question</h3>
                {questionText.trim() && (
                  <Badge variant="secondary" className="text-xs">
                    {questionText.trim().length} chars
                  </Badge>
                )}
              </div>
              {voice.isSupported && (
                <div className="flex items-center gap-2">
                  {voice.state === 'listening' && (
                    <Button size="sm" variant="outline" onClick={voice.stop} className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50">
                      <Square className="mr-1.5 h-3.5 w-3.5" />
                      Stop
                    </Button>
                  )}
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
                      <>
                        <span className="mr-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
                        Listening...
                      </>
                    ) : voice.state === 'processing' ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Mic className="mr-1.5 h-3.5 w-3.5" />
                        Speak
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <Textarea
              placeholder="Type your question, or upload an image above and I'll extract the text automatically..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="resize-none"
            />

            {voice.error && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                <AlertCircle className="h-3.5 w-3.5" />
                {voice.error}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {imagePreview && !questionText.trim() ? 'Image uploaded — ready to solve' : `${questionText.trim().length} characters`}
              </p>
              <Button
                onClick={handleSolve}
                disabled={!canSolve || status === 'solving' || status === 'ocr-processing'}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {status === 'solving' ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Solving...
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-4 w-4" />
                    Solve Question
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Solving state */}
          {status === 'solving' && (
            <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 animate-fade-in">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <div>
                <p className="font-semibold text-indigo-900">Solving your question...</p>
                <p className="text-sm text-indigo-700">Extracting given values, identifying the formula, and calculating the answer.</p>
              </div>
            </div>
          )}

          {/* Single solution display */}
          {status === 'solved' && solution && multiSolutions.length === 0 && (
            <SolutionDisplay solution={solution} onReset={handleReset} />
          )}

          {/* Multi-question solution display */}
          {multiSolutions.length > 1 && (status === 'solved' || status === 'no-solution') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-indigo-50 p-3">
                <ListOrdered className="h-5 w-5 text-indigo-600" />
                <p className="text-sm font-medium text-indigo-900">
                  {multiSolutions.length} questions detected — each solved separately below.
                </p>
              </div>
              {multiSolutions.map((ms, i) => (
                <div key={i}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium text-slate-700">{ms.question}</p>
                  </div>
                  {ms.result.solved ? (
                    <SolutionDisplay solution={ms.result} onReset={undefined} />
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                      <p className="text-sm text-amber-800">{ms.result.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
              <Button onClick={handleReset} variant="outline" className="border-slate-300">
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Solve another question
              </Button>
            </div>
          )}

          {/* No solution found */}
          {status === 'no-solution' && !solution && multiSolutions.length === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 animate-pop-in">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-6 w-6 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">I couldn't solve this specific question</p>
                  <p className="mt-1 text-sm text-amber-800">
                    I can solve numerical problems (velocity, speed, acceleration, force, Ohm's law, Pythagoras, energy, density, pH, pressure) and answer conceptual questions about Physics, Chemistry, Biology, and Mathematics. Please make sure your question is clear.
                  </p>
                  <Button onClick={handleReset} variant="outline" size="sm" className="mt-4 border-amber-200 text-amber-700 hover:bg-amber-100">
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Try another question
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">How it works</h3>
            <ol className="mt-3 space-y-2.5 text-sm text-slate-600">
              <li className="flex gap-2"><span className="font-semibold text-indigo-600">1.</span> Upload a photo of your question.</li>
              <li className="flex gap-2"><span className="font-semibold text-indigo-600">2.</span> I automatically read the text using OCR.</li>
              <li className="flex gap-2"><span className="font-semibold text-indigo-600">3.</span> Edit the extracted text if needed.</li>
              <li className="flex gap-2"><span className="font-semibold text-indigo-600">4.</span> Click Solve Question.</li>
              <li className="flex gap-2"><span className="font-semibold text-indigo-600">5.</span> I identify the formula and solve step by step.</li>
              <li className="flex gap-2"><span className="font-semibold text-indigo-600">6.</span> You get the answer with a clear explanation.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Supported Topics</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Velocity', 'Speed', 'Acceleration', 'Force (F=ma)', 'Weight', "Ohm's Law", 'Pythagoras', 'Kinetic Energy', 'Potential Energy', 'Density', 'pH Scale', 'Pressure', 'Photosynthesis', 'Cell', 'Atoms', 'Newton\'s Laws', 'Sound', 'Light'].map((topic) => (
                <span key={topic} className="rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
            <h3 className="text-sm font-semibold text-indigo-900">Try these examples</h3>
            <div className="mt-3 space-y-2">
              {[
                'Calculate the velocity of a car that travels 100 m in 20 seconds.',
                'A 2 kg object accelerates at 5 m/s². What force is applied?',
                'Why does ice float on water?',
                'Why does sound need a medium to travel?',
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setQuestionText(ex)}
                  className="block w-full rounded-lg border border-indigo-100 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SolutionDisplay({ solution, onReset }: { solution: SolveResult; onReset?: () => void }) {
  return (
    <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm animate-pop-in">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-900">
            {solution.isConceptual ? 'Answer & Explanation' : 'Step-by-Step Solution'}
          </h3>
        </div>
        {solution.subject && (
          <Badge variant="secondary" className="text-xs">
            {solution.subject} · {solution.chapter}
          </Badge>
        )}
      </div>

      <ol className="space-y-3">
        {solution.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-indigo-600">{step.label}</p>
              <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">{step.content}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Answer highlight */}
      <div className="mt-4 rounded-xl bg-emerald-50 p-4">
        <p className="text-xs font-semibold text-emerald-700">
          {solution.isConceptual ? 'Key Answer' : 'Final Answer'}
        </p>
        <p className="mt-1 text-base font-bold text-emerald-800">{solution.answer}</p>
      </div>

      {/* Explanation */}
      {!solution.isConceptual && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <div className="mb-1 flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-slate-600">Why this works</p>
          </div>
          <p className="text-sm text-slate-700">{solution.explanation}</p>
        </div>
      )}

      {onReset && (
        <Button onClick={onReset} variant="outline" className="mt-5 border-slate-300">
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Solve another question
        </Button>
      )}
    </div>
  );
}

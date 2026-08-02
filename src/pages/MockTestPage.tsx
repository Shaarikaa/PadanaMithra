import { useEffect, useState } from 'react';
import { Timer, CircleCheck as CheckCircle2, Circle as XCircle, ArrowRight, RotateCcw, Award, CircleAlert as AlertCircle, Target, Lightbulb, Brain, CircleHelp as HelpCircle } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/AppContext';
import { generateMockQuestions } from '@/lib/mockData';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';
import { recordAnswer, detectMisconception, explainWrongAnswer, generateSimilarQuestion, type MisconceptionResult, type WrongAnswerExplanation } from '@/lib/learningEngine';
import type { MockQuestion } from '@/lib/types';

const DURATION = 600;

// Metadata map: question ID -> { subject, chapter, topic }
const QUESTION_META: Record<string, { subject: string; chapter: string; topic: string }> = {
  q1: { subject: 'Physics', chapter: 'Motion', topic: 'Acceleration' },
  q2: { subject: 'Physics', chapter: 'Laws of Motion', topic: "Second Law (F=ma)" },
  q3: { subject: 'Physics', chapter: 'Motion', topic: 'Speed & Velocity' },
  q4: { subject: 'Chemistry', chapter: 'Acids & Bases', topic: 'pH Scale' },
  q5: { subject: 'Chemistry', chapter: 'Chemical Reactions', topic: 'Types of Reactions' },
  q6: { subject: 'Chemistry', chapter: 'Atoms & Molecules', topic: 'Atomic Structure' },
  q7: { subject: 'Mathematics', chapter: 'Trigonometry', topic: 'Trigonometric Ratios' },
  q8: { subject: 'Mathematics', chapter: 'Triangles', topic: 'Pythagoras Theorem' },
  q9: { subject: 'Biology', chapter: 'Cell', topic: 'Organelles' },
  q10: { subject: 'Biology', chapter: 'Life Processes', topic: 'Nutrition' },
};

type Phase = 'intro' | 'active' | 'result';

export function MockTestPage() {
  const { profile } = useApp();
  const [phase, setPhase] = useState<Phase>('intro');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [questions] = useState<MockQuestion[]>(() => generateMockQuestions());

  useEffect(() => {
    if (phase !== 'active') return;
    if (timeLeft <= 0) {
      setPhase('result');
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  const score = questions.reduce(
    (acc, q) => acc + (answers[q.id] === q.answerIndex ? 1 : 0),
    0,
  );

  const handleFinish = () => {
    // Record every answer to the learning engine
    for (const q of questions) {
      const meta = QUESTION_META[q.id] ?? { subject: 'Physics', chapter: 'Motion', topic: '' };
      const selected = answers[q.id];
      const isCorrect = selected === q.answerIndex;
      if (selected !== undefined) {
        recordAnswer({
          questionId: q.id,
          subject: meta.subject,
          chapter: meta.chapter,
          topic: meta.topic,
          question: q.question,
          selectedOption: selected,
          correctOption: q.answerIndex,
          isCorrect,
        });
      }
    }
    const scores = loadJSON<number[]>(STORAGE_KEYS.mockTestScores, []);
    scores.push(score);
    saveJSON(STORAGE_KEYS.mockTestScores, scores);

    saveJSON(STORAGE_KEYS.mockTestScores, scores);
    setPhase('result');
  };

  const handleRestart = () => {
    setPhase('intro');
    setCurrent(0);
    setAnswers({});
    setTimeLeft(DURATION);
  };

  const startTest = () => {
    setPhase('active');
    setTimeLeft(DURATION);
    setAnswers({});
    setCurrent(0);
  };

  const mm = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const ss = (timeLeft % 60).toString().padStart(2, '0');
  const progress = ((current + 1) / questions.length) * 100;

  if (phase === 'intro') {
    return (
      <AppShell title="Free Mock Test" subtitle="10 MCQs from the syllabus. You have 10 minutes.">
        <div className="mx-auto max-w-lg">
          {profile?.currentSubject && profile?.currentChapter && (
            <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm">
              <Target className="h-4 w-4 text-indigo-600" />
              <span className="font-medium text-indigo-700">{profile.classLevel} {profile.currentSubject}</span>
              <span className="text-slate-400">•</span>
              <span className="font-semibold text-slate-800">{profile.currentChapter}</span>
            </div>
          )}
          <Card className="overflow-hidden border-slate-200 p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Timer className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Ready to test yourself?</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              {questions.length} multiple-choice questions covering Physics, Chemistry, Maths and Biology.
              The timer starts as soon as you begin.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-lg font-bold text-indigo-600">{questions.length}</p>
                <p className="text-xs text-slate-500">Questions</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-lg font-bold text-indigo-600">10:00</p>
                <p className="text-xs text-slate-500">Minutes</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-lg font-bold text-indigo-600">MCQ</p>
                <p className="text-xs text-slate-500">Format</p>
              </div>
            </div>
            <Button onClick={startTest} className="mt-6 w-full bg-indigo-600 text-base hover:bg-indigo-700">
              Start test
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (phase === 'result') {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <AppShell title="Mock Test Results" subtitle="Here is how you did.">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className={cn('p-8 text-center', pct >= 70 ? 'bg-emerald-50' : pct >= 40 ? 'bg-amber-50' : 'bg-rose-50')}>
              <div className={cn('mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-white',
                pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500')}>
                <Award className="h-10 w-10" />
              </div>
              <p className="text-4xl font-bold text-slate-900">{score}<span className="text-2xl text-slate-400">/{questions.length}</span></p>
              <p className="mt-1 text-sm font-medium text-slate-600">{pct}% correct</p>
              <p className="mt-2 text-sm text-slate-500">
                {pct >= 70 ? 'Excellent work! You are well prepared.' : pct >= 40 ? 'Good effort. Review the explanations below.' : 'Keep practicing — review the topics and try again.'}
              </p>
            </div>
          </Card>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Review answers</h3>
            {questions.map((q, i) => {
              const userAns = answers[q.id];
              const correct = userAns === q.answerIndex;
              const meta = QUESTION_META[q.id] ?? { subject: '', chapter: '', topic: '' };
              return (
                <ReviewCard
                  key={q.id}
                  index={i}
                  question={q}
                  userAns={userAns}
                  correct={correct}
                  meta={meta}
                />
              );
            })}
          </div>

          <Button onClick={handleRestart} className="w-full bg-indigo-600 hover:bg-indigo-700">
            <RotateCcw className="mr-2 h-4 w-4" />
            Take another test
          </Button>
        </div>
      </AppShell>
    );
  }

  const q = questions[current];
  const lowTime = timeLeft <= 60;

  return (
    <AppShell title="Mock Test" subtitle="Choose the best answer for each question.">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className={cn('flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-lg font-bold tabular-nums',
            lowTime ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600')}>
            <Timer className="h-5 w-5" />
            {mm}:{ss}
          </div>
          <span className="text-sm font-medium text-slate-500">
            Question {current + 1} of {questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />

        {lowTime && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
            <AlertCircle className="h-4 w-4" />
            Less than a minute left!
          </div>
        )}

        <Card className="border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{q.question}</h3>
          <RadioGroup
            value={answers[q.id] !== undefined ? String(answers[q.id]) : ''}
            onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: Number(v) }))}
            className="mt-5 space-y-3"
          >
            {q.options.map((opt, i) => (
              <div key={i}>
                <Label
                  htmlFor={`${q.id}-${i}`}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition',
                    answers[q.id] === i
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50',
                  )}
                >
                  <RadioGroupItem value={String(i)} id={`${q.id}-${i}`} className="border-indigo-300 text-indigo-600" />
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={current === 0}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            className="border-slate-300"
          >
            Previous
          </Button>
          <div className="flex flex-wrap justify-center gap-1.5">
            {questions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setCurrent(i)}
                className={cn(
                  'h-7 w-7 rounded-md text-xs font-medium transition',
                  i === current ? 'bg-indigo-600 text-white' : answers[qq.id] !== undefined ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {current === questions.length - 1 ? (
            <Button onClick={handleFinish} className="bg-emerald-600 hover:bg-emerald-700">
              Finish
            </Button>
          ) : (
            <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} className="bg-indigo-600 hover:bg-indigo-700">
              Next
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* ---- Review Card with Misconception Detection + Why Did I Get This Wrong ---- */

function ReviewCard({
  index,
  question,
  userAns,
  correct,
  meta,
}: {
  index: number;
  question: MockQuestion;
  userAns: number | undefined;
  correct: boolean;
  meta: { subject: string; chapter: string; topic: string };
}) {
  const [showWhy, setShowWhy] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarQ, setSimilarQ] = useState<string | null>(null);

  const misconception: MisconceptionResult = !correct && userAns !== undefined
    ? detectMisconception(question.question)
    : { detected: false, description: '', confidence: 'possible' };

  const handleWhy = () => {
    setShowWhy(!showWhy);
    if (!showSimilar) {
      const similar = generateSimilarQuestion(question.question, meta.chapter);
      setSimilarQ(similar);
    }
  };

  const explanation: WrongAnswerExplanation | null = !correct && userAns !== undefined
    ? explainWrongAnswer(
        question.question,
        question.options[userAns],
        question.options[question.answerIndex],
        question.explanation,
        meta.chapter,
      )
    : null;

  return (
    <Card className="border-slate-200 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {correct ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">{index + 1}. {question.question}</p>
          {meta.subject && (
            <p className="mt-0.5 text-xs text-slate-400">{meta.subject} → {meta.chapter}{meta.topic ? ` → ${meta.topic}` : ''}</p>
          )}
          <p className="mt-1.5 text-sm text-slate-600">
            Correct: <span className="font-medium text-emerald-700">{question.options[question.answerIndex]}</span>
          </p>
          {!correct && userAns !== undefined && (
            <p className="text-sm text-slate-600">
              Your answer: <span className="font-medium text-rose-700">{question.options[userAns]}</span>
            </p>
          )}
          {userAns === undefined && (
            <p className="text-sm text-slate-400">Not answered</p>
          )}
          <p className="mt-1.5 rounded-md bg-slate-50 p-2 text-xs text-slate-500">{question.explanation}</p>

          {/* Misconception detection */}
          {misconception.detected && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">
                  {misconception.confidence === 'likely' ? 'Concept Gap Detected' : 'Possible Misconception'}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-amber-700">{misconception.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={handleWhy}>
                  <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
                  Why did I get this wrong?
                </Button>
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => setShowSimilar(!showSimilar)}>
                  <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
                  Try a similar question
                </Button>
              </div>
            </div>
          )}

          {/* Why did I get this wrong - for incorrect answers without detected misconception */}
          {!correct && userAns !== undefined && !misconception.detected && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-indigo-600 hover:bg-indigo-50"
              onClick={handleWhy}
            >
              <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
              Why did I get this wrong?
            </Button>
          )}

          {/* Why explanation */}
          {showWhy && explanation && (
            <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 animate-fade-in">
              <p className="text-xs font-semibold text-indigo-700">1. What you attempted</p>
              <p className="mt-0.5 text-sm text-slate-700">{explanation.whatYouTried}</p>

              <p className="mt-3 text-xs font-semibold text-indigo-700">2. Where the reasoning went wrong</p>
              <p className="mt-0.5 text-sm text-slate-700">{explanation.whereItWentWrong}</p>

              <p className="mt-3 text-xs font-semibold text-indigo-700">3. Relevant concept</p>
              <p className="mt-0.5 text-sm text-slate-700">{explanation.relevantConcept}</p>

              <p className="mt-3 text-xs font-semibold text-indigo-700">4. Simple explanation</p>
              <p className="mt-0.5 text-sm text-slate-700">{explanation.simpleExplanation}</p>

              <p className="mt-3 text-xs font-semibold text-indigo-700">5. Try a similar question</p>
              <p className="mt-0.5 rounded-lg bg-white/60 p-2 text-sm text-slate-700">{explanation.similarQuestion}</p>
            </div>
          )}

          {/* Similar question */}
          {showSimilar && similarQ && (
            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 animate-fade-in">
              <p className="text-xs font-semibold text-emerald-700">Similar practice question</p>
              <p className="mt-1 text-sm text-slate-700">{similarQ}</p>
            </div>
          )}

        </div>
      </div>
    </Card>
  );
}

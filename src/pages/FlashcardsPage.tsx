import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Layers, Check, Target } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/AppContext';
import { FLASHCARDS } from '@/lib/mockData';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';

export function FlashcardsPage() {
  const { profile } = useApp();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(() => {
    const saved = loadJSON<string[]>(STORAGE_KEYS.flashcardProgress, []);
    return new Set(saved);
  });

  // Filter flashcards by the student's selected subjects when available.
  const cards = useMemo(() => {
    if (!profile?.selectedSubjects || profile.selectedSubjects.length === 0) return FLASHCARDS;
    const filtered = FLASHCARDS.filter((c) =>
      profile.selectedSubjects.some((s) => c.front.toLowerCase().includes(s.toLowerCase()) || c.back.toLowerCase().includes(s.toLowerCase())),
    );
    return filtered.length > 0 ? filtered : FLASHCARDS;
  }, [profile]);

  const card = cards[index];
  const total = cards.length;
  const progress = ((index + 1) / total) * 100;
  const knownCount = known.size;

  const goNext = () => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => (i + 1) % total), 150);
  };
  const goPrev = () => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => (i - 1 + total) % total), 150);
  };

  const markKnown = () => {
    const next = new Set(known);
    next.add(card.id);
    setKnown(next);
    saveJSON(STORAGE_KEYS.flashcardProgress, Array.from(next));
    goNext();
  };

  const reset = () => {
    setKnown(new Set());
    saveJSON(STORAGE_KEYS.flashcardProgress, []);
    setIndex(0);
    setFlipped(false);
  };

  const firstName = profile?.fullName?.split(' ')[0] ?? 'Student';

  return (
    <AppShell
      title="1-Minute Revision Flashcards"
      subtitle="Tap a card to flip it. Swipe through to revise fast — pulled from PYQ PDFs."
    >
      <div className="mx-auto max-w-xl space-y-6">
        {/* Personalized recommendation banner */}
        {profile?.currentSubject && (
          <Card className="flex items-center gap-3 border-indigo-100 bg-indigo-50/40 p-4 shadow-sm">
            <Target className="h-5 w-5 shrink-0 text-indigo-600" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-slate-900">Today's Revision for {firstName}</p>
              <p className="text-slate-600">
                {profile.currentSubject} — {profile.currentChapter} · {total} cards ready
              </p>
            </div>
          </Card>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Card {index + 1} of {total}</span>
          <span className="text-slate-500">{knownCount} known</span>
        </div>
        <Progress value={progress} className="h-1.5" />

        <div className="flashcard-container h-72 select-none">
          <div
            className={cn('flashcard h-full w-full cursor-pointer', flipped && 'flipped')}
            onClick={() => setFlipped((f) => !f)}
          >
            <div className="flashcard-face flex h-full w-full flex-col items-center justify-center rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-center text-white shadow-xl shadow-indigo-200/50">
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Layers className="h-3.5 w-3.5" />
                Question
              </span>
              <p className="text-xl font-semibold leading-snug sm:text-2xl">{card.front}</p>
              <p className="mt-6 text-xs text-indigo-200">Tap to reveal answer</p>
            </div>
            <div className="flashcard-face flashcard-back flex h-full w-full flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                Answer
              </span>
              <p className="text-lg font-medium leading-relaxed text-slate-800">{card.back}</p>
              <p className="mt-6 text-xs text-slate-400">Tap to flip back</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={goPrev} className="border-slate-300 px-3">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 flex-col items-center gap-2">
            <Button onClick={() => setFlipped((f) => !f)} variant="secondary" className="w-full max-w-xs">
              {flipped ? 'Show question' : 'Reveal answer'}
            </Button>
            <Button onClick={markKnown} variant="outline" className="w-full max-w-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              <Check className="mr-1.5 h-4 w-4" />
              I know this
            </Button>
          </div>
          <Button variant="outline" onClick={goNext} className="border-slate-300 px-3">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm">
            <p className="font-medium text-slate-900">{knownCount} / {total} mastered</p>
            <p className="text-xs text-slate-500">Progress saved automatically</p>
          </div>
          <Button size="sm" variant="ghost" onClick={reset} className="text-slate-500">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

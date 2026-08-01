import { useState } from 'react';
import { Lock, FileText, Download, Star } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UpgradeModal } from '@/components/UpgradeModal';

interface ProNote {
  id: string;
  title: string;
  author: string;
  subject: string;
  pages: number;
  rating: number;
  accent: string;
}

const NOTES: ProNote[] = [
  { id: 'n1', title: 'Complete Physics Formula Sheet', author: 'Mr. Suresh Nair', subject: 'Physics', pages: 24, rating: 4.9, accent: 'bg-indigo-100 text-indigo-600' },
  { id: 'n2', title: 'Chemistry Reactions — Master Notes', author: 'Ms. Lakshmi R.', subject: 'Chemistry', pages: 38, rating: 4.8, accent: 'bg-rose-100 text-rose-600' },
  { id: 'n3', title: 'Mathematics — Solved PYQ Bank', author: 'Mr. Aravind Krishnan', subject: 'Mathematics', pages: 52, rating: 5.0, accent: 'bg-emerald-100 text-emerald-600' },
  { id: 'n4', title: 'Biology Diagrams & Labels', author: 'Dr. Priya Menon', subject: 'Biology', pages: 30, rating: 4.7, accent: 'bg-teal-100 text-teal-600' },
  { id: 'n5', title: 'Social Science — One-Shot Revision', author: 'Mr. Vinod Das', subject: 'Social Science', pages: 18, rating: 4.6, accent: 'bg-amber-100 text-amber-600' },
  { id: 'n6', title: 'English Grammar Quick Reference', author: 'Ms. Reshma Joseph', subject: 'English', pages: 16, rating: 4.5, accent: 'bg-violet-100 text-violet-600' },
];

export function ProNotesPage() {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const handleClick = (note: ProNote) => {
    setSelected(note.title);
    setUpgradeOpen(true);
  };

  return (
    <AppShell
      title="Notes by Professionals"
      subtitle="Curated PDF notes written by expert teachers. Upgrade to Pro to download."
    >
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
        <Lock className="h-4 w-4 shrink-0" />
        These notes are created by experienced teachers. Upgrade to Pro to access them all.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NOTES.map((note, i) => (
          <Card
            key={note.id}
            className="group cursor-pointer overflow-hidden border-slate-200 p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg animate-fade-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
            onClick={() => handleClick(note)}
          >
            <div className="mb-4 flex items-start justify-between">
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${note.accent}`}>
                <FileText className="h-6 w-6" />
              </span>
              <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-400 hover:to-orange-500">
                PRO
              </Badge>
            </div>
            <h3 className="text-sm font-semibold leading-snug text-slate-900">{note.title}</h3>
            <p className="mt-1 text-xs text-slate-500">by {note.author}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
              <span className={`rounded-md px-2 py-0.5 font-medium ${note.accent}`}>{note.subject}</span>
              <span>{note.pages} pages</span>
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {note.rating}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              <span>Tap to unlock</span>
              <Download className="ml-auto h-4 w-4 opacity-50" />
            </div>
          </Card>
        ))}
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} featureName={selected ?? undefined} />
    </AppShell>
  );
}

import { useState, useMemo } from 'react';
import { Lock, Play, Clock, Video } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useApp } from '@/lib/AppContext';

interface VideoClass {
  id: string;
  title: string;
  teacher: string;
  duration: string;
  subject: string;
  accent: string;
}

const VIDEOS: VideoClass[] = [
  { id: 'v1', title: 'Motion — Equations & Numericals', teacher: 'Mr. Suresh Nair', duration: '42 min', subject: 'Physics', accent: 'bg-indigo-100 text-indigo-600' },
  { id: 'v2', title: 'Chemical Reactions — Balancing Made Easy', teacher: 'Ms. Lakshmi R.', duration: '38 min', subject: 'Chemistry', accent: 'bg-rose-100 text-rose-600' },
  { id: 'v3', title: 'Trigonometry — From Basics to Advanced', teacher: 'Mr. Aravind Krishnan', duration: '51 min', subject: 'Mathematics', accent: 'bg-emerald-100 text-emerald-600' },
  { id: 'v4', title: 'Cell — Structure & Function', teacher: 'Dr. Priya Menon', duration: '35 min', subject: 'Biology', accent: 'bg-teal-100 text-teal-600' },
  { id: 'v5', title: 'Electricity — Circuits & Ohms Law', teacher: 'Mr. Suresh Nair', duration: '44 min', subject: 'Physics', accent: 'bg-indigo-100 text-indigo-600' },
  { id: 'v6', title: 'Periodic Table — Trends Explained', teacher: 'Ms. Lakshmi R.', duration: '40 min', subject: 'Chemistry', accent: 'bg-rose-100 text-rose-600' },
];

export function VideoClassesPage() {
  const { profile } = useApp();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // Sort videos to prioritize the student's selected subjects first.
  const sortedVideos = useMemo(() => {
    if (!profile?.selectedSubjects || profile.selectedSubjects.length === 0) return VIDEOS;
    return [...VIDEOS].sort((a, b) => {
      const aSelected = profile.selectedSubjects.includes(a.subject) ? 0 : 1;
      const bSelected = profile.selectedSubjects.includes(b.subject) ? 0 : 1;
      return aSelected - bSelected;
    });
  }, [profile]);

  const handleClick = (v: VideoClass) => {
    setSelected(v.title);
    setUpgradeOpen(true);
  };

  return (
    <AppShell
      title="Recorded Video Classes"
      subtitle="Expert video lessons for every chapter. Upgrade to Pro to watch them all."
    >
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
        <Lock className="h-4 w-4 shrink-0" />
        All videos are locked. Upgrade to Pro to unlock unlimited streaming.
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sortedVideos.map((v, i) => (
          <Card
            key={v.id}
            className="group cursor-pointer overflow-hidden border-slate-200 shadow-sm transition hover:-translate-y-1 hover:shadow-lg animate-fade-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
            onClick={() => handleClick(v)}
          >
            <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition group-hover:scale-110 group-hover:bg-white/25">
                <Play className="h-6 w-6 fill-white" />
              </span>
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] transition group-hover:bg-slate-900/50">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Lock className="h-6 w-6" />
                  <span className="text-xs font-medium">Locked</span>
                </div>
              </div>
              <Badge className="absolute right-3 top-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-400 hover:to-orange-500">
                PRO
              </Badge>
              <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                <Clock className="h-3 w-3" />
                {v.duration}
              </span>
            </div>
            <div className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${v.accent}`}>
                  <Video className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-medium text-slate-500">{v.subject}</span>
              </div>
              <h3 className="text-sm font-semibold leading-snug text-slate-900">{v.title}</h3>
              <p className="mt-1 text-xs text-slate-500">by {v.teacher}</p>
            </div>
          </Card>
        ))}
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} featureName={selected ?? undefined} />
    </AppShell>
  );
}

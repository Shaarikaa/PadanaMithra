import { useState, useMemo } from 'react';
import { Lock, Clock, Video, CalendarDays, Radio, Users, Crown, PlayCircle, Bell } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useApp } from '@/lib/AppContext';

interface LiveClass {
  id: string;
  title: string;
  teacher: string;
  subject: string;
  scheduledTime: string;
  durationMin: number;
  status: 'live' | 'upcoming';
  accent: string;
}

const CLASSES: LiveClass[] = [
  { id: 'c1', title: 'Motion — Equations & Numericals', teacher: 'Mr. Suresh Nair', subject: 'Physics', scheduledTime: 'Today, 4:00 PM', durationMin: 45, status: 'live', accent: 'bg-indigo-100 text-indigo-600' },
  { id: 'c2', title: 'Chemical Reactions — Balancing Made Easy', teacher: 'Ms. Lakshmi R.', subject: 'Chemistry', scheduledTime: 'Today, 6:30 PM', durationMin: 40, status: 'upcoming', accent: 'bg-rose-100 text-rose-600' },
  { id: 'c3', title: 'Trigonometry — From Basics to Advanced', teacher: 'Mr. Aravind Krishnan', subject: 'Mathematics', scheduledTime: 'Tomorrow, 10:00 AM', durationMin: 50, status: 'upcoming', accent: 'bg-emerald-100 text-emerald-600' },
  { id: 'c4', title: 'Cell — Structure & Function', teacher: 'Dr. Priya Menon', subject: 'Biology', scheduledTime: 'Tomorrow, 2:00 PM', durationMin: 35, status: 'upcoming', accent: 'bg-teal-100 text-teal-600' },
  { id: 'c5', title: 'Electricity — Circuits & Ohms Law', teacher: 'Mr. Suresh Nair', subject: 'Physics', scheduledTime: 'Sat, 11:00 AM', durationMin: 45, status: 'upcoming', accent: 'bg-indigo-100 text-indigo-600' },
  { id: 'c6', title: 'Periodic Table — Trends Explained', teacher: 'Ms. Lakshmi R.', subject: 'Chemistry', scheduledTime: 'Sun, 9:30 AM', durationMin: 40, status: 'upcoming', accent: 'bg-rose-100 text-rose-600' },
];

export function VideoClassesPage() {
  const { profile, isPremium } = useApp();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const sortedClasses = useMemo(() => {
    const live = CLASSES.filter((c) => c.status === 'live');
    const upcoming = CLASSES.filter((c) => c.status === 'upcoming');
    if (!profile?.selectedSubjects || profile.selectedSubjects.length === 0) {
      return [...live, ...upcoming];
    }
    const bySubject = (a: LiveClass, b: LiveClass) => {
      const aSel = profile.selectedSubjects!.includes(a.subject) ? 0 : 1;
      const bSel = profile.selectedSubjects!.includes(b.subject) ? 0 : 1;
      return aSel - bSel;
    };
    return [...live, ...upcoming.sort(bySubject)];
  }, [profile]);

  const handleJoin = (c: LiveClass) => {
    setSelected(c.title);
    if (!isPremium) {
      setUpgradeOpen(true);
      return;
    }
    setUpgradeOpen(true);
  };

  const liveClasses = sortedClasses.filter((c) => c.status === 'live');
  const upcomingClasses = sortedClasses.filter((c) => c.status === 'upcoming');

  return (
    <AppShell
      title="Live Video Classes"
      subtitle="Join scheduled live classes with your teachers — interactive and in real time."
    >
      {!isPremium && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
          <Crown className="h-4 w-4 shrink-0" />
          Live Video Classes are a Pro feature. Upgrade to join live sessions and interact with your teachers.
        </div>
      )}

      {liveClasses.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Radio className="h-5 w-5 text-rose-600" />
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Live Now</h2>
            <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
              LIVE
            </span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {liveClasses.map((c) => (
              <LiveClassCard key={c.id} cls={c} isPremium={isPremium} onJoin={() => handleJoin(c)} index={0} />
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Upcoming Classes</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {upcomingClasses.map((c, i) => (
          <LiveClassCard key={c.id} cls={c} isPremium={isPremium} onJoin={() => handleJoin(c)} index={i} />
        ))}
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} featureName={selected ?? undefined} />
    </AppShell>
  );
}

function LiveClassCard({
  cls,
  isPremium,
  onJoin,
  index,
}: {
  cls: LiveClass;
  isPremium: boolean;
  onJoin: () => void;
  index: number;
}) {
  const isLive = cls.status === 'live';
  return (
    <Card
      className="group overflow-hidden border-slate-200 shadow-sm transition hover:-translate-y-1 hover:shadow-lg animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition group-hover:scale-110 group-hover:bg-white/25">
          <Video className="h-5 w-5" />
        </span>
        {isLive && (
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            LIVE NOW
          </div>
        )}
        {!isPremium && (
          <div className="absolute right-3 top-3">
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-400 hover:to-orange-500">
              PRO
            </Badge>
          </div>
        )}
        <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          <Clock className="h-3 w-3" />
          {cls.durationMin} min
        </span>
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${cls.accent}`}>
            <Video className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-medium text-slate-500">{cls.subject}</span>
        </div>
        <h3 className="text-sm font-semibold leading-snug text-slate-900">{cls.title}</h3>
        <p className="mt-1 text-xs text-slate-500">by {cls.teacher}</p>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          {cls.scheduledTime}
        </div>
        <div className="mt-4">
          {isPremium ? (
            isLive ? (
              <Button onClick={onJoin} className="w-full bg-rose-600 hover:bg-rose-700" size="sm">
                <PlayCircle className="mr-1.5 h-4 w-4" />
                Join Live Class
              </Button>
            ) : (
              <Button onClick={onJoin} variant="outline" className="w-full" size="sm">
                <Bell className="mr-1.5 h-4 w-4" />
                Remind Me
              </Button>
            )
          ) : (
            <Button onClick={onJoin} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" size="sm">
              <Lock className="mr-1.5 h-3.5 w-3.5" />
              {isLive ? 'Unlock to Join' : 'Upgrade to Join'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

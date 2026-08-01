import { Lock, Calendar, User, MessageSquareHeart, Clock } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProBadge } from '@/components/UpgradeModal';

const MENTORS = [
  { name: 'Dr. Anjali Verma', expertise: 'Physics & Engineering', rating: 4.9, sessions: 320, accent: 'bg-indigo-100 text-indigo-600' },
  { name: 'Mr. Rajesh Kumar', expertise: 'Mathematics & Aptitude', rating: 4.8, sessions: 280, accent: 'bg-emerald-100 text-emerald-600' },
  { name: 'Ms. Sneha Pillai', expertise: 'Chemistry & Biology', rating: 4.9, sessions: 410, accent: 'bg-rose-100 text-rose-600' },
];

export function MentoringPage() {
  return (
    <AppShell
      title="AI + Human Mentoring"
      subtitle="Book a 1-on-1 session with an expert mentor. Get personalized guidance."
    >
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
        <Lock className="h-4 w-4 shrink-0" />
        Mentoring is a Premium feature. Upgrade to Pro to book a session.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <User className="h-5 w-5 text-indigo-600" />
            Available mentors
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {MENTORS.map((m) => (
              <Card key={m.name} className="border-slate-200 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${m.accent}`}>
                    {m.name.charAt(0)}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{m.name}</h4>
                      <ProBadge />
                    </div>
                    <p className="text-sm text-slate-500">{m.expertise}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="text-amber-500">★</span>
                        {m.rating}
                      </span>
                      <span>{m.sessions} sessions</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Card className="border-slate-200 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquareHeart className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">Book a Mentor</h3>
              <ProBadge />
            </div>
            <form className="space-y-4 opacity-60" onSubmit={(e) => e.preventDefault()}>
              <fieldset disabled className="space-y-4">
                <div className="space-y-2">
                  <Label>Your name</Label>
                  <Input placeholder="Enter your name" />
                </div>
                <div className="space-y-2">
                  <Label>Choose a mentor</Label>
                  <Select value="" onValueChange={() => {}}>
                    <SelectTrigger><SelectValue placeholder="Select a mentor" /></SelectTrigger>
                    <SelectContent>
                      {MENTORS.map((m) => (
                        <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input type="time" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>What do you need help with?</Label>
                  <Textarea placeholder="Describe your doubts or goals..." rows={3} />
                </div>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                  <Calendar className="mr-2 h-4 w-4" />
                  Book session
                </Button>
              </fieldset>
            </form>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
              <Lock className="h-3 w-3" />
              Form locked — upgrade to Pro to book.
            </p>
          </Card>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <Clock className="h-4 w-4 text-indigo-500" />
            Sessions run 30 to 60 minutes with AI-prep notes.
          </div>
        </div>
      </div>
    </AppShell>
  );
}

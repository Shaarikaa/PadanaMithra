import { useState } from 'react';
import { Plus, Trash2, Clock, Save, CalendarDays, Check, Zap } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useApp } from '@/lib/AppContext';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';
import type { TimetableEntry } from '@/lib/types';
import { SUBJECTS } from '@/lib/mockData';
import { SUBJECT_INFOS } from '@/lib/curriculum';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function TimetablePage() {
  const { profile } = useApp();
  const [entries, setEntries] = useState<TimetableEntry[]>(() =>
    loadJSON<TimetableEntry[]>(STORAGE_KEYS.timetable, []),
  );
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ day: 'Monday', subject: '', startTime: '09:00', endTime: '10:00' });

  const suggestedPlan = profile?.selectedSubjects?.length
    ? profile.selectedSubjects.slice(0, 3).map((subj, i) => {
        const info = SUBJECT_INFOS.find((s) => s.id === subj);
        const isCurrent = subj === profile.currentSubject;
        const time = new Date();
        time.setHours(17 + i, 0, 0, 0);
        return {
          time: time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          emoji: info?.emoji ?? '',
          label: isCurrent ? `${subj} — ${profile.currentChapter}` : subj,
        };
      })
    : [];

  const handleAdd = () => {
    if (!form.subject.trim()) return;
    const entry: TimetableEntry = {
      id: `tt-${Date.now()}`,
      day: form.day,
      subject: form.subject.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
    };
    setEntries((e) => [...e, entry]);
    saveJSON(STORAGE_KEYS.timetable, [...entries, entry]);
    setForm({ day: 'Monday', subject: '', startTime: '09:00', endTime: '10:00' });
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    saveJSON(STORAGE_KEYS.timetable, next);
  };

  const handleSave = () => {
    saveJSON(STORAGE_KEYS.timetable, entries);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const entriesByDay = (day: string) =>
    entries
      .filter((e) => e.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <AppShell
      title="Time Table Setter"
      subtitle="Plan your week. Your timetable saves automatically and stays after reload."
    >
      <div className="space-y-6">
        {suggestedPlan.length > 0 && (
          <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-violet-50/30 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">Today's Plan for {profile?.fullName?.split(' ')[0] ?? 'You'}</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {suggestedPlan.map((slot, i) => (
                <div key={i} className="rounded-xl border border-slate-100 bg-white/70 p-3">
                  <p className="text-xs font-semibold text-indigo-600">{slot.time}</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {slot.emoji} {slot.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">Auto-suggested from your selected subjects and current chapter.</p>
          </Card>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays className="h-4 w-4 text-indigo-600" />
            {entries.length} session{entries.length === 1 ? '' : 's'} scheduled
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-1.5 h-4 w-4" />
              Add session
            </Button>
            <Button variant="outline" onClick={handleSave} className="border-slate-300">
              {saved ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Save className="mr-1.5 h-4 w-4" />}
              {saved ? 'Saved!' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DAYS.map((day) => {
            const dayEntries = entriesByDay(day);
            return (
              <Card key={day} className="flex flex-col border-slate-200 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">{day}</h3>
                  <span className="text-xs text-slate-400">{dayEntries.length}</span>
                </div>
                <div className="flex-1 space-y-2">
                  {dayEntries.length === 0 ? (
                    <button
                      onClick={() => { setForm((f) => ({ ...f, day })); setOpen(true); }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-6 text-xs text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add a session
                    </button>
                  ) : (
                    dayEntries.map((e) => (
                      <div
                        key={e.id}
                        className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 transition hover:border-indigo-200"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                          <Clock className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{e.subject}</p>
                          <p className="text-xs text-slate-500">{e.startTime} – {e.endTime}</p>
                        </div>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-slate-300 transition hover:text-rose-500 group-hover:text-slate-400"
                          aria-label="Delete session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a study session</DialogTitle>
            <DialogDescription>Choose a day, subject, and time slot for your timetable.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={form.day} onValueChange={(v) => setForm((f) => ({ ...f, day: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="e.g. Physics"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUBJECTS.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, subject: s }))}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-600"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start time</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End time</Label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.subject.trim()} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-1.5 h-4 w-4" />
              Add to timetable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

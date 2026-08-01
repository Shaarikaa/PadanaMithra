import { useState } from 'react';
import { User as UserIcon, Cake, GraduationCap, BookOpen, Zap, FlaskConical, Dna, Sigma, Edit2, Check, ArrowRight, Target } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { SUBJECT_INFOS, getChaptersForSubject, getTopicsForChapter } from '@/lib/curriculum';

const SUBJECT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, FlaskConical, Dna, Sigma,
};

function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getProfileCompletion(profile: import('@/lib/types').StudentProfile | null): number {
  if (!profile) return 0;
  let pct = 0;
  if (profile.fullName) pct += 20;
  if (profile.dateOfBirth) pct += 15;
  if (profile.classLevel) pct += 15;
  if (profile.selectedSubjects.length > 0) pct += 25;
  if (profile.currentSubject) pct += 15;
  if (profile.currentChapter) pct += 10;
  return pct;
}

function formatBirthday(dob: string): string {
  if (!dob) return 'Not set';
  const d = new Date(dob);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
}

export function ProfilePage() {
  const { profile, updateProfile, navigate } = useApp();
  const [editOpen, setEditOpen] = useState(false);
  const [editSubjectsOpen, setEditSubjectsOpen] = useState(false);
  const [editChapterOpen, setEditChapterOpen] = useState(false);

  if (!profile) return null;

  const completion = getProfileCompletion(profile);
  const age = calculateAge(profile.dateOfBirth);

  return (
    <AppShell title="My Profile" subtitle="Your learning profile and personalization settings.">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Profile header card */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold text-white backdrop-blur">
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{profile.fullName}</h2>
                <p className="text-sm text-indigo-100">{profile.classLevel} • {profile.board}</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Profile Completion</span>
                <span className={completion >= 100 ? 'text-emerald-600' : 'text-slate-500'}>
                  {completion >= 100 ? '✓ Profile Complete' : `${completion}%`}
                </span>
              </div>
              <Progress value={completion} className="mt-2 h-2" />
              {completion < 100 && (
                <p className="mt-2 text-xs text-slate-400">Complete your profile to get better recommendations.</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={UserIcon} label="Name" value={profile.fullName} />
              <InfoRow icon={Cake} label="Birthday" value={formatBirthday(profile.dateOfBirth)} sub={age ? `${age} years old` : undefined} />
              <InfoRow icon={GraduationCap} label="Class" value={profile.classLevel} />
              <InfoRow icon={BookOpen} label="Board" value={profile.board} />
            </div>
          </div>
        </Card>

        {/* Subjects */}
        <Card className="border-slate-200 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Learning — Subjects</h3>
            <Button size="sm" variant="outline" onClick={() => setEditSubjectsOpen(true)} className="border-slate-300">
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              Change Subjects
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            {profile.selectedSubjects.map((subjId) => {
              const info = SUBJECT_INFOS.find((s) => s.id === subjId);
              const Icon = info ? SUBJECT_ICONS[info.icon] : BookOpen;
              return (
                <div key={subjId} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', info?.accent)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-slate-800">{info?.emoji} {info?.label ?? subjId}</span>
                </div>
              );
            })}
            {profile.selectedSubjects.length === 0 && (
              <p className="text-sm text-slate-400">No subjects selected yet.</p>
            )}
          </div>
        </Card>

        {/* Currently studying */}
        <Card className="border-slate-200 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Currently Studying</h3>
            <Button size="sm" variant="outline" onClick={() => setEditChapterOpen(true)} className="border-slate-300">
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              Change Current Chapter
            </Button>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-indigo-50/60 to-violet-50/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-700">
              <Target className="h-4 w-4" />
              {profile.currentSubject}
              <ArrowRight className="h-3.5 w-3.5" />
              <span className="font-semibold text-slate-900">{profile.currentChapter}</span>
            </div>
            {profile.currentTopic && (
              <p className="mt-2 text-sm text-slate-600">Topic: {profile.currentTopic}</p>
            )}
          </div>
        </Card>

        {/* Quick edit buttons */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setEditOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Edit2 className="mr-1.5 h-4 w-4" />
            Edit Profile
          </Button>
          <Button variant="outline" onClick={() => navigate({ name: 'dashboard' })} className="border-slate-300">
            <ArrowRight className="mr-1.5 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Edit basic info dialog */}
      <EditBasicInfoDialog open={editOpen} onClose={() => setEditOpen(false)} profile={profile} onSave={updateProfile} />

      {/* Edit subjects dialog */}
      <EditSubjectsDialog open={editSubjectsOpen} onClose={() => setEditSubjectsOpen(false)} profile={profile} onSave={updateProfile} />

      {/* Edit chapter dialog */}
      <EditChapterDialog open={editChapterOpen} onClose={() => setEditChapterOpen(false)} profile={profile} onSave={updateProfile} />
    </AppShell>
  );
}

function InfoRow({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function EditBasicInfoDialog({
  open,
  onClose,
  profile,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  profile: import('@/lib/types').StudentProfile;
  onSave: (u: Partial<import('@/lib/types').StudentProfile>) => void;
}) {
  const [name, setName] = useState(profile.fullName);
  const [dob, setDob] = useState(profile.dateOfBirth);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError('Name cannot be empty.'); return; }
    onSave({ fullName: name.trim(), dateOfBirth: dob });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your basic information.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => { setName(e.target.value); setError(''); }} />
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
            <Check className="mr-1.5 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditSubjectsDialog({
  open,
  onClose,
  profile,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  profile: import('@/lib/types').StudentProfile;
  onSave: (u: Partial<import('@/lib/types').StudentProfile>) => void;
}) {
  const [selected, setSelected] = useState<string[]>(profile.selectedSubjects);
  const [error, setError] = useState('');

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    setError('');
  };

  const handleSave = () => {
    if (selected.length === 0) { setError('Please choose at least one subject.'); return; }
    const currentStillSelected = selected.includes(profile.currentSubject);
    onSave({
      selectedSubjects: selected,
      currentSubject: currentStillSelected ? profile.currentSubject : selected[0],
      currentChapter: currentStillSelected ? profile.currentChapter : '',
      currentTopic: currentStillSelected ? profile.currentTopic : '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Subjects</DialogTitle>
          <DialogDescription>Select the subjects you want to learn.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {SUBJECT_INFOS.map((subj) => {
            const isSelected = selected.includes(subj.id);
            const Icon = SUBJECT_ICONS[subj.icon] ?? Zap;
            return (
              <button
                key={subj.id}
                onClick={() => toggle(subj.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition',
                  isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300',
                )}
              >
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', subj.accent)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{subj.emoji} {subj.label}</p>
                  <p className={cn('text-xs', isSelected ? 'text-indigo-600' : 'text-slate-400')}>
                    {isSelected ? '✓ Selected' : 'Tap to select'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
            <Check className="mr-1.5 h-4 w-4" />
            Save Subjects
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditChapterDialog({
  open,
  onClose,
  profile,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  profile: import('@/lib/types').StudentProfile;
  onSave: (u: Partial<import('@/lib/types').StudentProfile>) => void;
}) {
  const [subject, setSubject] = useState(profile.currentSubject);
  const [chapter, setChapter] = useState(profile.currentChapter);
  const [topic, setTopic] = useState(profile.currentTopic);
  const chapters = getChaptersForSubject('class-9', subject);
  const topics = getTopicsForChapter('class-9', subject, chapter);

  const handleSave = () => {
    onSave({ currentSubject: subject, currentChapter: chapter, currentTopic: topic });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Current Chapter</DialogTitle>
          <DialogDescription>Update what you're studying right now.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Subject</Label>
            <div className="flex flex-wrap gap-2">
              {profile.selectedSubjects.map((subjId) => (
                <button
                  key={subjId}
                  onClick={() => { setSubject(subjId); setChapter(''); setTopic(''); }}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                    subject === subjId ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-600 hover:border-indigo-300',
                  )}
                >
                  {SUBJECT_INFOS.find((s) => s.id === subjId)?.label ?? subjId}
                </button>
              ))}
            </div>
          </div>
          {chapters.length > 0 && (
            <div className="space-y-2">
              <Label>Chapter</Label>
              <div className="flex flex-wrap gap-2">
                {chapters.map((ch) => (
                  <button
                    key={ch.name}
                    onClick={() => { setChapter(ch.name); setTopic(''); }}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm transition',
                      chapter === ch.name ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-300',
                    )}
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {topics.length > 0 && (
            <div className="space-y-2">
              <Label>Topic (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={cn(
                      'rounded-lg border px-3 py-1 text-sm transition',
                      topic === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-300',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!chapter} className="bg-indigo-600 hover:bg-indigo-700">
            <Check className="mr-1.5 h-4 w-4" />
            Save Chapter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

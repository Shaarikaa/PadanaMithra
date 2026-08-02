import { useState } from 'react';
import { GraduationCap, ArrowRight, ArrowLeft, Check, Zap, FlaskConical, Dna, Sigma, Sparkles, Users, Mail, PartyPopper, Link2, Loader2 } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CLASSES, SUBJECT_INFOS, getChaptersForSubject, getTopicsForChapter } from '@/lib/curriculum';
import { connectParent } from '@/lib/parentService';

const SUBJECT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, FlaskConical, Dna, Sigma,
};

const STEPS = ['Name', 'Birthday', 'Class', 'Subjects', 'Chapters', 'Parent'] as const;

interface OnboardingData {
  fullName: string;
  dateOfBirth: string;
  classId: string;
  selectedSubjects: string[];
  currentSubject: string;
  currentChapter: string;
  currentTopic: string;
}

const INITIAL_DATA: OnboardingData = {
  fullName: '',
  dateOfBirth: '',
  classId: 'class-9',
  selectedSubjects: [],
  currentSubject: '',
  currentChapter: '',
  currentTopic: '',
};

export function OnboardingPage() {
  const { user, completeOnboarding } = useApp();
  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [error, setError] = useState('');
  const [parentChoice, setParentChoice] = useState<'yes' | 'no' | null>(null);
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentError, setParentError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [parentConnected, setParentConnected] = useState(false);

  const currentStep = STEPS[stepIdx];

  const update = (updates: Partial<OnboardingData>) => {
    setData((d) => ({ ...d, ...updates }));
    setError('');
  };

  const validateCurrent = (): boolean => {
    if (currentStep === 'Name') {
      if (!data.fullName.trim()) {
        setError('Please enter your name to continue.');
        return false;
      }
      if (data.fullName.trim().length < 2) {
        setError('Your name must be at least 2 characters long.');
        return false;
      }
    }
    if (currentStep === 'Birthday') {
      if (!data.dateOfBirth) {
        setError('Please select your date of birth.');
        return false;
      }
      const dob = new Date(data.dateOfBirth);
      if (dob > new Date()) {
        setError('Date of birth cannot be in the future.');
        return false;
      }
    }
    if (currentStep === 'Class') {
      if (!data.classId) {
        setError('Please select a class.');
        return false;
      }
    }
    if (currentStep === 'Subjects') {
      if (data.selectedSubjects.length === 0) {
        setError('Please choose at least one subject to continue.');
        return false;
      }
    }
    if (currentStep === 'Chapters') {
      if (!data.currentSubject || !data.currentChapter) {
        setError('Please select a subject and a chapter you are currently studying.');
        return false;
      }
    }
    return true;
  };

  const finishOnboarding = () => {
    const classInfo = CLASSES.find((c) => c.id === data.classId);
    completeOnboarding({
      fullName: data.fullName.trim(),
      dateOfBirth: data.dateOfBirth,
      board: classInfo?.board ?? 'Kerala SCERT',
      classLevel: classInfo?.label ?? 'Class 9',
      selectedSubjects: data.selectedSubjects,
      currentSubject: data.currentSubject,
      currentChapter: data.currentChapter,
      currentTopic: data.currentTopic,
    });
  };

  const handleNext = () => {
    if (!validateCurrent()) return;
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      finishOnboarding();
    }
  };

  const handleParentConnect = async () => {
    setParentError('');
    if (!parentName.trim()) { setParentError('Please enter your parent\'s name.'); return; }
    if (!parentEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim())) {
      setParentError('Please enter a valid email address for your parent.');
      return;
    }
    setConnecting(true);
    const result = await connectParent(parentName, parentEmail, data.fullName.trim());
    setConnecting(false);
    if (!result.success) {
      setParentError(result.error || 'Failed to connect parent. Please try again.');
      return;
    }
    setParentConnected(true);
  };

  const handleParentDone = () => {
    finishOnboarding();
  };

  const handleBack = () => {
    setError('');
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  };

  const toggleSubject = (subjectId: string) => {
    update({
      selectedSubjects: data.selectedSubjects.includes(subjectId)
        ? data.selectedSubjects.filter((s) => s !== subjectId)
        : [...data.selectedSubjects, subjectId],
      currentSubject: '',
      currentChapter: '',
      currentTopic: '',
    });
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-white to-white">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <GraduationCap className="h-6 w-6" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">PadanaMithra</span>
          </div>
          <span className="text-sm font-medium text-slate-400">
            Step {stepIdx + 1} of {STEPS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-2 flex-1 rounded-full transition-all duration-500',
                  i <= stepIdx ? 'bg-indigo-600' : 'bg-slate-200',
                )}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={cn(
                  'text-xs font-medium transition-colors',
                  i <= stepIdx ? 'text-indigo-600' : 'text-slate-300',
                )}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="flex flex-1 items-start justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100/50 sm:p-8 animate-fade-in-up">
            {currentStep === 'Name' && (
              <NameStep data={data} update={update} error={error} defaultName={user?.name ?? ''} />
            )}
            {currentStep === 'Birthday' && <BirthdayStep data={data} update={update} error={error} />}
            {currentStep === 'Class' && <ClassStep data={data} update={update} error={error} />}
            {currentStep === 'Subjects' && (
              <SubjectsStep data={data} toggleSubject={toggleSubject} error={error} />
            )}
            {currentStep === 'Chapters' && (
              <ChaptersStep
                data={data}
                update={update}
                error={error}
                onComplete={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStep === 'Parent' && (
              <ParentStep
                choice={parentChoice}
                setChoice={setParentChoice}
                parentName={parentName}
                setParentName={setParentName}
                parentEmail={parentEmail}
                setParentEmail={setParentEmail}
                error={parentError}
                connecting={connecting}
                connected={parentConnected}
                onConnect={handleParentConnect}
                onDone={handleParentDone}
                studentName={data.fullName.trim()}
              />
            )}

            {/* Navigation buttons (hidden on chapters and parent steps — they have their own) */}
            {currentStep !== 'Chapters' && currentStep !== 'Parent' && (
              <div className="mt-8 flex items-center justify-between gap-3">
                {stepIdx > 0 ? (
                  <Button variant="ghost" onClick={handleBack} className="text-slate-500">
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <span />
                )}
                <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700">
                  Continue
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          You can change all of this later from your profile settings.
        </p>
      </div>
    </div>
  );
}

/* ---- Step Components ---- */

function StepHeading({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {emoji} {title}
      </h2>
      {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

function NameStep({
  data,
  update,
  error,
  defaultName,
}: {
  data: OnboardingData;
  update: (u: Partial<OnboardingData>) => void;
  error: string;
  defaultName: string;
}) {
  return (
    <div>
      <StepHeading emoji="👋" title="First, what should we call you?" subtitle="This is the name we'll use throughout PadanaMithra." />
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          placeholder="Enter your name"
          value={data.fullName || defaultName}
          onChange={(e) => update({ fullName: e.target.value })}
          autoFocus
          className="h-12 text-base"
        />
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {data.fullName.trim() && (
        <div className="mt-4 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700 animate-fade-in">
          Nice to meet you, {data.fullName.trim()}! 🌟
        </div>
      )}
    </div>
  );
}

function BirthdayStep({
  data,
  update,
  error,
}: {
  data: OnboardingData;
  update: (u: Partial<OnboardingData>) => void;
  error: string;
}) {
  return (
    <div>
      <StepHeading emoji="🎂" title="When's your birthday?" subtitle="We use this to personalize your learning experience. This stays private." />
      <div className="space-y-2">
        <Label htmlFor="dob">Date of Birth</Label>
        <Input
          id="dob"
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => update({ dateOfBirth: e.target.value })}
          max={new Date().toISOString().split('T')[0]}
          className="h-12 text-base"
        />
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <span className="text-base">🔒</span>
        Your date of birth is private and will never be shown to other students.
      </div>
    </div>
  );
}

function ClassStep({
  data,
  update,
  error,
}: {
  data: OnboardingData;
  update: (u: Partial<OnboardingData>) => void;
  error: string;
}) {
  return (
    <div>
      <StepHeading emoji="📚" title="Which class are you studying in?" subtitle="Select your current class to get the right curriculum." />
      <div className="grid gap-3 sm:grid-cols-2">
        {CLASSES.map((cls) => (
          <button
            key={cls.id}
            disabled={!cls.available}
            onClick={() => update({ classId: cls.id })}
            className={cn(
              'group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300',
              data.classId === cls.id
                ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100'
                : cls.available
                  ? 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  : 'border-slate-100 opacity-50',
            )}
          >
            {data.classId === cls.id && (
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold',
                  data.classId === cls.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500',
                )}
              >
                {cls.label.replace('Class ', '')}
              </span>
              <div>
                <p className="font-semibold text-slate-900">{cls.label}</p>
                <p className="text-sm text-slate-500">{cls.board}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {cls.available ? 'Your learning journey starts here' : 'Coming soon'}
            </p>
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

function SubjectsStep({
  data,
  toggleSubject,
  error,
}: {
  data: OnboardingData;
  toggleSubject: (s: string) => void;
  error: string;
}) {
  return (
    <div>
      <StepHeading emoji="🧠" title="What would you like to learn?" subtitle="Select one or more subjects. You can change these anytime." />
      <div className="grid grid-cols-2 gap-3">
        {SUBJECT_INFOS.map((subj) => {
          const selected = data.selectedSubjects.includes(subj.id);
          const Icon = SUBJECT_ICONS[subj.icon] ?? Zap;
          return (
            <button
              key={subj.id}
              onClick={() => toggleSubject(subj.id)}
              className={cn(
                'group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300',
                selected
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100'
                  : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm',
              )}
            >
              {selected && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
                    subj.accent,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{subj.emoji} {subj.label}</p>
                  <p className={cn('text-xs', selected ? 'text-indigo-600' : 'text-slate-400')}>
                    {selected ? 'Selected' : 'Tap to select'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {data.selectedSubjects.length > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-fade-in">
          <Check className="h-4 w-4" />
          {data.selectedSubjects.length} subject{data.selectedSubjects.length === 1 ? '' : 's'} selected
        </div>
      )}
    </div>
  );
}

function ChaptersStep({
  data,
  update,
  error,
  onComplete,
  onBack,
}: {
  data: OnboardingData;
  update: (u: Partial<OnboardingData>) => void;
  error: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const chapters = getChaptersForSubject(data.classId, data.currentSubject);
  const topics = getTopicsForChapter(data.classId, data.currentSubject, data.currentChapter);
  const showSummary = data.currentSubject && data.currentChapter;

  return (
    <div>
      <StepHeading emoji="📖" title="What are you studying right now?" subtitle="Pick the subject and chapter you're currently working on." />

      {/* Subject selection */}
      <div className="mb-5">
        <Label className="mb-2 block text-sm font-medium text-slate-700">Select Subject</Label>
        <div className="flex flex-wrap gap-2">
          {data.selectedSubjects.map((subjId) => {
            const info = SUBJECT_INFOS.find((s) => s.id === subjId);
            const active = data.currentSubject === subjId;
            return (
              <button
                key={subjId}
                onClick={() => update({ currentSubject: subjId, currentChapter: '', currentTopic: '' })}
                className={cn(
                  'rounded-xl border px-4 py-2 text-sm font-medium transition',
                  active
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300',
                )}
              >
                {info?.emoji} {info?.label ?? subjId}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chapter selection */}
      {data.currentSubject && (
        <div className="mb-5 animate-fade-in">
          <Label className="mb-2 block text-sm font-medium text-slate-700">Select Chapter</Label>
          {chapters.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chapters.map((ch) => (
                <button
                  key={ch.name}
                  onClick={() => update({ currentChapter: ch.name, currentTopic: '' })}
                  className={cn(
                    'rounded-xl border px-4 py-2 text-sm font-medium transition',
                    data.currentChapter === ch.name
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300',
                  )}
                >
                  {ch.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Study materials will appear here once they are added.
            </p>
          )}
        </div>
      )}

      {/* Topic selection */}
      {data.currentChapter && topics.length > 0 && (
        <div className="mb-5 animate-fade-in">
          <Label className="mb-2 block text-sm font-medium text-slate-700">Select Topic (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <button
                key={topic}
                onClick={() => update({ currentTopic: topic })}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-sm transition',
                  data.currentTopic === topic
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300',
                )}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {/* Summary preview */}
      {showSummary && (
        <div className="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-violet-50/40 p-5 animate-fade-in-up">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">You're all set, {data.fullName || 'Student'}! 🎉</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <SummaryRow label="Name" value={data.fullName} />
            <SummaryRow label="Class" value="9" />
            <SummaryRow label="Board" value="Kerala SCERT" />
            <SummaryRow label="Subjects" value={data.selectedSubjects.join(', ')} />
            <SummaryRow label="Currently Learning" value={`${data.currentSubject} → ${data.currentChapter}`} />
          </div>
          <p className="mt-4 text-sm text-slate-600">PadanaMithra is ready to personalize your learning journey.</p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={onBack} className="text-slate-500">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <Button onClick={onComplete} className="bg-indigo-600 hover:bg-indigo-700">
              Go to My Dashboard
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {!showSummary && (
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onBack} className="text-slate-500">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value || '—'}</p>
    </div>
  );
}

function ParentStep({
  choice,
  setChoice,
  parentName,
  setParentName,
  parentEmail,
  setParentEmail,
  error,
  connecting,
  connected,
  onConnect,
  onDone,
  studentName,
}: {
  choice: 'yes' | 'no' | null;
  setChoice: (c: 'yes' | 'no' | null) => void;
  parentName: string;
  setParentName: (v: string) => void;
  parentEmail: string;
  setParentEmail: (v: string) => void;
  error: string;
  connecting: boolean;
  connected: boolean;
  onConnect: () => void;
  onDone: () => void;
  studentName: string;
}) {
  return (
    <div className="animate-fade-in-up">
      <StepHeading
        emoji="👨‍👩‍👧"
        title="Would you like to connect a Parent Dashboard?"
        subtitle="Your parent can receive a monthly report about your learning progress and support your learning journey."
      />

      {choice === null && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => setChoice('yes')}
            className="h-12 flex-1 bg-indigo-600 text-base hover:bg-indigo-700"
          >
            <Users className="mr-2 h-5 w-5" />
            Yes, Connect Parent
          </Button>
          <Button
            onClick={onDone}
            variant="outline"
            className="h-12 flex-1 border-slate-300 text-base hover:bg-slate-50"
          >
            No, Continue
          </Button>
        </div>
      )}

      {choice === 'yes' && !connected && (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-violet-50/40 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">Connect Your Parent</h3>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Enter your parent's details so we can send them your monthly learning progress report.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parent-name">Parent Name</Label>
                <Input
                  id="parent-name"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Parent's full name"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent-email">Parent Email</Label>
                <Input
                  id="parent-email"
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="h-11"
                />
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <Button
                onClick={onConnect}
                disabled={connecting}
                className="h-11 w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Connect Parent
                  </>
                )}
              </Button>
            </div>
          </div>
          <button
            onClick={onDone}
            className="text-sm text-slate-400 transition hover:text-slate-600"
          >
            Skip for now
          </button>
        </div>
      )}

      {choice === 'yes' && connected && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center">
          <PartyPopper className="mx-auto h-10 w-10 text-emerald-600" />
          <h3 className="mt-3 text-lg font-bold text-slate-900">Parent Connected!</h3>
          <p className="mt-1 text-sm text-slate-600">
            Your parent has been connected. They'll receive a monthly learning progress report.
          </p>
          <Button onClick={onDone} className="mt-5 bg-indigo-600 hover:bg-indigo-700">
            Go to My Dashboard
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

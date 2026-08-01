import { useEffect, useState, useRef, useCallback } from 'react';
import { Lock, MessageSquare, Send, HelpCircle, BookOpen, ClipboardList, Calendar, Lightbulb, Compass, User as UserIcon, Clock, CheckCircle2, AlertCircle, Loader2, Bot, Sparkles, GraduationCap } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/AppContext';
import { UpgradeModal } from '@/components/UpgradeModal';
import {
  getAssignedMentor,
  getMentorMessages,
  sendMessageToMentor,
  getMentorFollowups,
  completeFollowup,
  type Mentor,
  type MentorMessage,
  type MentorFollowup,
} from '@/lib/mentorService';

const AVAILABILITY_CONFIG = {
  available: { label: 'Available', color: 'text-emerald-600', dot: 'bg-emerald-500' },
  away: { label: 'Away', color: 'text-amber-600', dot: 'bg-amber-500' },
  offline: { label: 'Offline', color: 'text-slate-400', dot: 'bg-slate-400' },
};

const QUICK_ACTIONS = [
  { label: 'Ask a Doubt', icon: HelpCircle, prompt: 'I have a doubt about ' },
  { label: 'Discuss a Topic', icon: BookOpen, prompt: 'Can we discuss ' },
  { label: 'Discuss My Test', icon: ClipboardList, prompt: 'I want to discuss my recent test. ' },
  { label: 'Ask for Study Plan', icon: Calendar, prompt: 'Can you help me create a study plan? ' },
  { label: "I Don't Understand This", icon: Lightbulb, prompt: "I don't understand " },
  { label: 'Need Guidance', icon: Compass, prompt: 'I need some guidance. ' },
];

type View = 'profile' | 'chat' | 'guidance' | 'schedule';

export function MentoringPage() {
  const { isPremium, premiumLoading } = useApp();
  const [view, setView] = useState<View>('profile');
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [followups, setFollowups] = useState<MentorFollowup[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const assignment = await getAssignedMentor();
    if (assignment?.mentor) {
      setMentor(assignment.mentor);
      const [msgs, fups] = await Promise.all([
        getMentorMessages(),
        getMentorFollowups(),
      ]);
      setMessages(msgs);
      setFollowups(fups);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isPremium) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isPremium, loadData]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Optimistically add student message
    const tempId = `temp-${Date.now()}`;
    setMessages((m) => [...m, {
      id: tempId,
      student_id: '',
      mentor_id: '',
      sender: 'student',
      message: text,
      created_at: new Date().toISOString(),
    }]);

    const result = await sendMessageToMentor(text);

    if (result.ok && result.reply) {
      setMessages((m) => [...m, {
        id: `reply-${Date.now()}`,
        student_id: '',
        mentor_id: '',
        sender: 'mentor',
        message: result.reply!,
        created_at: new Date().toISOString(),
      }]);
    }

    // Refresh followups
    const fups = await getMentorFollowups();
    setFollowups(fups);

    setSending(false);
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const handleCompleteFollowup = async (id: string) => {
    await completeFollowup(id);
    setFollowups((f) => f.filter((fu) => fu.id !== id));
  };

  // ---- Locked view for free users ----
  if (!premiumLoading && !isPremium) {
    return (
      <AppShell title="Personal Mentor" subtitle="One mentor. Continuous guidance. Your learning journey, supported.">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 p-6 text-white">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Lock className="h-3.5 w-3.5" />
                Premium Feature
              </div>
              <h2 className="text-2xl font-bold">Personal Mentor</h2>
              <p className="mt-1 text-sm text-white/90">
                One mentor. Continuous guidance. Your learning journey, supported.
              </p>
            </div>
            <div className="p-6">
              <div className="mb-5 space-y-3">
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <span className="text-2xl">👨‍🏫</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Continuous Human Guidance</p>
                    <p className="mt-0.5 text-xs text-slate-500">Get ongoing support from a dedicated mentor who understands your learning journey.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <span className="text-2xl">💬</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Mentor Chat</p>
                    <p className="mt-0.5 text-xs text-slate-500">Message your mentor anytime with doubts, questions, or for guidance.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                  <span className="text-2xl">📌</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Follow-up Support</p>
                    <p className="mt-0.5 text-xs text-slate-500">Your mentor leaves guidance and checks in on your progress.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Bot className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm font-medium text-slate-700">AI Tutor: "Instant help anytime"</span>
                </div>
                <div className="my-2 text-center text-xs font-bold text-indigo-400">+</div>
                <div className="flex items-center justify-center gap-2">
                  <GraduationCap className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm font-medium text-slate-700">Personal Mentor: "Continuous human guidance"</span>
                </div>
              </div>

              <Button className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowUpgrade(true)}>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Upgrade to Premium — ₹99/month
              </Button>
            </div>
          </Card>
        </div>
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} featureName="Personal Mentor" />
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title="Personal Mentor" subtitle="One mentor. Continuous guidance. Your learning journey, supported.">
        <div className="mx-auto max-w-2xl">
          <Card className="border-slate-200 p-8 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-2 text-sm text-slate-500">Connecting you with your mentor...</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!mentor) {
    return (
      <AppShell title="Personal Mentor" subtitle="One mentor. Continuous guidance. Your learning journey, supported.">
        <div className="mx-auto max-w-2xl">
          <Card className="border-slate-200 p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Awaiting Mentor Assignment</h3>
            <p className="mt-2 text-sm text-slate-500">
              Your Premium subscription is active. A mentor will be assigned to you shortly.
              Check back soon!
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  const avail = AVAILABILITY_CONFIG[mentor.availability_status];

  // ---- Chat View ----
  if (view === 'chat') {
    return (
      <AppShell title="Chat with My Mentor" subtitle={`Connected with ${mentor.name}`}>
        <div className="mx-auto max-w-3xl">
          <div className="flex h-[calc(100vh-320px)] min-h-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <button onClick={() => setView('profile')} className="text-slate-500 hover:text-indigo-600">
                <UserIcon className="h-5 w-5" />
              </button>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{mentor.name}</p>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <span className={cn('h-2 w-2 rounded-full', avail.dot)} />
                  {avail.label}
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4" ref={scrollRef as never}>
              <div className="space-y-4 py-4">
                {messages.length === 0 ? (
                  <div className="py-8 text-center">
                    <GraduationCap className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">Start a conversation with your mentor!</p>
                    <p className="mt-1 text-xs text-slate-400">Use the quick actions below or type a message.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={cn('flex gap-3', msg.sender === 'student' ? 'flex-row-reverse' : 'flex-row')}>
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        msg.sender === 'mentor' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600')}>
                        {msg.sender === 'mentor' ? <GraduationCap className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                      </div>
                      <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line',
                        msg.sender === 'mentor' ? 'rounded-tl-sm bg-slate-100 text-slate-800' : 'rounded-tr-sm bg-indigo-600 text-white')}>
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
                {sending && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick actions */}
            <div className="border-t border-slate-100 px-4 py-2">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <button
                      key={qa.label}
                      onClick={() => handleQuickAction(qa.prompt)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {qa.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 p-3">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message your mentor..."
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  disabled={sending}
                />
                <Button onClick={handleSend} disabled={!input.trim() || sending} className="bg-indigo-600 hover:bg-indigo-700">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---- Guidance View (Follow-ups) ----
  if (view === 'guidance') {
    return (
      <AppShell title="Mentor Guidance" subtitle={`Follow-up guidance from ${mentor.name}`}>
        <div className="mx-auto max-w-2xl space-y-5">
          {followups.length > 0 ? (
            followups.map((fu) => (
              <Card key={fu.id} className="border-indigo-100 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg">📌</span>
                  <h3 className="text-sm font-semibold text-slate-900">Mentor Follow-up</h3>
                </div>
                <p className="text-sm text-slate-700">{fu.guidance}</p>
                {fu.due_date && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    Due: {new Date(fu.due_date).toLocaleDateString()}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">Complete these before your next check-in.</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleCompleteFollowup(fu.id)}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Mark as Done
                  </Button>
                  <Button size="sm" variant="outline" className="border-slate-300" onClick={() => setView('chat')}>
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    Message Mentor
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="border-slate-200 p-8 text-center shadow-sm">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-2 text-sm text-slate-500">No pending follow-ups. Your mentor will leave guidance here when needed.</p>
            </Card>
          )}
          <Button variant="outline" onClick={() => setView('profile')} className="border-slate-300">
            Back to Mentor Profile
          </Button>
        </div>
      </AppShell>
    );
  }

  // ---- Schedule View ----
  if (view === 'schedule') {
    return (
      <AppShell title="Schedule a Session" subtitle={`Book a session with ${mentor.name}`}>
        <div className="mx-auto max-w-lg space-y-5">
          <Card className="border-slate-200 p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Date</label>
                <input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Time</label>
                <input type="time" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">What do you need help with?</label>
                <Textarea placeholder="Describe what you'd like to discuss..." rows={3} className="resize-none" />
              </div>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => { setView('chat'); }}>
                <Calendar className="mr-2 h-4 w-4" />
                Request Session
              </Button>
            </div>
          </Card>
          <Button variant="outline" onClick={() => setView('profile')} className="border-slate-300">
            Back to Mentor Profile
          </Button>
        </div>
      </AppShell>
    );
  }

  // ---- Profile View (default) ----
  return (
    <AppShell title="Personal Mentor" subtitle="One mentor. Continuous guidance. Your learning journey, supported.">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Mentor Profile Card */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 p-5 text-white">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              <h3 className="text-sm font-semibold">Personal Mentor</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-600">
                {mentor.name.charAt(0)}
              </span>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-slate-900">{mentor.name}</h4>
                <p className="text-sm text-slate-600">{mentor.subject_expertise}</p>
                <p className="mt-1 text-xs text-slate-500">{mentor.experience}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {mentor.languages.map((lang) => (
                    <span key={lang} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {lang}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', avail.dot)} />
                  <span className={cn('text-sm font-medium', avail.color)}>{avail.label}</span>
                </div>
              </div>
            </div>

            {mentor.is_demo && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Demo Mentor</span> — This is sample data for demonstration purposes only. No real credentials are represented.
                </p>
              </div>
            )}

            <p className="mt-4 text-sm text-slate-600">{mentor.bio}</p>

            {/* Action buttons */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Button onClick={() => setView('chat')} className="bg-indigo-600 hover:bg-indigo-700">
                <MessageSquare className="mr-1.5 h-4 w-4" />
                Message
              </Button>
              <Button variant="outline" className="border-slate-300" onClick={() => setView('chat')}>
                <HelpCircle className="mr-1.5 h-4 w-4" />
                Ask a Doubt
              </Button>
              <Button variant="outline" className="border-slate-300" onClick={() => setView('guidance')}>
                <BookOpen className="mr-1.5 h-4 w-4" />
                View Guidance
              </Button>
              <Button variant="outline" className="border-slate-300" onClick={() => setView('schedule')}>
                <Calendar className="mr-1.5 h-4 w-4" />
                Schedule
              </Button>
            </div>
          </div>
        </Card>

        {/* Pending Follow-ups */}
        {followups.length > 0 && (
          <Card className="border-indigo-100 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">📌</span>
              <h3 className="text-sm font-semibold text-slate-900">Mentor Follow-up</h3>
            </div>
            <p className="text-xs text-slate-500">Complete these before your next check-in.</p>
            <div className="mt-3 space-y-2">
              {followups.slice(0, 3).map((fu) => (
                <div key={fu.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <p className="text-sm text-slate-700">{fu.guidance}</p>
                  <div className="mt-2 flex items-center justify-between">
                    {fu.due_date && (
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        Due: {new Date(fu.due_date).toLocaleDateString()}
                      </p>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-600" onClick={() => handleCompleteFollowup(fu.id)}>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Done
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* AI + Mentor Collaboration */}
        <Card className="border-slate-200 p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">AI Tutor + Personal Mentor</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-indigo-50/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-semibold text-slate-800">AI Tutor</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>• Instant explanations anytime</li>
                <li>• Guided hints and practice</li>
                <li>• 24/7 basic academic support</li>
                <li>• Revision and flashcards</li>
              </ul>
            </div>
            <div className="rounded-xl bg-emerald-50/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-800">Personal Mentor</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>• Continuous human guidance</li>
                <li>• Personalized support</li>
                <li>• Study planning & follow-up</li>
                <li>• Human encouragement</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}


export { MentoringPage }
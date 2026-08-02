import { useState } from 'react';
import { GraduationCap, Sparkles, ArrowRight, Bot, BookMarked, FileText, Layers, Users, ShieldCheck, Clock, MessageSquareHeart, GraduationCap as MentorCap } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { Button } from '@/components/ui/button';

const HIGHLIGHTS = [
  { icon: Bot, label: 'AI Tutor', desc: 'Instant explanations' },
  { icon: BookMarked, label: 'Textbook Hub', desc: 'Class resources' },
  { icon: FileText, label: 'Smart Notes', desc: 'Auto-generated' },
  { icon: Layers, label: 'Flashcards', desc: '1-min revision' },
  { icon: Users, label: 'Study Rooms', desc: 'Learn together' },
];;

export function LandingPage() {
  const { navigate } = useApp();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
              <GraduationCap className="h-6 w-6" />
            </span>
            <span className="text-xl font-semibold tracking-tight text-slate-900">Padanamithra</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" onClick={() => navigate({ name: 'parent-login' })} className="font-medium text-slate-600 hover:text-indigo-600">
              Parent Login
            </Button>
            <Button variant="ghost" onClick={() => navigate({ name: 'login' })} className="font-medium text-slate-700 hover:text-indigo-600">
              Login
            </Button>
            <Button onClick={() => navigate({ name: 'signup' })} className="bg-indigo-600 font-medium hover:bg-indigo-700">
              Sign Up
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50/70 via-white to-white" />
        <div className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="absolute -left-32 top-40 -z-10 h-80 w-80 rounded-full bg-violet-100/50 blur-3xl" />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-32 sm:px-6 lg:grid-cols-2 lg:pb-28 lg:pt-40">
          <div className="animate-fade-in-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
              <Sparkles className="h-4 w-4" />
              AI-powered study companion
            </div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Meet <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Padanamithra</span>
            </h1>
            <p className="mt-3 text-lg font-medium text-indigo-600 sm:text-xl">
              Your friendly neighbourhood study buddy.
            </p>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Ask questions, generate short notes, and revise with flashcards.
              Your AI companion helps you learn now, and your Personal Mentor helps you keep going.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => navigate({ name: 'signup' })} className="h-12 bg-indigo-600 px-8 text-base hover:bg-indigo-700">
                Get started free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate({ name: 'login' })} className="h-12 border-slate-300 px-8 text-base text-slate-700 hover:border-indigo-300 hover:text-indigo-600">
                I have an account
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                No credit card needed
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                11 free features
              </span>
            </div>
          </div>

          <div className="relative animate-fade-in-up [animation-delay:150ms]">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-indigo-200/40 to-violet-200/40 blur-2xl" />
            <div className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-2xl shadow-indigo-200/50">
              <img
                src="https://images.pexels.com/photos/8199249/pexels-photo-8199249.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                alt="Student learning online with books and laptop"
                className="h-[420px] w-full object-cover"
              />
            </div>
            <div className="absolute -left-4 top-12 hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-xl sm:block animate-float">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-900">AI Tutor</p>
                  <p className="text-[11px] text-slate-500">Explain motion</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 bottom-16 hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-xl sm:block animate-float [animation-delay:2s]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Layers className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-900">Flashcards</p>
                  <p className="text-[11px] text-slate-500">1-min revision</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Everything you need to ace your exams</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Fourteen powerful tools in one place — from an AI tutor that explains any topic to spaced reviews that help you remember.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {HIGHLIGHTS.map((h, i) => {
            const Icon = h.icon;
            return (
              <div
                key={h.label}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className={`rounded-2xl border p-5 text-center transition-all duration-300 ${
                  hovered === i ? '-translate-y-1 border-indigo-200 bg-indigo-50/50 shadow-md' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900">{h.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{h.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Two layers of learning support</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            AI helps you learn now. Your Personal Mentor helps you keep going.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Bot className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">AI Learning Companion</h3>
            <p className="mt-2 text-sm text-slate-600">Instant explanations, guided hints, and practice — available 24/7, free for every student.</p>
            <span className="mt-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-600">FREE</span>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <MentorCap className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Personal Mentor</h3>
            <p className="mt-2 text-sm text-slate-600">Continuous human guidance from a dedicated mentor who understands your learning journey.</p>
            <span className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-600">PREMIUM · ₹99/mo</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-14 text-center text-white shadow-xl shadow-indigo-200">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10" />
          <h2 className="relative text-3xl font-bold sm:text-4xl">Start learning smarter today</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-indigo-100">
            Join Padanamithra and turn your study time into results. It is free to get started.
          </p>
          <Button
            size="lg"
            onClick={() => navigate({ name: 'signup' })}
            className="relative mt-7 h-12 bg-white px-8 text-base text-indigo-600 hover:bg-indigo-50"
          >
            Create your free account
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-500 sm:px-6">
          <div className="mb-3 flex items-center justify-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-slate-700">Padanamithra</span>
          </div>
          <p>Built for the hackathon. A prototype demonstrating AI-powered student learning.</p>
        </div>
      </footer>
    </div>
  );
}

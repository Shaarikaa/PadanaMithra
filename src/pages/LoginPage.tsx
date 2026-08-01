import { useState, type FormEvent } from 'react';
import { GraduationCap, Mail, Lock, ArrowLeft, Eye, EyeOff, CircleAlert as AlertCircle } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage() {
  const { login, navigate } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    const result = login(email.trim(), password);
    if (!result.ok) {
      setError(result.error ?? 'Login failed.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <div className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-2.5 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <GraduationCap className="h-7 w-7" />
          </span>
          <span className="text-2xl font-semibold tracking-tight">Padanamithra</span>
        </div>
        <div className="relative text-white">
          <h2 className="text-3xl font-bold leading-tight">Welcome back, learner.</h2>
          <p className="mt-3 max-w-md text-indigo-100">
            Pick up right where you left off. Your AI tutor, notes, and study rooms are waiting.
          </p>
        </div>
        <p className="relative text-sm text-indigo-200">Your friendly neighbourhood study buddy.</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <button onClick={() => navigate({ name: 'landing' })} className="mb-8 flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-indigo-600">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </button>

          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <GraduationCap className="h-7 w-7" />
              </span>
              <span className="text-2xl font-semibold tracking-tight text-slate-900">Padanamithra</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Log in</h1>
          <p className="mt-1.5 text-sm text-slate-500">Enter your details to access your dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="h-11 w-full bg-indigo-600 text-base hover:bg-indigo-700">
              Log in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <button onClick={() => navigate({ name: 'signup' })} className="font-semibold text-indigo-600 transition hover:text-indigo-700">
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

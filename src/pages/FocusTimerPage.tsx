import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, RotateCcw, Maximize2, Minimize2, Coffee, Brain, CircleCheck as CheckCircle2, Zap, FlaskConical, Dna, Sigma, Target, TrendingUp, BellOff, PartyPopper } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/AppContext';
import { loadJSON, saveJSON } from '@/lib/storage';
import { supabase } from '@/lib/supabaseClient';
import { setFocusMode } from '@/hooks/use-toast';

type TimerState = 'idle' | 'running' | 'paused' | 'break' | 'completed';
type SessionStatus = 'completed' | 'paused' | 'cancelled';

interface FocusSession {
  id: string;
  subject: string;
  durationMinutes: number;
  completedAt: number;
  type: 'focus' | 'break';
}

interface FocusStats {
  totalSessions: number;
  totalFocusMinutes: number;
  todaySessions: number;
  todayFocusMinutes: number;
  streak: number;
}

const PRESETS = [
  { label: 'Pomodoro', focus: 25, break: 5, icon: Timer },
  { label: 'Deep Focus', focus: 50, break: 10, icon: Brain },
  { label: 'Quick Sprint', focus: 15, break: 3, icon: Zap },
  { label: 'Marathon', focus: 90, break: 20, icon: Target },
];

const SUBJECTS = [
  { name: 'Physics', icon: Zap, color: 'bg-indigo-100 text-indigo-600' },
  { name: 'Chemistry', icon: FlaskConical, color: 'bg-emerald-100 text-emerald-600' },
  { name: 'Biology', icon: Dna, color: 'bg-rose-100 text-rose-600' },
  { name: 'Mathematics', icon: Sigma, color: 'bg-amber-100 text-amber-600' },
];

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function loadStats(): FocusStats {
  const sessions = loadJSON<FocusSession[]>('focusSessions', []);
  const today = getTodayString();

  const todaySessions = sessions.filter((s) => {
    const d = new Date(s.completedAt);
    return d.toISOString().split('T')[0] === today && s.type === 'focus';
  });

  let streak = 0;
  const focusDates = new Set<string>();
  for (const s of sessions) {
    if (s.type === 'focus') {
      focusDates.add(new Date(s.completedAt).toISOString().split('T')[0]);
    }
  }
  let checkDate = new Date();
  if (!focusDates.has(checkDate.toISOString().split('T')[0])) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (focusDates.has(checkDate.toISOString().split('T')[0])) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return {
    totalSessions: sessions.filter((s) => s.type === 'focus').length,
    totalFocusMinutes: sessions.filter((s) => s.type === 'focus').reduce((sum, s) => sum + s.durationMinutes, 0),
    todaySessions: todaySessions.length,
    todayFocusMinutes: todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    streak,
  };
}

function saveSessionLocal(session: FocusSession) {
  const sessions = loadJSON<FocusSession[]>('focusSessions', []);
  sessions.push(session);
  saveJSON('focusSessions', sessions);
}

async function saveSessionDB(params: {
  subject: string;
  plannedDuration: number;
  actualDuration: number;
  startedAt: number;
  status: SessionStatus;
}): Promise<void> {
  try {
    const raw = localStorage.getItem('padanamithra:currentUser');
    if (!raw) return;
    const user = JSON.parse(raw) as { email: string };
    if (!user.email) return;
    const userId = user.email.toLowerCase().replace(/[^a-z0-9]/g, '');

    await supabase.from('focus_sessions').insert({
      user_id: userId,
      subject: params.subject,
      planned_duration_minutes: params.plannedDuration,
      actual_duration_minutes: params.actualDuration,
      started_at: new Date(params.startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      status: params.status,
    });
  } catch {
    // non-blocking — local storage is the fallback
  }
}

export function FocusTimerPage() {
  const { profile } = useApp();
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState<string>(profile?.selectedSubjects?.[0] || 'Physics');
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[0].focus * 60);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [stats, setStats] = useState<FocusStats>(loadStats);

  // Timestamp-based timer — avoids drift when tab is backgrounded
  const endTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const accumulatedPausedRef = useRef<number>(0);

  const currentPreset = PRESETS[selectedPreset];
  const isBreakPhase = timerState === 'break';
  const totalSeconds = isBreakPhase ? currentPreset.break * 60 : currentPreset.focus * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount — restore notifications
  useEffect(() => {
    return () => {
      stopInterval();
      setFocusMode(false);
    };
  }, [stopInterval]);

  useEffect(() => {
    if (timerState === 'completed') {
      setStats(loadStats());
    }
  }, [timerState]);

  // Timestamp-based tick — calculates remaining time from end timestamp
  const startTick = useCallback(() => {
    stopInterval();
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        stopInterval();
        handleTimerComplete();
      }
    }, 250);
  }, [stopInterval]);

  const handleTimerComplete = useCallback(() => {
    if (isBreakPhase) {
      setTimerState('completed');
      setFocusMode(false);
      return;
    }

    // Focus phase complete — save session, start break
    const elapsedMin = currentPreset.focus;
    saveSessionLocal({
      id: crypto.randomUUID(),
      subject: selectedSubject,
      durationMinutes: elapsedMin,
      completedAt: Date.now(),
      type: 'focus',
    });
    saveSessionDB({
      subject: selectedSubject,
      plannedDuration: currentPreset.focus,
      actualDuration: elapsedMin,
      startedAt: sessionStartRef.current,
      status: 'completed',
    });
    setSessionCount((c) => c + 1);

    // Start break phase
    setTimerState('break');
    setFocusMode(false); // break = notifications resume
    endTimeRef.current = Date.now() + currentPreset.break * 60 * 1000;
    setSecondsLeft(currentPreset.break * 60);
    startTick();
  }, [isBreakPhase, currentPreset, selectedSubject, startTick]);

  const startTimer = () => {
    setTimerState('running');
    setFocusMode(true); // suppress notifications
    sessionStartRef.current = Date.now();
    accumulatedPausedRef.current = 0;
    endTimeRef.current = Date.now() + currentPreset.focus * 60 * 1000;
    setSecondsLeft(currentPreset.focus * 60);
    startTick();
  };

  const pauseTimer = () => {
    stopInterval();
    pausedAtRef.current = Date.now();
    setTimerState('paused');
    setFocusMode(false); // pause = notifications resume
  };

  const resumeTimer = () => {
    // Shift end time by the paused duration
    const pausedDuration = Date.now() - pausedAtRef.current;
    accumulatedPausedRef.current += pausedDuration;
    endTimeRef.current += pausedDuration;
    setTimerState('running');
    setFocusMode(true); // re-suppress notifications
    startTick();
  };

  const endSession = () => {
    stopInterval();
    // Calculate actual elapsed focus time (excluding pauses)
    const elapsedMs = Date.now() - sessionStartRef.current - accumulatedPausedRef.current;
    const elapsedMin = Math.max(0, Math.round(elapsedMs / 60000));

    if (timerState === 'running' || timerState === 'paused') {
      // Save partial session
      saveSessionLocal({
        id: crypto.randomUUID(),
        subject: selectedSubject,
        durationMinutes: elapsedMin > 0 ? elapsedMin : 0,
        completedAt: Date.now(),
        type: 'focus',
      });
      saveSessionDB({
        subject: selectedSubject,
        plannedDuration: currentPreset.focus,
        actualDuration: elapsedMin,
        startedAt: sessionStartRef.current,
        status: 'cancelled',
      });
    }

    setFocusMode(false);
    setTimerState('idle');
    setSecondsLeft(currentPreset.focus * 60);
  };

  const resetTimer = () => {
    stopInterval();
    setFocusMode(false);
    setTimerState('idle');
    setSecondsLeft(currentPreset.focus * 60);
  };

  const skipToBreak = () => {
    stopInterval();
    const elapsedMin = currentPreset.focus;
    saveSessionLocal({
      id: crypto.randomUUID(),
      subject: selectedSubject,
      durationMinutes: elapsedMin,
      completedAt: Date.now(),
      type: 'focus',
    });
    saveSessionDB({
      subject: selectedSubject,
      plannedDuration: currentPreset.focus,
      actualDuration: elapsedMin,
      startedAt: sessionStartRef.current,
      status: 'completed',
    });
    setSessionCount((c) => c + 1);
    setTimerState('break');
    setFocusMode(false);
    endTimeRef.current = Date.now() + currentPreset.break * 60 * 1000;
    setSecondsLeft(currentPreset.break * 60);
    startTick();
  };

  const handlePresetChange = (idx: number) => {
    if (timerState === 'running' || timerState === 'break') return;
    setSelectedPreset(idx);
    setSecondsLeft(PRESETS[idx].focus * 60);
  };

  const toggleFullscreen = () => setIsFullscreen((f) => !f);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentSubject = SUBJECTS.find((s) => s.name === selectedSubject) || SUBJECTS[0];
  const SubjectIcon = currentSubject.icon;
  const isFocusActive = timerState === 'running';

  // ---- Fullscreen distraction-free mode ----
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
        <button
          onClick={toggleFullscreen}
          className="absolute right-6 top-6 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur transition hover:bg-white/20"
        >
          <Minimize2 className="h-4 w-4" />
          Exit Fullscreen
        </button>

        <div className="mb-8 flex items-center gap-3">
          <span className={cn('flex h-12 w-12 items-center justify-center rounded-xl', currentSubject.color)}>
            <SubjectIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm text-white/60">{selectedSubject}</p>
            <p className="text-lg font-semibold">{currentPreset.label} Mode</p>
          </div>
        </div>

        {isFocusActive && (
          <div className="mb-4 flex items-center gap-2 rounded-full bg-indigo-500/20 px-4 py-1.5 text-sm text-indigo-200">
            <span className="text-base">🎯</span>
            Focus Mode Active
          </div>
        )}

        {/* Circular timer */}
        <div className="relative flex h-72 w-72 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <circle
              cx="100" cy="100" r="90" fill="none"
              stroke={isBreakPhase ? '#34d399' : '#818cf8'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 90}
              strokeDashoffset={2 * Math.PI * 90 * (1 - progress / 100)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="text-center">
            <p className={cn('text-6xl font-bold tabular-nums', isBreakPhase ? 'text-emerald-300' : 'text-white')}>
              {formatTime(secondsLeft)}
            </p>
            <p className="mt-2 text-sm text-white/50">
              {timerState === 'idle' && 'Ready to focus'}
              {timerState === 'running' && 'Focusing...'}
              {timerState === 'paused' && 'Paused'}
              {timerState === 'break' && 'Break time'}
              {timerState === 'completed' && 'Session complete!'}
            </p>
          </div>
        </div>

        {/* DND suggestion */}
        {isFocusActive && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-white/40">
            <BellOff className="h-3.5 w-3.5" />
            For complete device-wide blocking, turn on your phone's Do Not Disturb / Focus Mode.
          </p>
        )}

        {/* Controls */}
        <div className="mt-8 flex items-center gap-4">
          {timerState === 'idle' && (
            <Button onClick={startTimer} size="lg" className="h-14 bg-indigo-600 px-8 text-lg hover:bg-indigo-700">
              <Play className="mr-2 h-5 w-5" />
              Start Focus Session
            </Button>
          )}
          {timerState === 'running' && (
            <>
              <Button onClick={pauseTimer} size="lg" variant="outline" className="h-14 border-white/20 bg-white/10 px-6 text-white hover:bg-white/20">
                <Pause className="mr-2 h-5 w-5" />
                Pause
              </Button>
              <Button onClick={skipToBreak} size="lg" variant="ghost" className="h-14 px-6 text-white/60 hover:bg-white/10 hover:text-white">
                Skip to Break
              </Button>
              <Button onClick={endSession} size="lg" variant="ghost" className="h-14 px-6 text-rose-300/60 hover:bg-rose-500/10 hover:text-rose-300">
                End Session
              </Button>
            </>
          )}
          {timerState === 'paused' && (
            <>
              <Button onClick={resumeTimer} size="lg" className="h-14 bg-indigo-600 px-8 text-lg hover:bg-indigo-700">
                <Play className="mr-2 h-5 w-5" />
                Resume
              </Button>
              <Button onClick={endSession} size="lg" variant="ghost" className="h-14 px-6 text-rose-300/60 hover:bg-rose-500/10 hover:text-rose-300">
                End Session
              </Button>
            </>
          )}
          {timerState === 'break' && (
            <div className="flex items-center gap-3 text-emerald-300">
              <Coffee className="h-6 w-6" />
              <p className="text-lg font-medium">Take a break — you earned it!</p>
            </div>
          )}
          {timerState === 'completed' && (
            <Button onClick={() => { resetTimer(); toggleFullscreen(); }} size="lg" className="h-14 bg-emerald-600 px-8 text-lg hover:bg-emerald-700">
              <PartyPopper className="mr-2 h-5 w-5" />
              Done — Back to Dashboard
            </Button>
          )}
        </div>

        {sessionCount > 0 && timerState !== 'completed' && (
          <p className="mt-6 text-sm text-white/40">
            {sessionCount} session{sessionCount === 1 ? '' : 's'} completed today
          </p>
        )}
      </div>
    );
  }

  // ---- Normal mode ----
  return (
    <AppShell title="Focus Timer" subtitle="Distraction-free study mode with timed sessions.">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Completion banner */}
        {timerState === 'completed' && (
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 text-center shadow-sm animate-pop-in">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <PartyPopper className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-emerald-900">Focus Session Complete!</h3>
            <p className="mt-1 text-sm text-emerald-700">Great work! You completed your focus session.</p>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-medium text-slate-500">Today</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.todayFocusMinutes}<span className="ml-1 text-sm font-normal text-slate-400">min</span></p>
            <p className="text-xs text-slate-400">{stats.todaySessions} session{stats.todaySessions === 1 ? '' : 's'}</p>
          </Card>
          <Card className="border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-slate-500">Streak</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.streak}<span className="ml-1 text-sm font-normal text-slate-400">days</span></p>
          </Card>
          <Card className="border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-600" />
              <span className="text-xs font-medium text-slate-500">Total</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalFocusMinutes}<span className="ml-1 text-sm font-normal text-slate-400">min</span></p>
          </Card>
          <Card className="border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-slate-500">Sessions</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalSessions}</p>
          </Card>
        </div>

        {/* Timer card */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className={cn(
            'p-8 text-center transition-colors',
            isBreakPhase ? 'bg-gradient-to-br from-emerald-50 to-teal-50' : 'bg-gradient-to-br from-indigo-50 to-violet-50',
          )}>
            {/* Phase label */}
            <div className="mb-4 flex items-center justify-center gap-2">
              {isFocusActive && (
                <Badge className="bg-indigo-100 text-indigo-700">
                  <span className="mr-1">🎯</span>
                  Focus Mode Active
                </Badge>
              )}
              {isBreakPhase ? (
                <Badge className="bg-emerald-100 text-emerald-700">
                  <Coffee className="mr-1 h-3 w-3" />
                  Break Time
                </Badge>
              ) : !isFocusActive && timerState !== 'completed' && (
                <Badge className="bg-indigo-100 text-indigo-700">
                  <Brain className="mr-1 h-3 w-3" />
                  Focus Time
                </Badge>
              )}
            </div>

            {/* Circular timer */}
            <div className="relative mx-auto flex h-64 w-64 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="10" />
                <circle
                  cx="100" cy="100" r="90" fill="none"
                  stroke={isBreakPhase ? '#10b981' : '#6366f1'}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 90}
                  strokeDashoffset={2 * Math.PI * 90 * (1 - progress / 100)}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="text-center">
                <p className={cn('text-6xl font-bold tabular-nums', isBreakPhase ? 'text-emerald-700' : 'text-slate-900')}>
                  {formatTime(secondsLeft)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {timerState === 'idle' && 'Ready to start'}
                  {timerState === 'running' && 'Focusing...'}
                  {timerState === 'paused' && 'Paused'}
                  {timerState === 'break' && 'Take a break!'}
                  {timerState === 'completed' && 'Complete!'}
                </p>
              </div>
            </div>

            {/* DND suggestion */}
            {isFocusActive && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <BellOff className="h-3.5 w-3.5" />
                For complete device-wide blocking, turn on your phone's Do Not Disturb / Focus Mode.
              </p>
            )}

            {/* Controls */}
            <div className="mt-8 flex items-center justify-center gap-3">
              {timerState === 'idle' && (
                <Button onClick={startTimer} size="lg" className="h-14 bg-indigo-600 px-8 text-lg hover:bg-indigo-700">
                  <Play className="mr-2 h-5 w-5" />
                  Start Focus
                </Button>
              )}
              {timerState === 'running' && (
                <>
                  <Button onClick={pauseTimer} size="lg" variant="outline" className="h-14 border-slate-300 px-6 text-lg">
                    <Pause className="mr-2 h-5 w-5" />
                    Pause
                  </Button>
                  <Button onClick={skipToBreak} size="lg" variant="ghost" className="h-14 px-6 text-slate-500">
                    Skip
                  </Button>
                  <Button onClick={endSession} size="lg" variant="ghost" className="h-14 px-6 text-rose-500 hover:bg-rose-50">
                    End
                  </Button>
                </>
              )}
              {timerState === 'paused' && (
                <>
                  <Button onClick={resumeTimer} size="lg" className="h-14 bg-indigo-600 px-8 text-lg hover:bg-indigo-700">
                    <Play className="mr-2 h-5 w-5" />
                    Resume
                  </Button>
                  <Button onClick={endSession} size="lg" variant="ghost" className="h-14 px-6 text-rose-500 hover:bg-rose-50">
                    End Session
                  </Button>
                </>
              )}
              {timerState === 'break' && (
                <div className="flex items-center gap-3 text-emerald-600">
                  <Coffee className="h-6 w-6" />
                  <p className="text-lg font-medium">Break in progress...</p>
                </div>
              )}
              {timerState === 'completed' && (
                <Button onClick={resetTimer} size="lg" className="h-14 bg-emerald-600 px-8 text-lg hover:bg-emerald-700">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Start New Session
                </Button>
              )}
              <Button
                onClick={toggleFullscreen}
                size="lg"
                variant="outline"
                className="h-14 border-slate-300 px-4 text-slate-600 hover:bg-slate-50"
                title="Enter distraction-free fullscreen mode"
              >
                <Maximize2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Preset selection */}
        <Card className="border-slate-200 p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Session Type</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            {PRESETS.map((preset, i) => {
              const Icon = preset.icon;
              return (
                <button
                  key={i}
                  onClick={() => handlePresetChange(i)}
                  disabled={timerState === 'running' || timerState === 'break'}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition',
                    selectedPreset === i
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-indigo-200',
                    (timerState === 'running' || timerState === 'break') && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <Icon className={cn('h-6 w-6', selectedPreset === i ? 'text-indigo-600' : 'text-slate-400')} />
                  <div className="text-center">
                    <p className={cn('text-sm font-semibold', selectedPreset === i ? 'text-indigo-700' : 'text-slate-700')}>{preset.label}</p>
                    <p className="text-xs text-slate-500">{preset.focus}min focus · {preset.break}min break</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Subject selection */}
        <Card className="border-slate-200 p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">What are you studying?</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            {SUBJECTS.map((subject) => {
              const Icon = subject.icon;
              return (
                <button
                  key={subject.name}
                  onClick={() => setSelectedSubject(subject.name)}
                  disabled={timerState === 'running' || timerState === 'break'}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border-2 p-4 transition',
                    selectedSubject === subject.name
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-indigo-200',
                    (timerState === 'running' || timerState === 'break') && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', subject.color)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={cn('text-sm font-medium', selectedSubject === subject.name ? 'text-indigo-700' : 'text-slate-700')}>
                    {subject.name}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Session info */}
        {sessionCount > 0 && (
          <Card className="border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  {sessionCount} focus session{sessionCount === 1 ? '' : 's'} completed!
                </p>
                <p className="text-xs text-emerald-600">
                  Total focus time: {sessionCount * currentPreset.focus} minutes. Keep going!
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Tips */}
        <Card className="border-slate-200 p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Focus Tips</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p className="flex items-start gap-2"><span className="text-indigo-600">•</span> Put your phone on silent and close other tabs.</p>
            <p className="flex items-start gap-2"><span className="text-indigo-600">•</span> Use fullscreen mode for maximum distraction-free studying.</p>
            <p className="flex items-start gap-2"><span className="text-indigo-600">•</span> PadanaMithra notifications are automatically suppressed during Focus Mode.</p>
            <p className="flex items-start gap-2"><span className="text-indigo-600">•</span> For device-wide blocking, enable Do Not Disturb on your phone.</p>
            <p className="flex items-start gap-2"><span className="text-indigo-600">•</span> Take breaks seriously — your brain needs them to retain information.</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

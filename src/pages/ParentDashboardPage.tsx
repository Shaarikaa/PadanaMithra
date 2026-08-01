import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, LogOut, Clock, BookOpen, Brain, FileText, Target, RefreshCw, Mail, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Clock3, ChevronRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  getParentSession,
  parentLogout,
  getConnectedStudents,
  getMonthlyReports,
  generateMonthlyReport,
} from '@/lib/parentService';
import { useApp } from '@/lib/AppContext';
import type { ParentStudentConnection, MonthlyReport } from '@/lib/types';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function ParentDashboardPage() {
  const { navigate } = useApp();
  const [session, setSession] = useState(getParentSession());
  const [connections, setConnections] = useState<ParentStudentConnection[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ParentStudentConnection | null>(null);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    const conns = await getConnectedStudents();
    setConnections(conns);
    if (conns.length > 0 && !selectedStudent) {
      setSelectedStudent(conns[0]);
    }
    setLoading(false);
  }, [selectedStudent]);

  useEffect(() => {
    if (!session) {
      navigate({ name: 'parent-login' });
      return;
    }
    loadConnections();
  }, [session, navigate, loadConnections]);

  useEffect(() => {
    if (selectedStudent) {
      getMonthlyReports(selectedStudent.studentId).then(setReports);
    } else {
      setReports([]);
    }
  }, [selectedStudent]);

  const handleLogout = () => {
    parentLogout();
    setSession(null);
    navigate({ name: 'landing' });
  };

  const handleGenerateReport = async () => {
    if (!selectedStudent) return;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    setGenerating(true);
    await generateMonthlyReport(selectedStudent.studentId, month, year);
    const updated = await getMonthlyReports(selectedStudent.studentId);
    setReports(updated);
    setGenerating(false);
  };

  if (!session) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/60">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-400" />
          <p className="mt-3 text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ name: 'landing' })}
              className="flex items-center gap-2 transition hover:opacity-80"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span className="text-lg font-semibold tracking-tight text-slate-900">Padanamithra</span>
            </button>
            <span className="hidden rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 sm:inline">
              Parent Dashboard
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-rose-600 hover:text-rose-700">
            <LogOut className="mr-1.5 h-4 w-4" />
            Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Welcome */}
        <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-200/50 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome, {session.name} 👋
          </h1>
          <p className="mt-1.5 text-sm text-indigo-100">
            {selectedStudent
              ? `Here's ${selectedStudent.studentName}'s learning progress.`
              : 'Select a student to view their progress.'}
          </p>
        </div>

        {/* Student selector if multiple */}
        {connections.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {connections.map((conn) => (
              <button
                key={conn.id}
                onClick={() => setSelectedStudent(conn)}
                className={cn(
                  'rounded-xl border px-4 py-2 text-sm font-medium transition',
                  selectedStudent?.id === conn.id
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300',
                )}
              >
                {conn.studentName}
              </button>
            ))}
          </div>
        )}

        {connections.length === 0 ? (
          <Card className="border-slate-200 p-8 text-center shadow-sm">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-lg font-bold text-slate-900">No active connections</h3>
            <p className="mt-1 text-sm text-slate-500">
              No students are currently connected to your parent account. Ask your child to connect you from their profile settings.
            </p>
          </Card>
        ) : selectedStudent ? (
          <div className="space-y-6">
            {/* Current Month Report */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Monthly Learning Report</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateReport}
                disabled={generating}
                className="border-slate-300"
              >
                <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', generating && 'animate-spin')} />
                {generating ? 'Generating...' : 'Generate Current Month'}
              </Button>
            </div>

            {/* Latest Report */}
            {reports.length > 0 ? (
              <ReportCard report={reports[0]} />
            ) : (
              <Card className="border-dashed border-slate-300 p-8 text-center shadow-sm">
                <FileText className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">No reports generated yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  Click "Generate Current Month" to create a report from real learning activity data.
                </p>
              </Card>
            )}

            {/* Report History */}
            {reports.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-bold text-slate-900">Report History</h2>
                <div className="space-y-2">
                  {reports.map((report) => (
                    <ReportHistoryRow key={report.id} report={report} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function ReportCard({ report }: { report: MonthlyReport }) {
  const hasData = report.subjectsStudied > 0 || report.revisionSessions > 0 || report.questionsPracticed > 0;
  const hours = Math.floor(report.studyTimeMinutes / 60);
  const mins = report.studyTimeMinutes % 60;

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h3 className="text-sm font-semibold">
              {MONTH_NAMES[report.month - 1]} {report.year}
            </h3>
          </div>
          <EmailStatusBadge status={report.reportStatus} emailSentAt={report.emailSentAt} />
        </div>
      </div>

      <div className="p-5">
        {!hasData ? (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-500">Not enough learning activity has been recorded this month.</p>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard icon={Clock} label="Study Time" value={`${hours}h ${mins}m`} color="text-amber-600 bg-amber-50" />
              <StatCard icon={BookOpen} label="Subjects Studied" value={String(report.subjectsStudied)} color="text-indigo-600 bg-indigo-50" />
              <StatCard icon={Brain} label="Topics Studied" value={String(report.topicsStudied)} color="text-violet-600 bg-violet-50" />
              <StatCard icon={Target} label="Questions Practiced" value={String(report.questionsPracticed)} color="text-rose-600 bg-rose-50" />
              <StatCard icon={Target} label="Practice Sessions" value={String(report.practiceSessions)} color="text-sky-600 bg-sky-50" />
              <StatCard icon={Brain} label="Revision Sessions" value={String(report.revisionSessions)} color="text-emerald-600 bg-emerald-50" />
            </div>

            {/* Subject-wise activity */}
            {Object.keys(report.subjectActivity).length > 0 && (
              <div className="mt-5">
                <h4 className="mb-3 text-sm font-semibold text-slate-900">Subject-wise Activity</h4>
                <div className="space-y-2">
                  {Object.entries(report.subjectActivity).map(([subject, count]) => (
                    <div key={subject} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-2.5">
                      <span className="text-sm font-medium text-slate-700">{subject}</span>
                      <span className="text-sm text-slate-500">{count} topic{count === 1 ? '' : 's'} studied</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="mt-5 rounded-xl bg-indigo-50/60 p-4">
              <p className="text-xs font-semibold text-indigo-700">Learning Summary</p>
              <p className="mt-1 text-sm text-slate-700">{report.summary}</p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', color)}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function EmailStatusBadge({ status, emailSentAt }: { status: string; emailSentAt: string | null }) {
  if (status === 'sent') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-100">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Sent
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-100">
        <AlertCircle className="h-3.5 w-3.5" />
        Delivery failed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-100">
      <Clock3 className="h-3.5 w-3.5" />
      Pending
    </span>
  );
}

function ReportHistoryRow({ report }: { report: MonthlyReport }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50/50"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{MONTH_NAMES[report.month - 1]} {report.year}</p>
            <p className="text-xs text-slate-500">
              {report.subjectsStudied} subjects · {report.topicsStudied} topics · {report.questionsPracticed} questions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <EmailStatusBadge status={report.reportStatus} emailSentAt={report.emailSentAt} />
          <ChevronRight className={cn('h-4 w-4 text-slate-400 transition', expanded && 'rotate-90')} />
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-400">Study Time</p>
              <p className="text-sm font-semibold text-slate-800">
                {Math.floor(report.studyTimeMinutes / 60)}h {report.studyTimeMinutes % 60}m
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Practice Sessions</p>
              <p className="text-sm font-semibold text-slate-800">{report.practiceSessions}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Revision Sessions</p>
              <p className="text-sm font-semibold text-slate-800">{report.revisionSessions}</p>
            </div>
          </div>
          {Object.keys(report.subjectActivity).length > 0 && (
            <div className="mt-3 space-y-1.5">
              {Object.entries(report.subjectActivity).map(([subject, count]) => (
                <div key={subject} className="flex justify-between text-xs">
                  <span className="text-slate-600">{subject}</span>
                  <span className="text-slate-500">{count} topics</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 rounded-lg bg-indigo-50/60 p-3">
            <p className="text-xs text-slate-700">{report.summary}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

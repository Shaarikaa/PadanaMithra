// Parent Dashboard Service — manages parent-student connections, parent auth,
// and monthly report data via Supabase edge functions and direct queries.

import { supabase } from './supabaseClient';
import { loadJSON, saveJSON, removeKey, STORAGE_KEYS } from './storage';
import type { ParentStudentConnection, MonthlyReport } from './types';

function getStudentUserId(): string | null {
  const user = loadJSON<{ email: string } | null>(STORAGE_KEYS.currentUser, null);
  if (!user) return null;
  return user.email.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ---- Student-side: connect a parent ----

export interface ConnectParentResult {
  success: boolean;
  error?: string;
}

export async function connectParent(parentName: string, parentEmail: string, studentName?: string): Promise<ConnectParentResult> {
  const studentUserId = getStudentUserId();
  if (!studentUserId) return { success: false, error: 'Not logged in' };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/parent-connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
        'x-user-id': studentUserId,
      },
      body: JSON.stringify({
        action: 'connect_parent',
        studentUserId,
        parentName: parentName.trim(),
        parentEmail: parentEmail.trim().toLowerCase(),
        studentName: studentName?.trim() || 'Student',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to connect parent' };
    }

    saveJSON('parentConnected', { name: parentName.trim(), email: parentEmail.trim().toLowerCase() });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ---- Student-side: get current connection ----

export function getParentConnection(): { name: string; email: string } | null {
  return loadJSON<{ name: string; email: string } | null>('parentConnected', null);
}

// ---- Student-side: disconnect parent ----

export async function disconnectParent(): Promise<ConnectParentResult> {
  const studentUserId = getStudentUserId();
  if (!studentUserId) return { success: false, error: 'Not logged in' };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/parent-connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
        'x-user-id': studentUserId,
      },
      body: JSON.stringify({
        action: 'disconnect_parent',
        studentUserId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to disconnect' };
    }

    removeKey('parentConnected');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ---- Parent-side: login ----

export interface ParentLoginResult {
  success: boolean;
  error?: string;
  parent?: { id: string; name: string; email: string };
}

export async function parentLogin(email: string, password: string): Promise<ParentLoginResult> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/parent-connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'parent_login',
        parentEmail: email.trim().toLowerCase(),
        parentPassword: password,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Login failed' };
    }

    saveJSON('parentSession', {
      id: data.parent.id,
      name: data.parent.name,
      email: data.parent.email,
    });

    return { success: true, parent: data.parent };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// ---- Parent-side: get current session ----

export function getParentSession(): { id: string; name: string; email: string } | null {
  return loadJSON<{ id: string; name: string; email: string } | null>('parentSession', null);
}

// ---- Parent-side: logout ----

export function parentLogout(): void {
  removeKey('parentSession');
}

// ---- Parent-side: get connected students ----

export async function getConnectedStudents(): Promise<ParentStudentConnection[]> {
  const session = getParentSession();
  if (!session) return [];

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/parent-connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
        'x-user-id': session.id,
      },
      body: JSON.stringify({
        action: 'get_connections',
        parentId: session.id,
      }),
    });

    const data = await response.json();
    if (!response.ok) return [];

    return (data.connections as ParentStudentConnection[]) || [];
  } catch {
    return [];
  }
}

// ---- Parent-side: get monthly reports for a student ----

export async function getMonthlyReports(studentUserId: string): Promise<MonthlyReport[]> {
  const session = getParentSession();
  if (!session) return [];

  try {
    const { data, error } = await supabase
      .from('monthly_reports')
      .select('*')
      .eq('student_user_id', studentUserId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error || !data) return [];

    return data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      studentUserId: r.student_user_id as string,
      studentName: r.student_name as string,
      parentId: r.parent_id as string,
      month: r.month as number,
      year: r.year as number,
      studyTimeMinutes: r.study_time_minutes as number,
      subjectsStudied: r.subjects_studied as number,
      topicsStudied: r.topics_studied as number,
      questionsPracticed: r.questions_practiced as number,
      practiceSessions: r.practice_sessions as number,
      revisionSessions: r.revision_sessions as number,
      subjectActivity: (r.subject_activity as Record<string, number>) || {},
      summary: r.summary as string,
      reportStatus: r.report_status as 'pending' | 'sent' | 'failed',
      emailSentAt: (r.email_sent_at as string | null) ?? null,
      createdAt: r.created_at as string,
    }));
  } catch {
    return [];
  }
}

// ---- Parent-side: generate report on-demand (for current month) ----

export interface GenerateReportResult {
  success: boolean;
  report?: MonthlyReport;
  error?: string;
}

export async function generateMonthlyReport(studentUserId: string, month: number, year: number): Promise<GenerateReportResult> {
  const session = getParentSession();
  if (!session) return { success: false, error: 'Not logged in' };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/monthly-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
        'x-user-id': session.id,
      },
      body: JSON.stringify({
        action: 'generate_report',
        studentUserId,
        parentId: session.id,
        month,
        year,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to generate report' };
    }

    return { success: true, report: data.report };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

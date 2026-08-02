// Auth Service — real backend authentication via the student-auth edge function.
// Sessions persist via a token stored in localStorage (NOT the password).
// All password hashing happens server-side — the frontend never sees the hash.

import { supabase } from './supabaseClient';
import { loadJSON, removeKey, saveJSON, STORAGE_KEYS } from './storage';
import type { StudentProfile } from './types';

export interface AuthUser {
  email: string;
  name: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  accountExists?: boolean;
  user?: AuthUser;
  sessionToken?: string;
}

function emailToUserId(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function callAuthFunction(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/student-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { error: err.error ?? `Request failed (${response.status})`, accountExists: err.accountExists };
  }

  return response.json();
}

export async function signup(name: string, email: string, password: string): Promise<AuthResult> {
  try {
    const data = await callAuthFunction({ action: 'signup', name, email, password });
    if (data.success) {
      return {
        ok: true,
        user: data.user as AuthUser,
        sessionToken: data.sessionToken as string,
      };
    }
    return {
      ok: false,
      error: data.error as string,
      accountExists: data.accountExists as boolean,
    };
  } catch {
    return { ok: false, error: 'We couldn\'t connect to Padanamithra. Please try again.' };
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const data = await callAuthFunction({ action: 'login', email, password });
    if (data.success) {
      return {
        ok: true,
        user: data.user as AuthUser,
        sessionToken: data.sessionToken as string,
      };
    }
    return { ok: false, error: data.error as string };
  } catch {
    return { ok: false, error: 'We couldn\'t connect to Padanamithra. Please try again.' };
  }
}

export async function verifySession(sessionToken: string): Promise<{ valid: boolean; user?: AuthUser; expired?: boolean }> {
  try {
    const data = await callAuthFunction({ action: 'verify_session', sessionToken });
    return {
      valid: data.valid === true,
      user: data.user as AuthUser | undefined,
      expired: data.expired as boolean | undefined,
    };
  } catch {
    return { valid: false };
  }
}

export async function logout(sessionToken: string | null): Promise<void> {
  if (sessionToken) {
    try {
      await callAuthFunction({ action: 'logout', sessionToken });
    } catch {
      // ignore network errors on logout
    }
  }
}

export async function resetPassword(email: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = await callAuthFunction({ action: 'reset_password', email, newPassword });
    if (data.success) return { ok: true };
    return { ok: false, error: data.error as string };
  } catch {
    return { ok: false, error: 'We couldn\'t connect to Padanamithra. Please try again.' };
  }
}

// ---- Session storage helpers ----

export function saveSession(user: AuthUser, sessionToken: string): void {
  saveJSON(STORAGE_KEYS.currentUser, user);
  saveJSON('sessionToken', sessionToken);
}

export function getSessionToken(): string | null {
  return loadJSON<string | null>('sessionToken', null);
}

export function clearSession(): void {
  removeKey(STORAGE_KEYS.currentUser);
  removeKey('sessionToken');
}

// ---- Profile persistence (Supabase) ----

export async function fetchProfile(userId: string): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    fullName: data.full_name ?? '',
    dateOfBirth: data.date_of_birth ?? '',
    board: data.board ?? '',
    classLevel: data.class_level ?? '',
    selectedSubjects: data.selected_subjects ?? [],
    currentSubject: data.current_subject ?? '',
    currentChapter: data.current_chapter ?? '',
    currentTopic: data.current_topic ?? '',
    preferredLanguage: (data.preferred_language as 'en' | 'ml') ?? 'en',
    onboardingCompleted: data.onboarding_completed ?? false,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at).getTime(),
  };
}

export async function saveProfileToBackend(profile: StudentProfile): Promise<void> {
  const data = await callAuthFunction({
    action: 'save_profile',
    userId: profile.userId,
    fullName: profile.fullName,
    dateOfBirth: profile.dateOfBirth,
    board: profile.board,
    classLevel: profile.classLevel,
    selectedSubjects: profile.selectedSubjects,
    currentSubject: profile.currentSubject,
    currentChapter: profile.currentChapter,
    currentTopic: profile.currentTopic,
    preferredLanguage: profile.preferredLanguage,
    onboardingCompleted: profile.onboardingCompleted,
  });

  if (!data.success) {
    throw new Error(data.error as string);
  }
}

// ---- Local profile fallback (for migration) ----

export function loadLocalProfile(userId: string): StudentProfile | null {
  const all = loadJSON<Record<string, StudentProfile>>(STORAGE_KEYS.profiles, {});
  return all[userId] ?? null;
}

export function migrateLocalProfile(userId: string): StudentProfile | null {
  const local = loadLocalProfile(userId);
  if (local) {
    // Upload to backend
    saveProfileToBackend(local).catch(() => {});
  }
  return local;
}

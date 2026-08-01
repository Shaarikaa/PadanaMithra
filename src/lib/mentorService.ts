// Mentor Service — manages mentor assignment, chat, and follow-ups via Supabase.

import { supabase } from './supabaseClient';
import { loadJSON, STORAGE_KEYS } from './storage';
import type { StudentProfile } from './types';

export interface Mentor {
  id: string;
  name: string;
  subject_expertise: string;
  experience: string;
  languages: string[];
  availability_status: 'available' | 'away' | 'offline';
  bio: string;
  is_demo: boolean;
}

export interface MentorAssignment {
  id: string;
  student_id: string;
  mentor_id: string;
  assigned_at: string;
  status: 'active' | 'ended';
  mentor?: Mentor;
}

export interface MentorMessage {
  id: string;
  student_id: string;
  mentor_id: string;
  sender: 'student' | 'mentor';
  message: string;
  created_at: string;
}

export interface MentorFollowup {
  id: string;
  student_id: string;
  mentor_id: string;
  guidance: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
}

function getUserId(): string | null {
  const user = loadJSON<{ email: string } | null>(STORAGE_KEYS.currentUser, null);
  if (!user) return null;
  return user.email.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function getAssignedMentor(): Promise<MentorAssignment | null> {
  const userId = getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from('mentor_assignments')
    .select(`
      *,
      mentor:mentors(*)
    `)
    .eq('student_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) return null;
  return data as MentorAssignment;
}

export async function getMentorMessages(): Promise<MentorMessage[]> {
  const userId = getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('mentor_messages')
    .select('*')
    .eq('student_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as MentorMessage[];
}

export async function sendMessageToMentor(message: string): Promise<{ ok: boolean; reply?: string; error?: string }> {
  const userId = getUserId();
  if (!userId) return { ok: false, error: 'Not logged in' };

  // Get the student's assigned mentor
  const { data: assignment } = await supabase
    .from('mentor_assignments')
    .select('mentor_id')
    .eq('student_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!assignment) {
    return { ok: false, error: 'No mentor assigned yet' };
  }

  // Save the student's message
  const { error: insertError } = await supabase
    .from('mentor_messages')
    .insert({
      student_id: userId,
      mentor_id: assignment.mentor_id,
      sender: 'student',
      message,
    });

  if (insertError) return { ok: false, error: insertError.message };

  // Get student context for the mentor reply
  const profiles = loadJSON<Record<string, StudentProfile>>(STORAGE_KEYS.profiles, {});
  const profile = profiles[userId];

  const context = {
    subject: profile?.currentSubject,
    chapter: profile?.currentChapter,
    topic: profile?.currentTopic,
  };

  // Call the mentor-reply edge function for a context-aware response
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/mentor-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        'x-user-id': userId,
      },
      body: JSON.stringify({
        studentId: userId,
        userMessage: message,
        context,
      }),
    });

    if (!response.ok) {
      return { ok: true }; // Message was saved even if reply failed
    }

    const data = await response.json();
    return { ok: true, reply: data.reply };
  } catch {
    return { ok: true }; // Message was saved even if reply failed
  }
}

export async function getMentorFollowups(): Promise<MentorFollowup[]> {
  const userId = getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('mentor_followups')
    .select('*')
    .eq('student_id', userId)
    .eq('completed', false)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as MentorFollowup[];
}

export async function completeFollowup(followupId: string): Promise<boolean> {
  const userId = getUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from('mentor_followups')
    .update({ completed: true })
    .eq('id', followupId)
    .eq('student_id', userId);

  return !error;
}

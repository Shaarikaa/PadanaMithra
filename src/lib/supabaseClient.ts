import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Custom fetch that injects the x-user-id header from localStorage on every request.
// This allows RLS policies to identify the current user without Supabase Auth.
// The user ID is derived from the email (same pattern used across the app).
const supabaseFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);

  try {
    const rawUser = localStorage.getItem('padanamithra:currentUser');

    if (rawUser) {
      const user = JSON.parse(rawUser) as { email: string };
      if (user.email) {
        const userId = user.email.toLowerCase().replace(/[^a-z0-9]/g, '');
        headers.set('x-user-id', userId);
      }
    }
  } catch {
    // ignore parse errors
  }

  return fetch(input, { ...init, headers });
};

// Initialize with fallback values so the app never crashes at module load.
// When env vars are missing, isSupabaseConfigured is false and all queries
// return empty/error results gracefully via the existing error handling.
export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: supabaseFetch,
    },
  },
);

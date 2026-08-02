import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Custom fetch that injects the x-user-id header from localStorage on every request.
// This allows RLS policies to identify the current user without Supabase Auth.
// The user ID is derived from the email (same pattern used across the app).
const supabaseFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);

  try {
    // Try the session token first (new auth system), then fall back to currentUser
    const sessionToken = localStorage.getItem('padanamithra:sessionToken');
    const rawUser = localStorage.getItem('padanamithra:currentUser');

    if (rawUser) {
      const user = JSON.parse(rawUser) as { email: string };
      if (user.email) {
        const userId = user.email.toLowerCase().replace(/[^a-z0-9]/g, '');
        headers.set('x-user-id', userId);
      }
    }
    // Note: sessionToken is used by the auth edge function, not by RLS directly.
    // The x-user-id header is what RLS policies use to identify the user.
  } catch {
    // ignore parse errors
  }

  return fetch(input, { ...init, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
  global: {
    fetch: supabaseFetch,
  },
});

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Custom fetch that injects the x-user-id header from localStorage on every request.
// This allows RLS policies to identify the current user without Supabase Auth.
const supabaseFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);

  try {
    const raw = localStorage.getItem('padanamithra:currentUser');
    if (raw) {
      const user = JSON.parse(raw) as { email: string };
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
  global: {
    fetch: supabaseFetch,
  },
});

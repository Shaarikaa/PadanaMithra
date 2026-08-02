/*
# Create student authentication and profile tables

1. Purpose
   This migration replaces the localStorage-only auth system with real backend
   authentication. Previously, user accounts (including plaintext passwords) were
   stored only in the browser's localStorage — so returning students had no
   persistent account to log into. This migration creates:

   - student_auth: stores email + bcrypt password hash + session token per student
   - student_profiles: stores the onboarding profile linked to the student's auth ID

2. New Tables

   a) student_auth
      - id (uuid, primary key)
      - email (text, unique, not null) — student's login email
      - name (text, not null) — display name
      - password_hash (text, not null) — bcrypt hash (never plaintext)
      - session_token (text, unique) — persistent session token for browser storage
      - session_expires_at (timestamptz) — token expiry
      - created_at (timestamptz, default now())
      - updated_at (timestamptz, default now())

   b) student_profiles
      - id (uuid, primary key)
      - user_id (text, not null, unique) — the email-derived ID used across the app
      - email (text, not null) — for easy lookup
      - full_name (text)
      - date_of_birth (text)
      - board (text)
      - class_level (text)
      - selected_subjects (text[])
      - current_subject (text)
      - current_chapter (text)
      - current_topic (text)
      - preferred_language (text, default 'en')
      - onboarding_completed (boolean, default false)
      - created_at (timestamptz, default now())
      - updated_at (timestamptz, default now())

3. Security
   - RLS enabled on both tables.
   - student_auth: SELECT only for the owner (via get_current_user_id). No INSERT/UPDATE/DELETE
     from the frontend — all mutations go through the auth edge function (service role).
   - student_profiles: full CRUD for the owner via get_current_user_id().
   - Password hashes are never exposed to the frontend (the edge function strips them).

4. Important Notes
   - The existing email-derived user_id pattern (email.toLowerCase().replace(/[^a-z0-9]/g,''))
     is preserved so existing subscription/entitlement rows remain linked.
   - Existing localStorage profiles are NOT lost — the app will attempt to migrate them
     to the backend on first login after this update.
   - The pgcrypto extension is required for gen_random_uuid() (already enabled).
*/

-- ===========================================
-- a) student_auth
-- ===========================================
CREATE TABLE IF NOT EXISTS student_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  session_token text UNIQUE,
  session_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE student_auth ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sa_select_own" ON student_auth;
CREATE POLICY "sa_select_own" ON student_auth FOR SELECT
  TO anon, authenticated USING (get_current_user_id() = lower(email));

-- No INSERT/UPDATE/DELETE from frontend — managed via edge function (service role)

-- ===========================================
-- b) student_profiles
-- ===========================================
CREATE TABLE IF NOT EXISTS student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  email text NOT NULL,
  full_name text,
  date_of_birth text,
  board text,
  class_level text,
  selected_subjects text[] DEFAULT '{}',
  current_subject text,
  current_chapter text,
  current_topic text,
  preferred_language text DEFAULT 'en',
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sp_select_own" ON student_profiles;
CREATE POLICY "sp_select_own" ON student_profiles FOR SELECT
  TO anon, authenticated USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "sp_insert_own" ON student_profiles;
CREATE POLICY "sp_insert_own" ON student_profiles FOR INSERT
  TO anon, authenticated WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "sp_update_own" ON student_profiles;
CREATE POLICY "sp_update_own" ON student_profiles FOR UPDATE
  TO anon, authenticated USING (user_id = get_current_user_id()) WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "sp_delete_own" ON student_profiles;
CREATE POLICY "sp_delete_own" ON student_profiles FOR DELETE
  TO anon, authenticated USING (user_id = get_current_user_id());

CREATE INDEX IF NOT EXISTS idx_sp_user_id ON student_profiles (user_id);

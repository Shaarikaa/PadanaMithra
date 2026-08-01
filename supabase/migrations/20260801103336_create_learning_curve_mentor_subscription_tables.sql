/*
# Create Learning Curve, Mentor, and Subscription Tables

1. Purpose
   This migration adds three new feature areas to PadanaMithra:
   - Learning Curve: spaced-repetition review system for difficult concepts
   - Personal Mentor: continuous human mentor guidance for premium students
   - Subscription: premium subscription state tracking

2. New Tables

   a) learning_curve_items
      - Stores topics a student has marked for spaced review
      - Fields: id, user_id, subject, chapter, topic, reason, difficulty,
        created_at, next_review_at, review_interval_days, review_count, retention_status

   b) learning_curve_reviews
      - Records each review attempt for a learning curve item
      - Fields: id, item_id, user_id, response, result, reviewed_at, next_review_at

   c) mentors
      - Demo mentor profiles (clearly labeled as demo data)
      - Fields: id, name, subject_expertise, experience, languages, availability_status,
        bio, is_demo, created_at

   d) mentor_assignments
      - Maps students to their assigned mentor
      - Fields: id, student_id, mentor_id, assigned_at, status

   e) mentor_messages
      - Chat messages between student and mentor
      - Fields: id, student_id, mentor_id, sender, message, created_at

   f) mentor_followups
      - Follow-up guidance left by mentor for a student
      - Fields: id, student_id, mentor_id, guidance, due_date, completed, created_at

   g) subscriptions
      - Tracks premium subscription state per user
      - Fields: id, user_id, plan, status, provider, subscription_id,
        started_at, expires_at, created_at, updated_at

3. Security
   - RLS enabled on ALL tables.
   - Since the app uses localStorage-based auth (no Supabase auth), all policies
     use TO anon, authenticated with user_id-based filtering via a helper function.
   - A helper function get_current_user_id() reads the user ID from request headers
     sent by the frontend (x-user-id header).

4. Important Notes
   - All tables use a text-based user_id (derived from email) matching the existing
     localStorage-based auth system.
   - Mentor data is clearly labeled as demo.
   - No sensitive student data (DOB, password, etc.) is stored in these tables.
*/

-- Helper function: extract user_id from the x-user-id header
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.headers', true)::json->>'x-user-id',
    ''
  );
$$;

-- ===========================================
-- a) learning_curve_items
-- ===========================================
CREATE TABLE IF NOT EXISTS learning_curve_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject text NOT NULL,
  chapter text NOT NULL,
  topic text NOT NULL,
  reason text NOT NULL DEFAULT 'manual',
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at timestamptz DEFAULT now(),
  next_review_at timestamptz NOT NULL DEFAULT now(),
  review_interval_days integer NOT NULL DEFAULT 1,
  review_count integer NOT NULL DEFAULT 0,
  retention_status text NOT NULL DEFAULT 'learning' CHECK (retention_status IN ('learning', 'reviewing', 'retained', 'needs_reinforcement'))
);

ALTER TABLE learning_curve_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lc_select_own" ON learning_curve_items;
CREATE POLICY "lc_select_own" ON learning_curve_items FOR SELECT
  TO anon, authenticated USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "lc_insert_own" ON learning_curve_items;
CREATE POLICY "lc_insert_own" ON learning_curve_items FOR INSERT
  TO anon, authenticated WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "lc_update_own" ON learning_curve_items;
CREATE POLICY "lc_update_own" ON learning_curve_items FOR UPDATE
  TO anon, authenticated USING (user_id = get_current_user_id()) WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "lc_delete_own" ON learning_curve_items;
CREATE POLICY "lc_delete_own" ON learning_curve_items FOR DELETE
  TO anon, authenticated USING (user_id = get_current_user_id());

CREATE INDEX IF NOT EXISTS idx_lc_items_user_next_review ON learning_curve_items (user_id, next_review_at);

-- ===========================================
-- b) learning_curve_reviews
-- ===========================================
CREATE TABLE IF NOT EXISTS learning_curve_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES learning_curve_items(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  response text NOT NULL DEFAULT '',
  result text NOT NULL DEFAULT 'incorrect' CHECK (result IN ('correct', 'incorrect', 'partial')),
  reviewed_at timestamptz DEFAULT now(),
  next_review_at timestamptz
);

ALTER TABLE learning_curve_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lcr_select_own" ON learning_curve_reviews;
CREATE POLICY "lcr_select_own" ON learning_curve_reviews FOR SELECT
  TO anon, authenticated USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "lcr_insert_own" ON learning_curve_reviews;
CREATE POLICY "lcr_insert_own" ON learning_curve_reviews FOR INSERT
  TO anon, authenticated WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "lcr_delete_own" ON learning_curve_reviews;
CREATE POLICY "lcr_delete_own" ON learning_curve_reviews FOR DELETE
  TO anon, authenticated USING (user_id = get_current_user_id());

CREATE INDEX IF NOT EXISTS idx_lcr_item ON learning_curve_reviews (item_id);

-- ===========================================
-- c) mentors
-- ===========================================
CREATE TABLE IF NOT EXISTS mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject_expertise text NOT NULL,
  experience text NOT NULL,
  languages text[] NOT NULL DEFAULT '{}',
  availability_status text NOT NULL DEFAULT 'offline' CHECK (availability_status IN ('available', 'away', 'offline')),
  bio text NOT NULL DEFAULT '',
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;

-- Mentors are readable by all (they are public profiles)
DROP POLICY IF EXISTS "mentors_select_all" ON mentors;
CREATE POLICY "mentors_select_all" ON mentors FOR SELECT
  TO anon, authenticated USING (true);

-- No insert/update/delete from the frontend — managed via SQL/edge functions

-- ===========================================
-- d) mentor_assignments
-- ===========================================
CREATE TABLE IF NOT EXISTS mentor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  mentor_id uuid NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended'))
);

ALTER TABLE mentor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ma_select_own" ON mentor_assignments;
CREATE POLICY "ma_select_own" ON mentor_assignments FOR SELECT
  TO anon, authenticated USING (student_id = get_current_user_id());

-- No insert/update/delete from the frontend — managed via edge function

CREATE INDEX IF NOT EXISTS idx_ma_student ON mentor_assignments (student_id);

-- ===========================================
-- e) mentor_messages
-- ===========================================
CREATE TABLE IF NOT EXISTS mentor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  mentor_id uuid NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('student', 'mentor')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mentor_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mm_select_own" ON mentor_messages;
CREATE POLICY "mm_select_own" ON mentor_messages FOR SELECT
  TO anon, authenticated USING (student_id = get_current_user_id());

DROP POLICY IF EXISTS "mm_insert_own" ON mentor_messages;
CREATE POLICY "mm_insert_own" ON mentor_messages FOR INSERT
  TO anon, authenticated WITH CHECK (student_id = get_current_user_id() AND sender = 'student');

-- Mentor replies are inserted via edge function (service role)

CREATE INDEX IF NOT EXISTS idx_mm_student_created ON mentor_messages (student_id, created_at);

-- ===========================================
-- f) mentor_followups
-- ===========================================
CREATE TABLE IF NOT EXISTS mentor_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  mentor_id uuid NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  guidance text NOT NULL,
  due_date date,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mentor_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mf_select_own" ON mentor_followups;
CREATE POLICY "mf_select_own" ON mentor_followups FOR SELECT
  TO anon, authenticated USING (student_id = get_current_user_id());

DROP POLICY IF EXISTS "mf_update_own" ON mentor_followups;
CREATE POLICY "mf_update_own" ON mentor_followups FOR UPDATE
  TO anon, authenticated USING (student_id = get_current_user_id()) WITH CHECK (student_id = get_current_user_id());

CREATE INDEX IF NOT EXISTS idx_mf_student ON mentor_followups (student_id);

-- ===========================================
-- g) subscriptions
-- ===========================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'pending', 'expired', 'cancelled')),
  provider text,
  subscription_id text,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_select_own" ON subscriptions;
CREATE POLICY "sub_select_own" ON subscriptions FOR SELECT
  TO anon, authenticated USING (user_id = get_current_user_id());

-- No insert/update/delete from the frontend — managed via edge function

CREATE INDEX IF NOT EXISTS idx_sub_user ON subscriptions (user_id);

-- ===========================================
-- Insert demo mentor data
-- ===========================================
INSERT INTO mentors (name, subject_expertise, experience, languages, availability_status, bio, is_demo)
VALUES
  ('Demo Mentor — Physics', 'Physics & Mathematics', '5+ years teaching experience (Demo)', ARRAY['English', 'Malayalam', 'Hindi'], 'available', 'Demo mentor profile — this is sample data for demonstration purposes only. No real credentials.', true),
  ('Demo Mentor — Chemistry', 'Chemistry & Biology', '4+ years teaching experience (Demo)', ARRAY['English', 'Malayalam'], 'away', 'Demo mentor profile — this is sample data for demonstration purposes only. No real credentials.', true),
  ('Demo Mentor — All Subjects', 'Multi-subject general guidance', '6+ years teaching experience (Demo)', ARRAY['English', 'Hindi', 'Malayalam'], 'available', 'Demo mentor profile — this is sample data for demonstration purposes only. No real credentials.', true)
ON CONFLICT DO NOTHING;

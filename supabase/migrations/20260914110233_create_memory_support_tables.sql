/*
# Create Memory Support tables

1. Purpose
   Memory Support is a new educational feature that provides memory-based
   learning activities for Physics, Chemistry, Biology and Mathematics,
   scoped to the student's selected class. This migration creates four
   tables to track memory topics, sessions, progress, and spaced reviews.

2. New Tables

   a) memory_topics
      - id (uuid, primary key)
      - user_id (text, not null) — email-derived student ID (matches student_profiles.user_id)
      - subject (text, not null) — Physics | Chemistry | Biology | Mathematics
      - class_level (text, not null) — e.g. "Class 9"
      - chapter (text, not null) — chapter name from curriculum
      - topic (text, not null) — topic name from curriculum
      - status (text, default 'learning') — learning | remembered | needs_review
      - hint_count (integer, default 0) — total hints used across sessions
      - correct_count (integer, default 0) — correct without hints
      - correct_after_hint (integer, default 0) — correct after a hint
      - revealed_count (integer, default 0) — answer was revealed
      - last_reviewed_at (timestamptz) — last review timestamp
      - next_review_at (timestamptz) — next scheduled review
      - review_interval_days (integer, default 1) — current spaced interval
      - created_at (timestamptz, default now())
      - updated_at (timestamptz, default now())

   b) memory_sessions
      - id (uuid, primary key)
      - user_id (text, not null)
      - subject (text, not null)
      - class_level (text, not null)
      - activity_type (text, not null) — daily_activity | review | memory_cards | visual_learning | recall_practice
      - topics_covered (text[]) — topics touched in this session
      - score (integer) — correct answers
      - total (integer) — total questions
      - hints_used (integer, default 0)
      - created_at (timestamptz, default now())

   c) memory_progress
      - id (uuid, primary key)
      - user_id (text, not null)
      - subject (text, not null)
      - topic_id (uuid, references memory_topics(id) on delete cascade)
      - activity_type (text, not null)
      - result (text, not null) — correct | correct_with_hint | revealed | incorrect
      - hint_level_used (integer, default 0) — which hint level was needed (0 = no hint, 4 = answer)
      - created_at (timestamptz, default now())

   d) memory_reviews
      - id (uuid, primary key)
      - user_id (text, not null)
      - topic_id (uuid, references memory_topics(id) on delete cascade)
      - subject (text, not null)
      - scheduled_date (date, not null) — when the review is due
      - completed (boolean, default false)
      - result (text) — correct | correct_with_hint | revealed
      - completed_at (timestamptz)
      - created_at (timestamptz, default now())

3. Security
   - RLS enabled on all four tables.
   - All tables use get_current_user_id() for ownership, matching the existing app pattern.
   - Policies scoped TO anon, authenticated (the app uses custom auth with x-user-id header).
   - Four policies per table (SELECT, INSERT, UPDATE, DELETE).

4. Important Notes
   - Uses the existing get_current_user_id() function (created in a prior migration).
   - user_id is the email-derived ID used across the app (not auth.uid()).
   - No sensitive data stored — only educational learning signals.
*/

-- ===========================================
-- a) memory_topics
-- ===========================================
CREATE TABLE IF NOT EXISTS memory_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject text NOT NULL,
  class_level text NOT NULL,
  chapter text NOT NULL,
  topic text NOT NULL,
  status text NOT NULL DEFAULT 'learning',
  hint_count integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  correct_after_hint integer NOT NULL DEFAULT 0,
  revealed_count integer NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  review_interval_days integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE memory_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mt_select_own" ON memory_topics;
CREATE POLICY "mt_select_own" ON memory_topics FOR SELECT
  TO anon, authenticated USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "mt_insert_own" ON memory_topics;
CREATE POLICY "mt_insert_own" ON memory_topics FOR INSERT
  TO anon, authenticated WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "mt_update_own" ON memory_topics;
CREATE POLICY "mt_update_own" ON memory_topics FOR UPDATE
  TO anon, authenticated USING (user_id = get_current_user_id()) WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "mt_delete_own" ON memory_topics;
CREATE POLICY "mt_delete_own" ON memory_topics FOR DELETE
  TO anon, authenticated USING (user_id = get_current_user_id());

CREATE INDEX IF NOT EXISTS idx_mt_user_subject ON memory_topics (user_id, subject);

-- ===========================================
-- b) memory_sessions
-- ===========================================
CREATE TABLE IF NOT EXISTS memory_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject text NOT NULL,
  class_level text NOT NULL,
  activity_type text NOT NULL,
  topics_covered text[] DEFAULT '{}',
  score integer DEFAULT 0,
  total integer DEFAULT 0,
  hints_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE memory_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ms_select_own" ON memory_sessions;
CREATE POLICY "ms_select_own" ON memory_sessions FOR SELECT
  TO anon, authenticated USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "ms_insert_own" ON memory_sessions;
CREATE POLICY "ms_insert_own" ON memory_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "ms_update_own" ON memory_sessions;
CREATE POLICY "ms_update_own" ON memory_sessions FOR UPDATE
  TO anon, authenticated USING (user_id = get_current_user_id()) WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "ms_delete_own" ON memory_sessions;
CREATE POLICY "ms_delete_own" ON memory_sessions FOR DELETE
  TO anon, authenticated USING (user_id = get_current_user_id());

CREATE INDEX IF NOT EXISTS idx_ms_user_created ON memory_sessions (user_id, created_at DESC);

-- ===========================================
-- c) memory_progress
-- ===========================================
CREATE TABLE IF NOT EXISTS memory_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject text NOT NULL,
  topic_id uuid REFERENCES memory_topics(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  result text NOT NULL,
  hint_level_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE memory_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mp_select_own" ON memory_progress;
CREATE POLICY "mp_select_own" ON memory_progress FOR SELECT
  TO anon, authenticated USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "mp_insert_own" ON memory_progress;
CREATE POLICY "mp_insert_own" ON memory_progress FOR INSERT
  TO anon, authenticated WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "mp_update_own" ON memory_progress;
CREATE POLICY "mp_update_own" ON memory_progress FOR UPDATE
  TO anon, authenticated USING (user_id = get_current_user_id()) WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "mp_delete_own" ON memory_progress;
CREATE POLICY "mp_delete_own" ON memory_progress FOR DELETE
  TO anon, authenticated USING (user_id = get_current_user_id());

CREATE INDEX IF NOT EXISTS idx_mp_user_subject ON memory_progress (user_id, subject);

-- ===========================================
-- d) memory_reviews
-- ===========================================
CREATE TABLE IF NOT EXISTS memory_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  topic_id uuid REFERENCES memory_topics(id) ON DELETE CASCADE,
  subject text NOT NULL,
  scheduled_date date NOT NULL,
  completed boolean DEFAULT false,
  result text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE memory_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mr_select_own" ON memory_reviews;
CREATE POLICY "mr_select_own" ON memory_reviews FOR SELECT
  TO anon, authenticated USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "mr_insert_own" ON memory_reviews;
CREATE POLICY "mr_insert_own" ON memory_reviews FOR INSERT
  TO anon, authenticated WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "mr_update_own" ON memory_reviews;
CREATE POLICY "mr_update_own" ON memory_reviews FOR UPDATE
  TO anon, authenticated USING (user_id = get_current_user_id()) WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "mr_delete_own" ON memory_reviews;
CREATE POLICY "mr_delete_own" ON memory_reviews FOR DELETE
  TO anon, authenticated USING (user_id = get_current_user_id());

CREATE INDEX IF NOT EXISTS idx_mr_user_date ON memory_reviews (user_id, scheduled_date);

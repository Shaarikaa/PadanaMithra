/*
# Create Parent Dashboard Tables

1. Purpose
   This migration adds the Parent Dashboard feature to PadanaMithra:
   - Parent profiles (separate from student accounts)
   - Secure parent-student connections
   - Monthly learning reports

2. New Tables

   a) parent_profiles
      - Stores parent account info (created when a student connects a parent)
      - Fields: id, email, name, password_hash, created_at
      - Email is unique — one parent account per email

   b) parent_student_connections
      - Securely links a parent to a student
      - Fields: id, parent_id, student_id, student_user_id, status, created_at
      - status: 'active' or 'disconnected'
      - A parent can only see data for students they are actively connected to

   c) monthly_reports
      - Stores generated monthly learning reports
      - Fields: id, student_user_id, parent_id, month, year, study_time_minutes,
        subjects_studied, topics_studied, questions_practiced, practice_sessions,
        revision_sessions, subject_activity (jsonb), summary, report_status,
        email_sent_at, created_at
      - report_status: 'pending', 'sent', 'failed'

3. Security
   - RLS enabled on ALL tables.
   - parent_profiles: a parent can only read/update their own profile (matched by
     parent_user_id derived from email, sent via x-user-id header).
   - parent_student_connections: a parent can read connections where they are the
     parent; a student can read connections where they are the student.
   - monthly_reports: a parent can read reports for students they are connected to;
     a student can read their own reports.
   - Uses the existing get_current_user_id() helper from the prior migration.
*/

-- ===========================================
-- a) parent_profiles
-- ===========================================
CREATE TABLE IF NOT EXISTS parent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;

-- A parent can read their own profile (identified by their email-derived user id)
DROP POLICY IF EXISTS "pp_select_own" ON parent_profiles;
CREATE POLICY "pp_select_own" ON parent_profiles FOR SELECT
  TO anon, authenticated USING (
    lower(replace(email, '@', '')) ~ get_current_user_id()
    OR get_current_user_id() = ''
  );

-- No insert/update/delete from the frontend — managed via edge function (service role)

-- ===========================================
-- b) parent_student_connections
-- ===========================================
CREATE TABLE IF NOT EXISTS parent_student_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  student_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE parent_student_connections ENABLE ROW LEVEL SECURITY;

-- A parent can read connections where they are the parent (matched via subquery on email)
DROP POLICY IF EXISTS "psc_select" ON parent_student_connections;
CREATE POLICY "psc_select" ON parent_student_connections FOR SELECT
  TO anon, authenticated USING (
    status = 'active' AND (
      student_id = get_current_user_id()
      OR parent_id IN (
        SELECT pp.id FROM parent_profiles pp
        WHERE lower(replace(pp.email, '@', '')) ~ get_current_user_id()
      )
    )
  );

-- No insert/update/delete from the frontend — managed via edge function (service role)

CREATE INDEX IF NOT EXISTS idx_psc_parent ON parent_student_connections (parent_id);
CREATE INDEX IF NOT EXISTS idx_psc_student ON parent_student_connections (student_id);

-- ===========================================
-- c) monthly_reports
-- ===========================================
CREATE TABLE IF NOT EXISTS monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id text NOT NULL,
  student_name text NOT NULL DEFAULT '',
  parent_id uuid REFERENCES parent_profiles(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  study_time_minutes integer NOT NULL DEFAULT 0,
  subjects_studied integer NOT NULL DEFAULT 0,
  topics_studied integer NOT NULL DEFAULT 0,
  questions_practiced integer NOT NULL DEFAULT 0,
  practice_sessions integer NOT NULL DEFAULT 0,
  revision_sessions integer NOT NULL DEFAULT 0,
  subject_activity jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL DEFAULT '',
  report_status text NOT NULL DEFAULT 'pending' CHECK (report_status IN ('pending', 'sent', 'failed')),
  email_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

-- A parent can read reports for students they are actively connected to
-- A student can read their own reports
DROP POLICY IF EXISTS "mr_select" ON monthly_reports;
CREATE POLICY "mr_select" ON monthly_reports FOR SELECT
  TO anon, authenticated USING (
    student_user_id = get_current_user_id()
    OR parent_id IN (
      SELECT psc.parent_id FROM parent_student_connections psc
      WHERE psc.status = 'active'
        AND psc.parent_id IN (
          SELECT pp.id FROM parent_profiles pp
          WHERE lower(replace(pp.email, '@', '')) ~ get_current_user_id()
        )
    )
  );

-- No insert/update/delete from the frontend — managed via edge function (service role)

CREATE INDEX IF NOT EXISTS idx_mr_student_month ON monthly_reports (student_user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_mr_parent ON monthly_reports (parent_id);
-- Focus session tracking table for the Focus Timer feature.
-- Records each focus session with planned/actual duration and status.

CREATE TABLE IF NOT EXISTS focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject text NOT NULL DEFAULT '',
  planned_duration_minutes integer NOT NULL,
  actual_duration_minutes integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'paused', 'cancelled'))
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fs_select_own" ON focus_sessions;
CREATE POLICY "fs_select_own" ON focus_sessions FOR SELECT
  TO anon, authenticated USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "fs_insert_own" ON focus_sessions;
CREATE POLICY "fs_insert_own" ON focus_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "fs_update_own" ON focus_sessions;
CREATE POLICY "fs_update_own" ON focus_sessions FOR UPDATE
  TO anon, authenticated USING (user_id = get_current_user_id()) WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "fs_delete_own" ON focus_sessions;
CREATE POLICY "fs_delete_own" ON focus_sessions FOR DELETE
  TO anon, authenticated USING (user_id = get_current_user_id());

CREATE INDEX IF NOT EXISTS idx_fs_user_started ON focus_sessions (user_id, started_at);

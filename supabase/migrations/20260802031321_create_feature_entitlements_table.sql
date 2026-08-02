/*
# Create feature_entitlements table for individual premium feature purchases

1. Purpose
   This migration adds support for unlocking individual premium features (₹99 each)
   separately from the full premium bundle (₹499). Previously, the subscriptions table
   only tracked a single `plan = 'premium'` state. Now students can either:
   - Buy the full bundle → subscriptions.plan = 'premium' (all features unlocked)
   - Buy one feature → a row in feature_entitlements (only that feature unlocked)

2. New Table
   feature_entitlements
   - id (uuid, primary key)
   - user_id (text, not null) — matches the email-derived ID used elsewhere
   - feature_id (text, not null) — e.g. 'offline', 'mentoring', 'video-classes', 'pro-notes'
   - status (text, not null) — 'active', 'pending', 'expired'
   - provider (text) — 'stripe' or 'demo'
   - entitlement_id (text) — Stripe session/subscription ID
   - started_at (timestamptz)
   - expires_at (timestamptz)
   - created_at (timestamptz, default now())
   - updated_at (timestamptz, default now())

   Unique constraint on (user_id, feature_id) so a student can only have one entitlement
   per feature.

3. Security
   - RLS enabled on feature_entitlements.
   - SELECT only for the owner via get_current_user_id() (same pattern as subscriptions).
   - No INSERT/UPDATE/DELETE from the frontend — managed via edge function (service role).

4. Important Notes
   - The existing subscriptions table is NOT modified — it still tracks the full bundle.
   - Existing premium users (plan = 'premium') keep ALL features unlocked.
   - Individual entitlements are additive: a student with the bundle does not need
     individual entitlements, and a student with individual entitlements does not
     automatically get the bundle.
*/

CREATE TABLE IF NOT EXISTS feature_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  feature_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'expired')),
  provider text,
  entitlement_id text,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_feature UNIQUE (user_id, feature_id)
);

ALTER TABLE feature_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fe_select_own" ON feature_entitlements;
CREATE POLICY "fe_select_own" ON feature_entitlements FOR SELECT
  TO anon, authenticated USING (user_id = get_current_user_id());

CREATE INDEX IF NOT EXISTS idx_fe_user_feature ON feature_entitlements (user_id, feature_id);

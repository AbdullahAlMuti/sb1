-- Billing v2: additive schema extensions
-- Adds rich plan metadata, plan_features, plan_prices, checkout_sessions,
-- and profiles.onboarding_completed. All changes are backwards-compatible.

-- ── plans: new metadata columns ───────────────────────────────────────────────

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS slug                text UNIQUE,
  ADD COLUMN IF NOT EXISTS short_description   text,
  ADD COLUMN IF NOT EXISTS long_description    text,
  ADD COLUMN IF NOT EXISTS best_for            text,
  ADD COLUMN IF NOT EXISTS badge_text          text,
  ADD COLUMN IF NOT EXISTS cta_text            text,
  ADD COLUMN IF NOT EXISTS is_recommended      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_public           boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS trial_requires_card boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS stripe_product_id   text,
  ADD COLUMN IF NOT EXISTS metadata            jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS archived_at         timestamptz;

-- ── profiles: onboarding flag ─────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- ── plan_features ─────────────────────────────────────────────────────────────
-- Normalised per-plan feature rows replacing the free-form features jsonb[].
-- UI uses is_highlighted=true rows for plan cards (top 5);
-- group_name drives the comparison table sections.

CREATE TABLE IF NOT EXISTS plan_features (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       uuid        NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  group_name    text        NOT NULL,
  title         text        NOT NULL,
  description   text,
  display_value text,
  included      boolean     NOT NULL DEFAULT true,
  tooltip       text,
  is_highlighted boolean    DEFAULT false,
  sort_order    int         DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read plan_features" ON plan_features;
CREATE POLICY "Public can read plan_features"
  ON plan_features FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage plan_features" ON plan_features;
CREATE POLICY "Admins can manage plan_features"
  ON plan_features
  USING     (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS plan_features_plan_id_idx
  ON plan_features(plan_id);

CREATE INDEX IF NOT EXISTS plan_features_highlighted_idx
  ON plan_features(plan_id, is_highlighted) WHERE is_highlighted = true;

-- ── plan_prices ───────────────────────────────────────────────────────────────
-- Normalised price rows per plan/interval. Existing stripe_price_id_monthly/
-- yearly columns on plans are kept for backward compat with existing Edge
-- Functions; this table is additive for future multi-currency support.

CREATE TABLE IF NOT EXISTS plan_prices (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id           uuid        NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  interval          text        NOT NULL CHECK (interval IN ('monthly','yearly','one_time')),
  currency          text        NOT NULL DEFAULT 'usd',
  amount            numeric(10,2) NOT NULL,
  compare_at_amount numeric(10,2),
  stripe_price_id   text,
  is_active         boolean     DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE plan_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read plan_prices" ON plan_prices;
CREATE POLICY "Public can read plan_prices"
  ON plan_prices FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage plan_prices" ON plan_prices;
CREATE POLICY "Admins can manage plan_prices"
  ON plan_prices
  USING     (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS plan_prices_plan_id_idx
  ON plan_prices(plan_id);

CREATE UNIQUE INDEX IF NOT EXISTS plan_prices_plan_interval_currency_idx
  ON plan_prices(plan_id, interval, currency) WHERE is_active = true;

-- ── checkout_sessions ─────────────────────────────────────────────────────────
-- Audit table for every Stripe checkout initiated. Allows admin to identify
-- abandoned checkouts and correlate with Stripe events.

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    uuid        REFERENCES profiles(id),
  email                      text,
  selected_plan_id           uuid        REFERENCES plans(id),
  stripe_checkout_session_id text        UNIQUE,
  status                     text        DEFAULT 'pending'
                                         CHECK (status IN ('pending','completed','expired','abandoned')),
  metadata                   jsonb       DEFAULT '{}',
  created_at                 timestamptz DEFAULT now(),
  updated_at                 timestamptz DEFAULT now()
);

ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can read own checkout_sessions" ON checkout_sessions;
CREATE POLICY "Owner can read own checkout_sessions"
  ON checkout_sessions FOR SELECT
  USING (user_id = auth.uid());

-- Service role bypasses RLS; Edge Functions use service role for writes.

CREATE INDEX IF NOT EXISTS checkout_sessions_user_id_idx
  ON checkout_sessions(user_id);

CREATE INDEX IF NOT EXISTS checkout_sessions_status_idx
  ON checkout_sessions(status);

CREATE INDEX IF NOT EXISTS checkout_sessions_stripe_session_idx
  ON checkout_sessions(stripe_checkout_session_id);

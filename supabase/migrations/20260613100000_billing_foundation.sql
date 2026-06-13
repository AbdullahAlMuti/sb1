-- Billing foundation hardening for the dynamic pricing system.
-- Additive + idempotent: safe on fresh resets and on the live project.

-- 1. coupon_usages: referenced by create-checkout/validate-coupon and by policy
--    migration 20260121201354, but never created. Backfill so fresh resets work.
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_session_id text,
  discount_applied numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON public.coupon_usages (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON public.coupon_usages (user_id);

ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can insert coupon usages" ON public.coupon_usages;
CREATE POLICY "Service role can insert coupon usages"
ON public.coupon_usages
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can view their own coupon usages" ON public.coupon_usages;
CREATE POLICY "Users can view their own coupon usages"
ON public.coupon_usages
FOR SELECT
USING ((select auth.uid()) = user_id);

-- 2. plans: machine-readable feature flags + one-time price for the $1 trial.
--    sort_order exists in repo migrations but is missing on the live project
--    (schema drift) — IF NOT EXISTS covers both.
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_price_id_one_time text;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 3. profiles: one-trial-per-account marker.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_used_at timestamptz;

-- 4. plans.name uniqueness: rename duplicates (never delete: user_plans/profiles
--    may reference them), then add the constraint.
UPDATE public.plans
SET name = name || '_dup_' || substr(id::text, 1, 8)
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY lower(name) ORDER BY created_at NULLS LAST, id) AS rn
    FROM public.plans
  ) ranked
  WHERE rn > 1
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plans_name_key' AND conrelid = 'public.plans'::regclass
  ) THEN
    ALTER TABLE public.plans ADD CONSTRAINT plans_name_key UNIQUE (name);
  END IF;
END $$;

-- 5. user_plans: all readers assume one row per user (maybeSingle). Dedupe keeping
--    the most recently updated row, then enforce.
DELETE FROM public.user_plans
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
    FROM public.user_plans
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS user_plans_user_id_key ON public.user_plans (user_id);

-- 6. plans write access: previously SELECT-only, so the admin panel could not
--    manage plans. Admin-only writes; public read stays as-is.
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins can manage plans"
ON public.plans
FOR ALL
USING (public.has_role((select auth.uid()), 'admin'::public.app_role))
WITH CHECK (public.has_role((select auth.uid()), 'admin'::public.app_role));

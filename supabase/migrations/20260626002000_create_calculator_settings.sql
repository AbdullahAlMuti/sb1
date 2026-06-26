-- Capture calculator_settings table in migrations.
--
-- This table was created out-of-band via Supabase Studio and existed only in the
-- live DB — not reproducible in a fresh environment or branch. This migration
-- codifies it as the canonical schema, adds a missing payment_fixed_fee column
-- (identified in pricing audit: only a fixed $0.30 was hardcoded in the engine,
-- no DB-configurable equivalent), and ensures correct RLS + uniqueness.

CREATE TABLE IF NOT EXISTS public.calculator_settings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Percentage fields
  tax_percent                numeric(6,4) NOT NULL DEFAULT 9.0,
  ebay_fee_percent           numeric(6,4) NOT NULL DEFAULT 20.0,
  promotional_fee_percent    numeric(6,4) NOT NULL DEFAULT 10.0,
  desired_profit_percent     numeric(6,4) NOT NULL DEFAULT 15.0,
  -- Fixed-fee fields
  tracking_fee               numeric(10,4) NOT NULL DEFAULT 0.20,
  payment_fixed_fee          numeric(10,4) NOT NULL DEFAULT 0.30,  -- e.g. Stripe/PayPal fixed component
  -- Timestamps
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calculator_settings_user_id_key UNIQUE (user_id)
);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.set_calculator_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculator_settings_updated_at ON public.calculator_settings;
CREATE TRIGGER trg_calculator_settings_updated_at
  BEFORE UPDATE ON public.calculator_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_calculator_settings_updated_at();

-- Row-level security: each user can only see and manage their own row.
ALTER TABLE public.calculator_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calculator_settings_owner_select"
  ON public.calculator_settings FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "calculator_settings_owner_insert"
  ON public.calculator_settings FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "calculator_settings_owner_update"
  ON public.calculator_settings FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "calculator_settings_owner_delete"
  ON public.calculator_settings FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Index for fast single-row lookups (already enforced by UNIQUE, but explicit for clarity).
CREATE INDEX IF NOT EXISTS idx_calculator_settings_user_id
  ON public.calculator_settings (user_id);

-- Revoke direct public execute on the trigger function.
REVOKE ALL ON FUNCTION public.set_calculator_settings_updated_at() FROM PUBLIC;

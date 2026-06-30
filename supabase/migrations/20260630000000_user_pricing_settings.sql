-- user_pricing_settings — per-user, per-supplier pricing rules.
-- Each user gets one row per supplier (unique constraint on user_id + supplier_key).
-- RLS enforces that users can only read/write their own rows.
-- Default rows are seeded server-side by the pricing-settings edge function on first GET.

CREATE TABLE IF NOT EXISTS public.user_pricing_settings (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_key            text NOT NULL,
  supplier_name           text NOT NULL,
  supplier_domains        text[] NOT NULL DEFAULT '{}',
  is_enabled              boolean NOT NULL DEFAULT true,
  profit_margin_percent   numeric NOT NULL DEFAULT 25  CHECK (profit_margin_percent >= 0),
  minimum_profit          numeric NOT NULL DEFAULT 5   CHECK (minimum_profit >= 0),
  shipping_buffer         numeric NOT NULL DEFAULT 3   CHECK (shipping_buffer >= 0),
  fixed_handling_fee      numeric NOT NULL DEFAULT 0   CHECK (fixed_handling_fee >= 0),
  marketplace_fee_percent numeric NOT NULL DEFAULT 13  CHECK (marketplace_fee_percent BETWEEN 0 AND 100),
  currency_buffer_percent numeric NOT NULL DEFAULT 2   CHECK (currency_buffer_percent BETWEEN 0 AND 100),
  rounding_rule           text NOT NULL DEFAULT 'END_99'
                          CHECK (rounding_rule IN ('NONE','END_99','END_95','END_49','ROUND_UP')),
  rule_version            integer NOT NULL DEFAULT 1,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, supplier_key)
);

ALTER TABLE public.user_pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own pricing settings"
  ON public.user_pricing_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pricing settings"
  ON public.user_pricing_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pricing settings"
  ON public.user_pricing_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pricing settings"
  ON public.user_pricing_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can insert/update on behalf of users (for server-side seeding)
CREATE POLICY "Service role can manage pricing settings"
  ON public.user_pricing_settings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-bump updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_pricing_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pricing_settings_updated_at
  BEFORE UPDATE ON public.user_pricing_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_pricing_settings_updated_at();

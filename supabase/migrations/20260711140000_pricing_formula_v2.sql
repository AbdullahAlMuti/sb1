-- pricing_formula_v2 — versioned pricing formula on user_pricing_settings.
--
-- v1 (legacy additive): fees computed as % of COST. Preserved exactly for all
-- existing rows — no user's prices change from this migration.
-- v2 (sale-based gross-up): fees modeled the way eBay actually charges — a %
-- of the FINAL sale price plus a fixed per-order fee — so the configured
-- profit is the profit actually realized. New users are seeded on v2 by the
-- pricing-settings / pricing-service seeding paths; existing users opt in
-- from the dashboard Supplier Pricing page (which bumps rule_version and
-- propagates to the extension via pricing-rules-sync).
--
-- Safety: strictly additive. formula_version defaults to 1 so every existing
-- row keeps its current behavior; per_order_fee defaults to 0.30 but is
-- IGNORED by the v1 formula, so it is inert until a row moves to v2.
--
-- Rollback:
--   ALTER TABLE public.user_pricing_settings
--     DROP COLUMN IF EXISTS formula_version,
--     DROP COLUMN IF EXISTS per_order_fee;
--   (v1 behavior is the column default, so dropping restores pre-migration
--   semantics; edge functions treat missing fields as v1.)

ALTER TABLE public.user_pricing_settings
  ADD COLUMN IF NOT EXISTS formula_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS per_order_fee   numeric NOT NULL DEFAULT 0.30;

-- Named constraints (idempotent) so the rollback/audit story is explicit.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_pricing_settings_formula_version_check'
  ) THEN
    ALTER TABLE public.user_pricing_settings
      ADD CONSTRAINT user_pricing_settings_formula_version_check
      CHECK (formula_version IN (1, 2));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_pricing_settings_per_order_fee_check'
  ) THEN
    ALTER TABLE public.user_pricing_settings
      ADD CONSTRAINT user_pricing_settings_per_order_fee_check
      CHECK (per_order_fee >= 0 AND per_order_fee <= 10);
  END IF;
END $$;

-- listing_variations: per-variation pricing + SKU for single and multi-variation listings.
-- Additive migration — existing listings table untouched.
-- Single listing = 1 row here. Multi-variation = N rows, one per variant.

CREATE TABLE IF NOT EXISTS public.listing_variations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id             uuid,
  parent_asin         text,
  variant_asin        text,
  sku                 text NOT NULL,           -- readable e.g. "AMZ-B08XYZ-COLO-RED-SZ-L"
  ebay_sku_encoded    text,                    -- base64 Custom Label (audit only, not primary)
  raw_supplier_price  numeric(10,2),           -- Amazon price at listing time
  final_price         numeric(10,2) NOT NULL,  -- calculated selling price uploaded to eBay
  currency            text NOT NULL DEFAULT 'USD',
  stock_quantity      integer NOT NULL DEFAULT 1,
  attributes          jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Unique per user+sku so re-listing the same variant upserts rather than duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_lv_user_sku
  ON public.listing_variations (user_id, sku)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lv_listing  ON public.listing_variations (listing_id);
CREATE INDEX IF NOT EXISTS idx_lv_user     ON public.listing_variations (user_id);
CREATE INDEX IF NOT EXISTS idx_lv_asin     ON public.listing_variations (parent_asin);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_listing_variations_updated_at'
  ) THEN
    CREATE TRIGGER trg_listing_variations_updated_at
    BEFORE UPDATE ON public.listing_variations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- RLS: owner-only
ALTER TABLE public.listing_variations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listing_variations' AND policyname = 'lv_owner'
  ) THEN
    CREATE POLICY lv_owner ON public.listing_variations
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

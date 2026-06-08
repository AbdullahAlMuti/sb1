-- Add variation flags + scalable indexes to listings table.
-- Additive — no destructive changes to existing rows.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS has_variations  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS variation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_low       numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_high      numeric(10,2);

-- Unique key for idempotent parent upsert by ASIN
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_user_asin
  ON public.listings (user_id, amazon_asin)
  WHERE amazon_asin IS NOT NULL;

-- Keyset pagination — leading user_id keeps RLS + filter on same index
CREATE INDEX IF NOT EXISTS idx_listings_user_created
  ON public.listings (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_listings_user_status_created
  ON public.listings (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_user_updated
  ON public.listings (user_id, updated_at DESC NULLS LAST);

-- Trigram search on title (server-side ILIKE via pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_listings_title_trgm
  ON public.listings USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_listings_sku_trgm
  ON public.listings USING gin (sku gin_trgm_ops);

-- Variation expand fetch ordering
CREATE INDEX IF NOT EXISTS idx_lv_listing_created
  ON public.listing_variations (listing_id, created_at);

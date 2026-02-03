-- Add raw metadata blobs for listings (needed for dashboard backfill + debugging)
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS amazon_data jsonb;

ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS ebay_data jsonb;

-- Backfill nulls for consistency
UPDATE public.listings
SET amazon_data = COALESCE(amazon_data, '{}'::jsonb),
    ebay_data   = COALESCE(ebay_data, '{}'::jsonb)
WHERE amazon_data IS NULL OR ebay_data IS NULL;

-- Defaults for new rows
ALTER TABLE public.listings
ALTER COLUMN amazon_data SET DEFAULT '{}'::jsonb;

ALTER TABLE public.listings
ALTER COLUMN ebay_data SET DEFAULT '{}'::jsonb;

-- Optional performance indexes for json field search/debug (safe + additive)
CREATE INDEX IF NOT EXISTS idx_listings_amazon_data_gin ON public.listings USING gin (amazon_data);
CREATE INDEX IF NOT EXISTS idx_listings_ebay_data_gin ON public.listings USING gin (ebay_data);
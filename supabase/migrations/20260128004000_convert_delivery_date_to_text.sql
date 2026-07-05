-- Migration to fix delivery_date column type
-- Scraped delivery dates often contain text like "Arriving Jan 30" which fails timestamp parsing.
-- Converting to TEXT allows storing these raw strings safely.

-- delivery_date was added out-of-band in prod before this migration ran, so it
-- isn't created by any earlier migration file; add it (as text, matching the
-- end state this migration produces) so a from-scratch replay doesn't fail.
ALTER TABLE public.ebay_orders ADD COLUMN IF NOT EXISTS delivery_date text;

DO $$
BEGIN
    -- 1. Alter the column type to text
    -- Using USING to cast existing data if any (though mismatch usually means it's empty/erroring)
    ALTER TABLE public.ebay_orders
    ALTER COLUMN delivery_date TYPE text;

    -- 2. Update order_enrichments.supplier_arriving_date is already text, so we are good there.
END $$;

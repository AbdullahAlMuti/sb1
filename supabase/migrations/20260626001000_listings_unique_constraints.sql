-- Add UNIQUE constraints on listings.sku and listings.ebay_item_id per user.
--
-- The audit found that idx_listings_user_sku and idx_listings_user_ebay_item_id
-- (created in 20260604094811) are non-unique indexes. SKU uniqueness is enforced
-- only by client-side in-memory logic (seenSkus set in sku-engine.js), which
-- breaks across concurrent bulk runs. Without a DB constraint, two simultaneous
-- relists of the same product produce duplicate rows.
--
-- listing_variations already has UNIQUE(user_id, sku) — this mirrors that for
-- the parent listings table.

BEGIN;

-- Remove duplicates before adding UNIQUE constraints.
-- Keep the row with the highest id (most recent) per (user_id, sku).
DELETE FROM public.listings
WHERE sku IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (user_id, sku) id
    FROM public.listings
    WHERE sku IS NOT NULL
    ORDER BY user_id, sku, id DESC
  );

-- Remove duplicates per (user_id, ebay_item_id).
DELETE FROM public.listings
WHERE ebay_item_id IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (user_id, ebay_item_id) id
    FROM public.listings
    WHERE ebay_item_id IS NOT NULL
    ORDER BY user_id, ebay_item_id, id DESC
  );

-- Drop the existing non-unique indexes (we'll replace them with UNIQUE).
DROP INDEX IF EXISTS public.idx_listings_user_sku;
DROP INDEX IF EXISTS public.idx_listings_user_ebay_item_id;

-- Create UNIQUE partial indexes (partial = NULLs excluded, so NULL SKU listings
-- are still allowed for drafts / incomplete imports).
CREATE UNIQUE INDEX idx_listings_user_sku
  ON public.listings (user_id, sku)
  WHERE sku IS NOT NULL;

CREATE UNIQUE INDEX idx_listings_user_ebay_item_id
  ON public.listings (user_id, ebay_item_id)
  WHERE ebay_item_id IS NOT NULL;

COMMIT;

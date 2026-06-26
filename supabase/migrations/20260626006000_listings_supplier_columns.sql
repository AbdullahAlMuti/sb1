-- Add supplier-neutral identity columns to listings.
--
-- Context: listings previously only had Amazon-named dup-check columns
-- (amazon_asin, amazon_url). For Walmart products, no dup-check column was
-- available beyond SKU (which may be absent on a new listing), meaning the same
-- Walmart product could be listed multiple times without detection.
--
-- These columns capture the supplier-agnostic identity once — the extension
-- already sends them in the sync payload (supplier, supplier_id, supplier_url).

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS supplier     text,
  ADD COLUMN IF NOT EXISTS supplier_id  text,
  ADD COLUMN IF NOT EXISTS supplier_url text;

COMMENT ON COLUMN public.listings.supplier     IS 'Supplier name: ''amazon'' | ''walmart'' | future adapters.';
COMMENT ON COLUMN public.listings.supplier_id  IS 'Supplier-side item identifier (ASIN, Walmart item ID, etc.).';
COMMENT ON COLUMN public.listings.supplier_url IS 'Canonical supplier product page URL at time of listing.';

-- Partial unique index: one listing per (user, supplier, supplier item).
-- Excludes rows where either column is NULL so legacy rows are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_user_supplier_item
  ON public.listings (user_id, supplier, supplier_id)
  WHERE supplier IS NOT NULL AND supplier_id IS NOT NULL;

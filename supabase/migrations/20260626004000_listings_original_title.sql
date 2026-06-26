-- Add original_title column to listings to preserve the raw scraped supplier
-- title before any AI rewriting. The final eBay-submitted title lives in the
-- existing `title` column; this new column enables auditing and re-generation.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS original_title text;

COMMENT ON COLUMN public.listings.original_title
  IS 'Raw supplier-scraped title before AI title generation or _enforceEbayTitle cleanup.';

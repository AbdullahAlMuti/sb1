-- sync-ebay-orders writes a metadata jsonb to ebay_sync_logs, but production
-- lacked the column, so every log insert failed silently.
ALTER TABLE public.ebay_sync_logs
  ADD COLUMN IF NOT EXISTS metadata jsonb;

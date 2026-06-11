-- bulk_job_items: persistent queue for the dashboard Bulk Lister.
-- Each row is one supplier URL the user wants listed on eBay. The dashboard
-- owns reads/writes (RLS, user JWT); the extension worker reports progress
-- back through the dashboard bridge, and the authoritative listing row is
-- still written by the create-listing edge fn after a successful upload.
-- Additive migration — nothing existing is touched.

CREATE TABLE IF NOT EXISTS public.bulk_job_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL,
  supplier         text,                       -- 'amazon' | 'walmart' | future adapters
  supplier_url     text NOT NULL,
  supplier_item_id text,                       -- ASIN / Walmart item id parsed from URL
  source           text NOT NULL DEFAULT 'paste'
                     CHECK (source IN ('paste','csv','extension')),
  status           text NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued','scraping','uploading','listed','failed','skipped')),
  error            text,
  -- user-edited pre-upload overrides: { title, price, sku } — manual tier of the
  -- data-priority rule (user-edited > csv > scraped > generated)
  draft_overrides  jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- snapshot written after a successful run for dashboard display
  title            text,
  image_url        text,
  ebay_price       numeric(10,2),
  supplier_price   numeric(10,2),
  sku              text,
  variation_count  integer,
  listing_id       uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  position         integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bji_user_status   ON public.bulk_job_items (user_id, status);
CREATE INDEX IF NOT EXISTS idx_bji_user_position ON public.bulk_job_items (user_id, position, created_at);

-- prevent queueing the same URL twice while it is still pending for this user
CREATE UNIQUE INDEX IF NOT EXISTS idx_bji_user_url_pending
  ON public.bulk_job_items (user_id, supplier_url)
  WHERE status IN ('queued','scraping','uploading');

-- auto-update updated_at (self-contained — fn may not exist on live DB)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bulk_job_items_updated_at'
  ) THEN
    CREATE TRIGGER trg_bulk_job_items_updated_at
    BEFORE UPDATE ON public.bulk_job_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- RLS: owner-only
ALTER TABLE public.bulk_job_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bulk_job_items' AND policyname = 'bji_owner'
  ) THEN
    CREATE POLICY bji_owner ON public.bulk_job_items
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

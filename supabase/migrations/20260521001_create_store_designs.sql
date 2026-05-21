-- ============================================================
-- Store Designs: Full Schema
-- Tables: store_designs, store_design_events, shopify_page_settings
-- Includes: RLS, indexes, updated_at trigger, storage bucket
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. STORE DESIGNS TABLE
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_designs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  title             TEXT        NOT NULL,
  slug              TEXT        NOT NULL UNIQUE,

  -- Content
  description       TEXT,
  short_description TEXT,

  -- Taxonomy
  category          TEXT,
  niche             TEXT,
  tags              TEXT[]      NOT NULL DEFAULT '{}'::text[],

  -- Media
  preview_image     TEXT,
  thumbnail_image   TEXT,
  gallery_images    TEXT[]      NOT NULL DEFAULT '{}'::text[],
  demo_url          TEXT,
  -- NOTE: template_url is sensitive; never select directly on user-facing queries.
  -- Access is gated via Edge Function signed URL flow.
  template_url      TEXT,

  -- Pricing
  price             NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_at_price  NUMERIC(10,2),
  currency          TEXT        NOT NULL DEFAULT 'USD',
  is_free           BOOLEAN     NOT NULL DEFAULT TRUE,

  -- Access Control
  -- DB plan names: free | starter | growth | agency | enterprise | custom
  access_level      TEXT        NOT NULL DEFAULT 'free'
                    CHECK (access_level IN ('free','starter','growth','agency','enterprise','custom')),
  allowed_plans     TEXT[]      NOT NULL DEFAULT '{}'::text[],
  upgrade_message   TEXT,

  -- Feature Flags
  is_premium        BOOLEAN     NOT NULL DEFAULT FALSE,
  is_featured       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_trending       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_published      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_visible        BOOLEAN     NOT NULL DEFAULT TRUE,

  -- Status lifecycle: draft → published / hidden / archived
  status            TEXT        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','hidden','archived')),

  -- Display ordering (lower = earlier)
  sort_order        INTEGER     NOT NULL DEFAULT 0,

  -- SEO
  seo_title         TEXT,
  seo_description   TEXT,

  -- Extensible metadata (hero stats, conversion score, revenue, theme, etc.)
  metadata          JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- Audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ──────────────────────────────────────────────────────────
-- 2. STORE DESIGN EVENTS TABLE (analytics / tracking)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_design_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id   UUID        NOT NULL REFERENCES public.store_designs(id) ON DELETE CASCADE,
  user_id     UUID,       -- nullable (future: anonymous tracking)
  event_type  TEXT        NOT NULL CHECK (event_type IN ('view','save','click','download')),
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- 3. SHOPIFY PAGE SETTINGS TABLE (DB-backed Pages & Features)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shopify_page_settings (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key         TEXT    NOT NULL UNIQUE, -- e.g. 'store-designs', 'dashboard', 'ad-library'
  name             TEXT    NOT NULL,
  route            TEXT    NOT NULL,
  page_type        TEXT    NOT NULL DEFAULT 'Feature'
                   CHECK (page_type IN ('Core','Feature','Custom')),
  status           TEXT    NOT NULL DEFAULT 'Active'
                   CHECK (status IN ('Active','Disabled','Coming Soon','Maintenance')),
  plan_access      TEXT    NOT NULL DEFAULT 'All Plans',
  usage_limit      TEXT    NOT NULL DEFAULT '-',
  is_visible       BOOLEAN NOT NULL DEFAULT TRUE,
  content_editable BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  icon_name        TEXT,   -- lucide icon name string
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by       UUID    REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ──────────────────────────────────────────────────────────
-- 4. INDEXES
-- ──────────────────────────────────────────────────────────

-- store_designs: primary listing filter
CREATE INDEX IF NOT EXISTS idx_store_designs_published_visible
  ON public.store_designs (is_published, is_visible)
  WHERE is_published = true AND is_visible = true;

CREATE INDEX IF NOT EXISTS idx_store_designs_status
  ON public.store_designs (status);

CREATE INDEX IF NOT EXISTS idx_store_designs_category
  ON public.store_designs (category);

CREATE INDEX IF NOT EXISTS idx_store_designs_niche
  ON public.store_designs (niche);

CREATE INDEX IF NOT EXISTS idx_store_designs_access_level
  ON public.store_designs (access_level);

CREATE INDEX IF NOT EXISTS idx_store_designs_sort_order
  ON public.store_designs (sort_order);

CREATE INDEX IF NOT EXISTS idx_store_designs_is_featured
  ON public.store_designs (is_featured)
  WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_store_designs_is_trending
  ON public.store_designs (is_trending)
  WHERE is_trending = true;

CREATE INDEX IF NOT EXISTS idx_store_designs_created_at
  ON public.store_designs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_designs_tags_gin
  ON public.store_designs USING GIN (tags);

-- store_design_events
CREATE INDEX IF NOT EXISTS idx_store_design_events_design_id
  ON public.store_design_events (design_id);

CREATE INDEX IF NOT EXISTS idx_store_design_events_user_id
  ON public.store_design_events (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_store_design_events_event_type
  ON public.store_design_events (event_type);

CREATE INDEX IF NOT EXISTS idx_store_design_events_created_at
  ON public.store_design_events (created_at DESC);

-- shopify_page_settings
CREATE INDEX IF NOT EXISTS idx_shopify_page_settings_page_key
  ON public.shopify_page_settings (page_key);

-- ──────────────────────────────────────────────────────────
-- 5. UPDATED_AT TRIGGERS
-- ──────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_store_designs_updated_at'
  ) THEN
    CREATE TRIGGER trg_store_designs_updated_at
    BEFORE UPDATE ON public.store_designs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_shopify_page_settings_updated_at'
  ) THEN
    CREATE TRIGGER trg_shopify_page_settings_updated_at
    BEFORE UPDATE ON public.shopify_page_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────

ALTER TABLE public.store_designs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_design_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_page_settings  ENABLE ROW LEVEL SECURITY;

-- ── store_designs policies ──

-- Admins: full CRUD
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'store_designs'
      AND policyname = 'Admins can manage store designs'
  ) THEN
    CREATE POLICY "Admins can manage store designs"
    ON public.store_designs FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Authenticated users: SELECT published + visible only
-- NOTE: template_url is intentionally included in the row but should be
-- excluded from the select list in all user-facing queries (enforced in code).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'store_designs'
      AND policyname = 'Authenticated users can view published store designs'
  ) THEN
    CREATE POLICY "Authenticated users can view published store designs"
    ON public.store_designs FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND is_published = true
      AND is_visible = true
    );
  END IF;
END $$;

-- ── store_design_events policies ──

-- Admins: full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'store_design_events'
      AND policyname = 'Admins can manage store design events'
  ) THEN
    CREATE POLICY "Admins can manage store design events"
    ON public.store_design_events FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Authenticated users: INSERT own events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'store_design_events'
      AND policyname = 'Users can track their own events'
  ) THEN
    CREATE POLICY "Users can track their own events"
    ON public.store_design_events FOR INSERT
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND (user_id IS NULL OR user_id = auth.uid())
    );
  END IF;
END $$;

-- ── shopify_page_settings policies ──

-- Admins: full CRUD
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shopify_page_settings'
      AND policyname = 'Admins can manage shopify page settings'
  ) THEN
    CREATE POLICY "Admins can manage shopify page settings"
    ON public.shopify_page_settings FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Authenticated users: SELECT (need to show correct sidebar/visibility state)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shopify_page_settings'
      AND policyname = 'Authenticated users can view shopify page settings'
  ) THEN
    CREATE POLICY "Authenticated users can view shopify page settings"
    ON public.shopify_page_settings FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 7. REALTIME
-- ──────────────────────────────────────────────────────────

ALTER TABLE public.store_designs         REPLICA IDENTITY FULL;
ALTER TABLE public.shopify_page_settings REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'store_designs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_designs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'shopify_page_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shopify_page_settings;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 8. STORAGE BUCKET: store-design-images (public read)
-- ──────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-design-images',
  'store-design-images',
  true,
  5242880, -- 5 MB in bytes
  ARRAY['image/webp','image/png','image/jpeg','image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admins can upload/update/delete; public can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Admins can upload store design images'
  ) THEN
    CREATE POLICY "Admins can upload store design images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'store-design-images'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Admins can update store design images'
  ) THEN
    CREATE POLICY "Admins can update store design images"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'store-design-images'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Admins can delete store design images'
  ) THEN
    CREATE POLICY "Admins can delete store design images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'store-design-images'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Store design images are publicly readable'
  ) THEN
    CREATE POLICY "Store design images are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'store-design-images');
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 9. HELPER FUNCTION: get_user_plan_name
-- Used by the Edge Function to verify plan access
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_plan_name(check_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT LOWER(p.name)
  FROM public.user_plans up
  JOIN public.plans p ON p.id = up.plan_id
  WHERE up.user_id = check_user_id
    AND up.status = 'active'
  ORDER BY up.created_at DESC
  LIMIT 1;
$$;

-- ──────────────────────────────────────────────────────────
-- 10. TABLE COMMENTS
-- ──────────────────────────────────────────────────────────

COMMENT ON TABLE public.store_designs IS
  'Shopify store design templates managed by admin. Published+visible designs appear on the user-facing Store Designs page. Template URLs are protected via Edge Function signed URLs.';

COMMENT ON TABLE public.store_design_events IS
  'Analytics events for store design interactions: views, saves, clicks, downloads.';

COMMENT ON TABLE public.shopify_page_settings IS
  'DB-backed configuration for each page/feature in the Shopify user dashboard sidebar. Persists admin changes to visibility, plan access, usage limits, and status.';

COMMENT ON COLUMN public.store_designs.template_url IS
  'PROTECTED: Never expose directly to clients. Access via /functions/v1/get-template-url Edge Function which validates plan access and returns a short-lived signed URL.';

COMMENT ON COLUMN public.store_designs.access_level IS
  'Plan access gate. Uses DB plan names: free, starter, growth, agency, enterprise, custom. UI maps Pro->growth, Agency->agency/enterprise.';

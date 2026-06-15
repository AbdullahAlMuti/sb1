-- Marketing blog (company content-marketing blog for apps/marketing / sellersuit.com/blog)
--
-- NOTE: This is SEPARATE from the existing `blog_posts` table, which is a per-user SaaS
-- feature (customers generating affiliate Amazon-review posts for their own listings).
-- These `marketing_*` tables are owned by the SellerSuit team and authored from apps/admin.
--
-- Conventions reused from this repo:
--   * admin gate  -> public.has_role(auth.uid(), 'admin'::public.app_role)
--   * updated_at  -> trigger public.update_updated_at_column()

-- ---------------------------------------------------------------------------
-- 1. marketing_authors — named bylines (matches AutoDS author pages)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_authors (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  avatar_url  text,
  bio         text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. marketing_categories — topical clusters (eBay Dropshipping, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_categories (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text,
  sort_order   int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. marketing_posts — the articles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_posts (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug             text NOT NULL UNIQUE,
  title            text NOT NULL,
  excerpt          text,
  content          text NOT NULL DEFAULT '',          -- sanitized HTML (rendered from editor)
  cover_image_url  text,
  category_id      uuid REFERENCES public.marketing_categories(id) ON DELETE SET NULL,
  author_id        uuid REFERENCES public.marketing_authors(id)    ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'scheduled', 'published')),
  published_at     timestamptz,
  -- SEO
  seo_title        text,
  meta_description text,
  canonical_url    text,
  og_image_url     text,
  keywords         text[] NOT NULL DEFAULT '{}',
  reading_minutes  int NOT NULL DEFAULT 1,
  faq              jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ "q": "...", "a": "..." }]
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_posts_status        ON public.marketing_posts(status);
CREATE INDEX IF NOT EXISTS idx_marketing_posts_published_at  ON public.marketing_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_posts_category      ON public.marketing_posts(category_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS set_marketing_authors_updated_at   ON public.marketing_authors;
CREATE TRIGGER set_marketing_authors_updated_at
  BEFORE UPDATE ON public.marketing_authors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_marketing_categories_updated_at ON public.marketing_categories;
CREATE TRIGGER set_marketing_categories_updated_at
  BEFORE UPDATE ON public.marketing_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_marketing_posts_updated_at      ON public.marketing_posts;
CREATE TRIGGER set_marketing_posts_updated_at
  BEFORE UPDATE ON public.marketing_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS — public can read published content; only admins write.
-- ---------------------------------------------------------------------------
ALTER TABLE public.marketing_authors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_posts      ENABLE ROW LEVEL SECURITY;

-- Authors: world-readable (bylines shown on public posts), admin-managed.
DROP POLICY IF EXISTS "Public can read authors" ON public.marketing_authors;
CREATE POLICY "Public can read authors" ON public.marketing_authors
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage authors" ON public.marketing_authors;
CREATE POLICY "Admins manage authors" ON public.marketing_authors
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Categories: world-readable, admin-managed.
DROP POLICY IF EXISTS "Public can read categories" ON public.marketing_categories;
CREATE POLICY "Public can read categories" ON public.marketing_categories
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage categories" ON public.marketing_categories;
CREATE POLICY "Admins manage categories" ON public.marketing_categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Posts: only PUBLISHED rows are world-readable; admins see/manage everything.
DROP POLICY IF EXISTS "Public can read published posts" ON public.marketing_posts;
CREATE POLICY "Public can read published posts" ON public.marketing_posts
  FOR SELECT USING (status = 'published');
DROP POLICY IF EXISTS "Admins manage posts" ON public.marketing_posts;
CREATE POLICY "Admins manage posts" ON public.marketing_posts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------------
-- Seed: default categories (eBay-first topical clusters) + a default author.
-- ---------------------------------------------------------------------------
INSERT INTO public.marketing_categories (slug, name, description, sort_order) VALUES
  ('ebay-dropshipping', 'eBay Dropshipping', 'Strategies, policy, and automation for dropshipping on eBay.', 1),
  ('amazon-to-ebay',    'Amazon to eBay',    'Sourcing and listing Amazon products on eBay the right way.', 2),
  ('product-research',  'Product Research',  'Finding winning products and profitable niches.', 3),
  ('seller-tips',       'Seller Tips',       'Pricing, fees, optimization, and scaling your store.', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.marketing_authors (slug, name, bio) VALUES
  ('sellersuit-team', 'SellerSuit Team', 'The SellerSuit team helps eBay sellers automate sourcing and listing.')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Storage bucket for blog images (public read). Idempotent.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read blog images" ON storage.objects;
CREATE POLICY "Public read blog images" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "Admins write blog images" ON storage.objects;
CREATE POLICY "Admins write blog images" ON storage.objects
  FOR ALL USING (
    bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

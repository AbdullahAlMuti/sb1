-- ============================================
-- Profitable Products (new system)
-- Creates tables + RLS + realtime + storage bucket
-- ============================================

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.profitable_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NULL,
  sku TEXT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  price NUMERIC NOT NULL DEFAULT 0,
  delivery_cost NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  items_sold INTEGER NOT NULL DEFAULT 0,
  discount_label TEXT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profitable_product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.profitable_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_profitable_products_is_published ON public.profitable_products (is_published);
CREATE INDEX IF NOT EXISTS idx_profitable_products_sku ON public.profitable_products (sku);
CREATE INDEX IF NOT EXISTS idx_profitable_products_tags_gin ON public.profitable_products USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_profitable_product_images_product_id ON public.profitable_product_images (product_id);

-- 3) updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_profitable_products_updated_at'
  ) THEN
    CREATE TRIGGER trg_profitable_products_updated_at
    BEFORE UPDATE ON public.profitable_products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4) RLS
ALTER TABLE public.profitable_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profitable_product_images ENABLE ROW LEVEL SECURITY;

-- Profitable products policies
DO $$
BEGIN
  -- Admin full access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profitable_products' AND policyname = 'Admins can manage profitable products'
  ) THEN
    CREATE POLICY "Admins can manage profitable products"
    ON public.profitable_products
    FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  -- Authenticated users can read published
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profitable_products' AND policyname = 'Authenticated users can view published profitable products'
  ) THEN
    CREATE POLICY "Authenticated users can view published profitable products"
    ON public.profitable_products
    FOR SELECT
    USING (auth.uid() IS NOT NULL AND is_published = true);
  END IF;
END $$;

-- Profitable product images policies
DO $$
BEGIN
  -- Admin full access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profitable_product_images' AND policyname = 'Admins can manage profitable product images'
  ) THEN
    CREATE POLICY "Admins can manage profitable product images"
    ON public.profitable_product_images
    FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;

  -- Authenticated users can read images of published products
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profitable_product_images' AND policyname = 'Authenticated users can view images for published profitable products'
  ) THEN
    CREATE POLICY "Authenticated users can view images for published profitable products"
    ON public.profitable_product_images
    FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.profitable_products p
        WHERE p.id = profitable_product_images.product_id
          AND p.is_published = true
      )
    );
  END IF;
END $$;

-- 5) Realtime
ALTER TABLE public.profitable_products REPLICA IDENTITY FULL;
ALTER TABLE public.profitable_product_images REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- Add to realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'profitable_products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profitable_products;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'profitable_product_images'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profitable_product_images;
  END IF;
END $$;

-- 6) Storage bucket for product images
-- NOTE: We store only URLs/paths in DB; files go to Storage.
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (admins can write; reads OK for public bucket)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload product images'
  ) THEN
    CREATE POLICY "Admins can upload product images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'product-images' AND public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update product images'
  ) THEN
    CREATE POLICY "Admins can update product images"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'product-images' AND public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete product images'
  ) THEN
    CREATE POLICY "Admins can delete product images"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'product-images' AND public.is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Product images are readable'
  ) THEN
    CREATE POLICY "Product images are readable"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'product-images');
  END IF;
END $$;

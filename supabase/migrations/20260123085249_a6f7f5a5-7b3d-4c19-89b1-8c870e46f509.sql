-- Align backend schema with app code (plan usage tracking + eBay orders sync + credit audit)

-- 1) user_plans usage tracking + overrides
ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS orders_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS seo_titles_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS seo_descriptions_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_reason text,
ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS admin_override_limits jsonb;

-- 2) usage_logs credits_used (used by AdminUsage + plan middleware)
ALTER TABLE public.usage_logs
ADD COLUMN IF NOT EXISTS credits_used integer NOT NULL DEFAULT 0;

-- 3) credit_transactions audit trail
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL,
  balance_after integer NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id_created_at
ON public.credit_transactions (user_id, created_at DESC);

-- 4) ebay_orders table for extension sync
CREATE TABLE IF NOT EXISTS public.ebay_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ebay_order_id text NOT NULL,
  buyer_name text,
  buyer_username text,
  buyer_email text,
  order_date timestamp with time zone,
  order_status text DEFAULT 'pending',
  total_amount numeric(10,2),
  subtotal numeric,
  currency text DEFAULT 'USD',
  shipping_address jsonb,
  line_items jsonb,
  platform text DEFAULT 'eBay',
  synced_at timestamp with time zone DEFAULT now(),
  item_number text,
  item_title text,
  custom_label text,
  quantity integer DEFAULT 1,
  sold_via text,
  discount_info text,
  ship_by_date timestamp with time zone,
  date_sold timestamp with time zone,
  date_paid timestamp with time zone,
  buyer_zip text,
  item_image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ebay_orders_user_order_unique UNIQUE (user_id, ebay_order_id)
);

CREATE INDEX IF NOT EXISTS idx_ebay_orders_user_id_order_date
ON public.ebay_orders (user_id, order_date DESC);

-- 5) RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_orders ENABLE ROW LEVEL SECURITY;

-- credit_transactions policies (owner-only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credit_transactions' AND policyname='Users can view their own credit transactions'
  ) THEN
    CREATE POLICY "Users can view their own credit transactions"
    ON public.credit_transactions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credit_transactions' AND policyname='Users can insert their own credit transactions'
  ) THEN
    CREATE POLICY "Users can insert their own credit transactions"
    ON public.credit_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ebay_orders policies (owner-only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ebay_orders' AND policyname='Users can view their own eBay orders'
  ) THEN
    CREATE POLICY "Users can view their own eBay orders"
    ON public.ebay_orders
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ebay_orders' AND policyname='Users can insert their own eBay orders'
  ) THEN
    CREATE POLICY "Users can insert their own eBay orders"
    ON public.ebay_orders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ebay_orders' AND policyname='Users can update their own eBay orders'
  ) THEN
    CREATE POLICY "Users can update their own eBay orders"
    ON public.ebay_orders
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ebay_orders' AND policyname='Users can delete their own eBay orders'
  ) THEN
    CREATE POLICY "Users can delete their own eBay orders"
    ON public.ebay_orders
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

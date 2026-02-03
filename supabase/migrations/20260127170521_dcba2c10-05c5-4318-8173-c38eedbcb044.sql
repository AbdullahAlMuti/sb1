-- Create table to store user-managed order enrichment fields (linked 1:1 to ebay_orders)
CREATE TABLE IF NOT EXISTS public.order_enrichments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  ebay_order_row_id uuid NOT NULL,

  supplier_order_number text NULL,
  supplier_cost numeric NULL,

  sent_message boolean NOT NULL DEFAULT false,
  sent_message_at timestamptz NULL,

  tracking text NULL,

  ebay_refund boolean NOT NULL DEFAULT false,
  ebay_refund_amount numeric NULL,

  amazon_refund boolean NOT NULL DEFAULT false,
  amazon_refund_amount numeric NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT order_enrichments_ebay_order_row_id_unique UNIQUE (ebay_order_row_id),
  CONSTRAINT order_enrichments_supplier_cost_nonneg CHECK (supplier_cost IS NULL OR supplier_cost >= 0),
  CONSTRAINT order_enrichments_ebay_refund_amount_nonneg CHECK (ebay_refund_amount IS NULL OR ebay_refund_amount >= 0),
  CONSTRAINT order_enrichments_amazon_refund_amount_nonneg CHECK (amazon_refund_amount IS NULL OR amazon_refund_amount >= 0)
);

-- FK to ebay_orders (do NOT cascade delete; keep order history intact if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_enrichments_ebay_order_row_id_fkey'
  ) THEN
    ALTER TABLE public.order_enrichments
      ADD CONSTRAINT order_enrichments_ebay_order_row_id_fkey
      FOREIGN KEY (ebay_order_row_id)
      REFERENCES public.ebay_orders (id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS order_enrichments_user_id_idx ON public.order_enrichments (user_id);
CREATE INDEX IF NOT EXISTS order_enrichments_ebay_order_row_id_idx ON public.order_enrichments (ebay_order_row_id);

-- updated_at automation
DROP TRIGGER IF EXISTS update_order_enrichments_updated_at ON public.order_enrichments;
CREATE TRIGGER update_order_enrichments_updated_at
BEFORE UPDATE ON public.order_enrichments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.order_enrichments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own order_enrichments" ON public.order_enrichments;
CREATE POLICY "Users can view own order_enrichments"
ON public.order_enrichments
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own order_enrichments" ON public.order_enrichments;
CREATE POLICY "Users can insert own order_enrichments"
ON public.order_enrichments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.ebay_orders eo
    WHERE eo.id = ebay_order_row_id
      AND eo.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own order_enrichments" ON public.order_enrichments;
CREATE POLICY "Users can update own order_enrichments"
ON public.order_enrichments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.ebay_orders eo
    WHERE eo.id = ebay_order_row_id
      AND eo.user_id = auth.uid()
  )
);

-- (Optional) Allow delete for cleanup
DROP POLICY IF EXISTS "Users can delete own order_enrichments" ON public.order_enrichments;
CREATE POLICY "Users can delete own order_enrichments"
ON public.order_enrichments
FOR DELETE
USING (auth.uid() = user_id);

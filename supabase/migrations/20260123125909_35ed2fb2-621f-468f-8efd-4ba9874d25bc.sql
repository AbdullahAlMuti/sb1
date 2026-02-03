-- Add missing finance columns to support the eBay Orders dashboard table
ALTER TABLE public.ebay_orders
  ADD COLUMN IF NOT EXISTS shipping_cost numeric,
  ADD COLUMN IF NOT EXISTS ad_fee numeric,
  ADD COLUMN IF NOT EXISTS earnings numeric;

COMMENT ON COLUMN public.ebay_orders.shipping_cost IS 'Shipping cost for the order (from eBay/extension payload)';
COMMENT ON COLUMN public.ebay_orders.ad_fee IS 'Advertising/promoted listings fee for the order (from eBay/extension payload)';
COMMENT ON COLUMN public.ebay_orders.earnings IS 'Net earnings for the order (from eBay/extension payload or calculated)';

-- Helpful indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_ebay_orders_user_date_paid
  ON public.ebay_orders (user_id, date_paid DESC);

CREATE INDEX IF NOT EXISTS idx_ebay_orders_user_deleted
  ON public.ebay_orders (user_id, deleted_at);
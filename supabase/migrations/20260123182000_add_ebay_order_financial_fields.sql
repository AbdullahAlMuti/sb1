-- Add financial tracking fields to ebay_orders for detailed order analytics

ALTER TABLE public.ebay_orders
ADD COLUMN IF NOT EXISTS shipping_cost numeric(10,2),
ADD COLUMN IF NOT EXISTS ad_fee numeric(10,2),
ADD COLUMN IF NOT EXISTS amazon_price numeric(10,2),
ADD COLUMN IF NOT EXISTS earnings numeric(10,2),
ADD COLUMN IF NOT EXISTS transaction_id text;

-- Add comment for documentation
COMMENT ON COLUMN public.ebay_orders.shipping_cost IS 'Shipping cost charged to buyer';
COMMENT ON COLUMN public.ebay_orders.ad_fee IS 'Promoted listings / advertising fee';
COMMENT ON COLUMN public.ebay_orders.amazon_price IS 'Amazon purchase cost (for dropshipping)';
COMMENT ON COLUMN public.ebay_orders.earnings IS 'Net earnings after fees (transaction - ad_fee - amazon_price)';
COMMENT ON COLUMN public.ebay_orders.transaction_id IS 'eBay transaction ID or sales record number';

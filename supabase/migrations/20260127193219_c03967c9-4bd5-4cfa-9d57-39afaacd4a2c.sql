-- Add eBay-synced Net Profit to orders (nullable; populated by sync when available)
ALTER TABLE public.ebay_orders
ADD COLUMN IF NOT EXISTS net_profit numeric NULL;

CREATE INDEX IF NOT EXISTS idx_ebay_orders_user_id_net_profit
ON public.ebay_orders (user_id, net_profit);
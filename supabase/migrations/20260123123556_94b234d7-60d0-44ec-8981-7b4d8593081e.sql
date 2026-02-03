-- Soft-delete support for ebay_orders to prevent extension re-sync from re-inserting deleted orders
ALTER TABLE public.ebay_orders
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_ebay_orders_user_deleted_at
ON public.ebay_orders (user_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_ebay_orders_user_ebay_order_id
ON public.ebay_orders (user_id, ebay_order_id);

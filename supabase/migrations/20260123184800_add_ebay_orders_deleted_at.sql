-- Add deleted_at column for soft delete functionality

ALTER TABLE public.ebay_orders
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.ebay_orders.deleted_at IS 'Soft delete timestamp - when order was marked as deleted';

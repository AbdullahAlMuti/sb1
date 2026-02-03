-- Add new columns to ebay_orders to match eBay Seller Hub data
ALTER TABLE public.ebay_orders 
ADD COLUMN IF NOT EXISTS buyer_username text,
ADD COLUMN IF NOT EXISTS item_number text,
ADD COLUMN IF NOT EXISTS item_title text,
ADD COLUMN IF NOT EXISTS custom_label text,
ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS subtotal numeric,
ADD COLUMN IF NOT EXISTS sold_via text,
ADD COLUMN IF NOT EXISTS discount_info text,
ADD COLUMN IF NOT EXISTS ship_by_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS date_sold timestamp with time zone,
ADD COLUMN IF NOT EXISTS date_paid timestamp with time zone,
ADD COLUMN IF NOT EXISTS buyer_zip text,
ADD COLUMN IF NOT EXISTS item_image_url text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ebay_orders_date_paid ON public.ebay_orders(date_paid DESC);
CREATE INDEX IF NOT EXISTS idx_ebay_orders_custom_label ON public.ebay_orders(custom_label);
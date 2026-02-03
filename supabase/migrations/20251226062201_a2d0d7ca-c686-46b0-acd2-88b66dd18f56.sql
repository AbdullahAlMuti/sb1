-- Add missing columns to listings table for full functionality
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS ebay_item_id text,
ADD COLUMN IF NOT EXISTS ebay_price numeric,
ADD COLUMN IF NOT EXISTS amazon_price numeric,
ADD COLUMN IF NOT EXISTS amazon_asin text,
ADD COLUMN IF NOT EXISTS amazon_url text,
ADD COLUMN IF NOT EXISTS auto_order_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS amazon_stock_quantity integer,
ADD COLUMN IF NOT EXISTS amazon_stock_status text,
ADD COLUMN IF NOT EXISTS price_last_updated timestamp with time zone,
ADD COLUMN IF NOT EXISTS inventory_last_updated timestamp with time zone,
ADD COLUMN IF NOT EXISTS inventory_status text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS sync_error text,
ADD COLUMN IF NOT EXISTS last_checked timestamp with time zone;

-- Add missing columns to auto_orders table for full order tracking
ALTER TABLE public.auto_orders 
ADD COLUMN IF NOT EXISTS ebay_order_id text,
ADD COLUMN IF NOT EXISTS ebay_sku text,
ADD COLUMN IF NOT EXISTS item_price numeric,
ADD COLUMN IF NOT EXISTS total_cost numeric,
ADD COLUMN IF NOT EXISTS amazon_order_id text,
ADD COLUMN IF NOT EXISTS buyer_name text,
ADD COLUMN IF NOT EXISTS buyer_address jsonb DEFAULT '{}'::jsonb;
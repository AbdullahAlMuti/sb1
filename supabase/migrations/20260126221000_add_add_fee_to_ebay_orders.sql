-- Add add_fee column to ebay_orders to store scraped total earnings
ALTER TABLE public.ebay_orders
ADD COLUMN IF NOT EXISTS add_fee numeric(10,2);

COMMENT ON COLUMN public.ebay_orders.add_fee IS 'Scraped total earnings from eBay order details page summary (dl.total)';

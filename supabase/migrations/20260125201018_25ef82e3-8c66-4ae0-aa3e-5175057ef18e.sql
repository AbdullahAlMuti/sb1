-- Add sales_record_number column to ebay_orders table
ALTER TABLE ebay_orders 
ADD COLUMN sales_record_number text;

-- Drop the old unique constraint on (user_id, ebay_order_id)
ALTER TABLE ebay_orders 
DROP CONSTRAINT IF EXISTS ebay_orders_user_id_ebay_order_id_key;

-- Create unique constraint on (user_id, sales_record_number)
ALTER TABLE ebay_orders 
ADD CONSTRAINT ebay_orders_user_id_sales_record_number_key 
UNIQUE (user_id, sales_record_number);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ebay_orders_sales_record_number 
ON ebay_orders(sales_record_number) 
WHERE deleted_at IS NULL;
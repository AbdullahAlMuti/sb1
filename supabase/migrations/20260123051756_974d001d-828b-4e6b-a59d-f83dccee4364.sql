-- Create ebay_orders table for synced eBay orders from extension
CREATE TABLE public.ebay_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    ebay_order_id TEXT NOT NULL,
    buyer_name TEXT,
    buyer_email TEXT,
    order_date TIMESTAMP WITH TIME ZONE,
    order_status TEXT DEFAULT 'pending',
    total_amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    shipping_address JSONB,
    line_items JSONB,
    platform TEXT DEFAULT 'eBay',
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, ebay_order_id)
);

-- Enable RLS
ALTER TABLE public.ebay_orders ENABLE ROW LEVEL SECURITY;

-- Users can only view their own orders
CREATE POLICY "Users can view their own eBay orders"
ON public.ebay_orders
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own orders (via extension sync)
CREATE POLICY "Users can insert their own eBay orders"
ON public.ebay_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own orders
CREATE POLICY "Users can update their own eBay orders"
ON public.ebay_orders
FOR UPDATE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_ebay_orders_updated_at
BEFORE UPDATE ON public.ebay_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
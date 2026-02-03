-- Add missing 'details' column to auto_orders table
ALTER TABLE public.auto_orders 
ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}'::jsonb;
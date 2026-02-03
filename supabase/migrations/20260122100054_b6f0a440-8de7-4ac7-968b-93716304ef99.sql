-- Add position column to must_sell_items for ordering
ALTER TABLE public.must_sell_items 
ADD COLUMN position integer DEFAULT 0;

-- Set initial positions based on created_at (newest first)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM public.must_sell_items
)
UPDATE public.must_sell_items 
SET position = ranked.rn
FROM ranked
WHERE must_sell_items.id = ranked.id;

-- Create index for faster ordering
CREATE INDEX idx_must_sell_items_position ON public.must_sell_items(position);
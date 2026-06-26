-- Add RLS for user_ebay_settings so users can update their own sync settings.

ALTER TABLE public.user_ebay_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own ebay settings" ON public.user_ebay_settings;

CREATE POLICY "Users can manage their own ebay settings"
  ON public.user_ebay_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

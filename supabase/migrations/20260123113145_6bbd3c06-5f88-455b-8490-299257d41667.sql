-- Restore ability for end-users to delete their own eBay orders (scoped to their user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ebay_orders'
      AND policyname = 'Users can delete their own eBay orders'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Users can delete their own eBay orders"
      ON public.ebay_orders
      FOR DELETE
      USING (auth.uid() = user_id)
    $p$;
  END IF;
END $$;

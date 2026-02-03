-- Prevent end-users from deleting eBay orders
DO $$
BEGIN
  -- Drop the permissive user delete policy
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ebay_orders'
      AND policyname = 'Users can delete their own eBay orders'
  ) THEN
    EXECUTE 'DROP POLICY "Users can delete their own eBay orders" ON public.ebay_orders';
  END IF;
END $$;

-- Allow only admins to delete eBay orders (optional, keeps administrative control)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ebay_orders'
      AND policyname = 'Admins can delete eBay orders'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Admins can delete eBay orders"
      ON public.ebay_orders
      FOR DELETE
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    $p$;
  END IF;
END $$;
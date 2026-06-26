-- Wrap remaining bare auth.uid() RLS policies with (select auth.uid()) initplan form.
-- Postgres evaluates a subquery initPlan ONCE per statement instead of once per row,
-- eliminating redundant JWT parsing on every row scan. Access semantics are identical.
-- Tables covered: listings (SELECT/INSERT/DELETE), ebay_orders (all), credit_transactions (all).
-- listings UPDATE and background_jobs SELECT were already wrapped in prior migrations.

-- ── listings ──────────────────────────────────────────────────────────────────

ALTER POLICY "Users can view own listings" ON public.listings
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert own listings" ON public.listings
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can delete own listings" ON public.listings
  USING (((select auth.uid()) = user_id));

-- ── ebay_orders ───────────────────────────────────────────────────────────────

ALTER POLICY "Users can view their own eBay orders" ON public.ebay_orders
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert their own eBay orders" ON public.ebay_orders
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update their own eBay orders" ON public.ebay_orders
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Admins can delete eBay orders" ON public.ebay_orders
  USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

-- ── credit_transactions ───────────────────────────────────────────────────────

ALTER POLICY "Users can view their own credit transactions" ON public.credit_transactions
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert their own credit transactions" ON public.credit_transactions
  WITH CHECK (((select auth.uid()) = user_id));

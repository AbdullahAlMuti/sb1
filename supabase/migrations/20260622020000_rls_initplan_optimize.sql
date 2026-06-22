-- Optimize RLS policies flagged by the Supabase performance advisor (auth_rls_initplan).
-- Wrapping auth.uid() in a scalar subquery `(select auth.uid())` makes Postgres evaluate
-- it ONCE per query (initPlan) instead of once per row. This is the official Supabase
-- recommendation and is ACCESS-NEUTRAL: the boolean result is identical, only evaluation
-- caching changes. Policies already wrapped as `( SELECT is_admin(auth.uid()) )` are left
-- as-is. Each ALTER below only rewrites the existing expression with the wrapped form.

ALTER POLICY "Admins can manage audit logs" ON public.admin_audit_logs
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can manage support notes" ON public.admin_support_notes
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can manage checkout_sessions" ON public.checkout_sessions
  USING (has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Owner can read own checkout_sessions" ON public.checkout_sessions
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Allow admins to manage description_config" ON public.description_config
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

ALTER POLICY "Admins can view all sync logs" ON public.ebay_sync_logs
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Users can manage own sync logs" ON public.ebay_sync_logs
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Admins manage authors" ON public.marketing_authors
  USING (has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins manage categories" ON public.marketing_categories
  USING (has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins manage posts" ON public.marketing_posts
  USING (has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can manage plan_features" ON public.plan_features
  USING (has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can manage plan_prices" ON public.plan_prices
  USING (has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Admins can manage profitable product images" ON public.profitable_product_images
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

ALTER POLICY "Admins can manage shopify page settings" ON public.shopify_page_settings
  USING (has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Authenticated users can view shopify page settings" ON public.shopify_page_settings
  USING (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Admins can manage feature overrides" ON public.user_feature_overrides
  USING (has_role((select auth.uid()), 'admin'::app_role));

ALTER POLICY "Users can view own feature overrides" ON public.user_feature_overrides
  USING (((select auth.uid()) = user_id));

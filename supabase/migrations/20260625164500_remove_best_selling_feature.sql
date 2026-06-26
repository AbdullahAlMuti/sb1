-- Migration to completely remove the Best Selling feature from the database

-- 1. Clean up feature overrides and settings
DELETE FROM public.admin_settings WHERE key = 'feature_ebay_best_selling';
DELETE FROM public.user_feature_overrides WHERE feature_key = 'ebay_best_selling';

-- 2. Drop the best_selling_items table and all associated policies, keys
DROP TABLE IF EXISTS public.best_selling_items CASCADE;

-- 3. Recreate feature key validation without ebay_best_selling
CREATE OR REPLACE FUNCTION public.is_valid_ebay_feature(feature_key text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN feature_key IN (
    'ebay_dashboard', 'ebay_orders', 'ebay_sync', 'ebay_product_insights',
    'ebay_must_sell', 'ebay_profitable_products',
    'ebay_sync_health', 'ebay_marketplace_trends', 'ebay_listing_analytics',
    'ebay_experimental_modules'
  );
END;
$$;

-- 4. Recreate global feature control getter without ebay_best_selling
CREATE OR REPLACE FUNCTION public.get_ebay_feature_controls_admin()
RETURNS TABLE (
  feature_key text,
  is_enabled boolean,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH allowed_features AS (
    SELECT unnest(ARRAY[
      'ebay_dashboard', 'ebay_orders', 'ebay_sync', 'ebay_product_insights',
      'ebay_must_sell', 'ebay_profitable_products',
      'ebay_sync_health', 'ebay_marketplace_trends', 'ebay_listing_analytics',
      'ebay_experimental_modules'
    ]) AS feature_key
  )
  SELECT 
    af.feature_key,
    COALESCE(s.value = 'true', true) AS is_enabled, -- default true if not set
    s.updated_at
  FROM allowed_features af
  LEFT JOIN public.admin_settings s ON s.key = 'feature_' || af.feature_key;
END;
$$;

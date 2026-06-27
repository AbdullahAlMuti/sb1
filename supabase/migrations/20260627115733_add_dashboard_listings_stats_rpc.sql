-- Migration: Add get_dashboard_listings_stats RPC to prevent massive client-side data fetching
CREATE OR REPLACE FUNCTION public.get_dashboard_listings_stats(
  p_user_id uuid
)
RETURNS TABLE(
  inventory_value numeric,
  total_cost numeric,
  active_listings_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(SUM(ebay_price), 0)::numeric AS inventory_value,
    COALESCE(SUM(amazon_price), 0)::numeric AS total_cost,
    COUNT(CASE WHEN status = 'active' THEN 1 END)::bigint AS active_listings_count
  FROM public.listings
  WHERE user_id = p_user_id;
$$;

-- Revoke default execute permissions and grant strictly to the service_role and authenticated users
REVOKE EXECUTE ON FUNCTION public.get_dashboard_listings_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_listings_stats(uuid) TO service_role, authenticated;

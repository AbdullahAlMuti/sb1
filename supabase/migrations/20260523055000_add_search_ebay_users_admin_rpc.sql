-- Create secure RPC for fetching/searching users for the eBay Admin App
CREATE OR REPLACE FUNCTION public.search_ebay_users_admin(
  search_query text DEFAULT '',
  status_filter text DEFAULT 'all',
  limit_val int DEFAULT 50,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  account_status text,
  credits_remaining int,
  total_orders bigint,
  orders_last_24h bigint,
  latest_synced_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enforce Admin Access
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.email,
    p.full_name,
    COALESCE(p.account_status, 'active') AS account_status,
    COALESCE(p.credits, 0) AS credits_remaining,
    (SELECT COUNT(*) FROM public.ebay_orders eo WHERE eo.user_id = p.id) AS total_orders,
    (SELECT COUNT(*) FROM public.ebay_orders eo WHERE eo.user_id = p.id AND eo.order_date >= NOW() - INTERVAL '24 hours') AS orders_last_24h,
    (SELECT MAX(synced_at) FROM public.ebay_orders eo WHERE eo.user_id = p.id) AS latest_synced_at
  FROM public.profiles p
  WHERE (
    search_query = '' OR 
    p.email ILIKE '%' || search_query || '%' OR 
    p.full_name ILIKE '%' || search_query || '%' OR
    p.id::text ILIKE '%' || search_query || '%'
  )
  ORDER BY latest_synced_at DESC NULLS LAST, p.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

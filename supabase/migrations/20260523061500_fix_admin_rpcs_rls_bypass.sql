-- Fix search_ebay_users_admin to include orders_last_7d
DROP FUNCTION IF EXISTS public.search_ebay_users_admin;

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
  orders_last_7d bigint,
  latest_synced_at timestamp with time zone,
  latest_sync_status text,
  is_sync_enabled boolean
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
    (SELECT COUNT(*) FROM public.ebay_orders eo WHERE eo.user_id = p.id AND eo.order_date >= NOW() - INTERVAL '7 days') AS orders_last_7d,
    (SELECT MAX(synced_at) FROM public.ebay_orders eo WHERE eo.user_id = p.id) AS latest_synced_at,
    (SELECT status FROM public.ebay_sync_logs esl WHERE esl.user_id = p.id ORDER BY created_at DESC LIMIT 1) AS latest_sync_status,
    COALESCE((SELECT is_enabled FROM public.user_feature_overrides ufo WHERE ufo.user_id = p.id AND ufo.feature_key = 'ebay_sync'), true) AS is_sync_enabled
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

-- Create RPC for User Snapshot to fix RLS issue
CREATE OR REPLACE FUNCTION public.get_ebay_user_admin_summary(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_rec record;
  total_orders bigint;
  orders_24h bigint;
  latest_sync timestamp with time zone;
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO profile_rec FROM public.profiles WHERE id = target_user_id;
  
  IF profile_rec IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  SELECT COUNT(*) INTO total_orders FROM public.ebay_orders WHERE user_id = target_user_id;
  
  SELECT COUNT(*) INTO orders_24h FROM public.ebay_orders 
  WHERE user_id = target_user_id AND order_date >= NOW() - INTERVAL '24 hours';
  
  SELECT MAX(synced_at) INTO latest_sync FROM public.ebay_orders WHERE user_id = target_user_id;

  result := jsonb_build_object(
    'id', profile_rec.id,
    'email', profile_rec.email,
    'full_name', profile_rec.full_name,
    'account_status', profile_rec.account_status,
    'credits', profile_rec.credits,
    'created_at', profile_rec.created_at,
    'total_orders', total_orders,
    'orders_last_24h', orders_24h,
    'latest_synced_at', latest_sync
  );

  RETURN result;
END;
$$;

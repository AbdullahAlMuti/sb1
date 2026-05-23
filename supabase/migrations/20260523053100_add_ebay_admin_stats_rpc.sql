-- Add global index on order_date and synced_at for performance 
CREATE INDEX IF NOT EXISTS idx_ebay_orders_order_date ON public.ebay_orders (order_date DESC);
CREATE INDEX IF NOT EXISTS idx_ebay_orders_synced_at ON public.ebay_orders (synced_at DESC);

-- Create secure RPC for fetching aggregated eBay stats
CREATE OR REPLACE FUNCTION public.get_ebay_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_orders bigint;
  total_revenue numeric;
  orders_last_24h bigint;
  orders_last_7d bigint;
  unique_users bigint;
  latest_synced_at timestamp with time zone;
  sync_status text;
  result jsonb;
BEGIN
  -- 1) Enforce Admin Access
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2) Calculate Aggregates
  -- Using FILTER (WHERE currency = 'USD') or just sum for MVP.
  -- Assuming MVP is mostly USD or simply aggregating total_amount blindly.
  SELECT COUNT(*) INTO total_orders FROM public.ebay_orders;
  
  -- Use COALESCE to return 0 instead of null
  SELECT COALESCE(SUM(total_amount), 0) INTO total_revenue 
  FROM public.ebay_orders 
  WHERE currency = 'USD';

  SELECT COUNT(*) INTO orders_last_24h 
  FROM public.ebay_orders 
  WHERE order_date >= NOW() - INTERVAL '24 hours';

  SELECT COUNT(*) INTO orders_last_7d 
  FROM public.ebay_orders 
  WHERE order_date >= NOW() - INTERVAL '7 days';

  SELECT COUNT(DISTINCT user_id) INTO unique_users FROM public.ebay_orders;

  SELECT MAX(synced_at) INTO latest_synced_at FROM public.ebay_orders;

  -- Determine Sync Status (Healthy if < 2 hours)
  IF latest_synced_at IS NULL THEN
    sync_status := 'unknown';
  ELSIF latest_synced_at >= NOW() - INTERVAL '2 hours' THEN
    sync_status := 'healthy';
  ELSE
    sync_status := 'stale';
  END IF;

  -- 3) Return Structured JSON
  result := jsonb_build_object(
    'summary', jsonb_build_object(
      'totalOrders', total_orders,
      'totalRevenue', total_revenue,
      'ordersLast24h', orders_last_24h,
      'ordersLast7d', orders_last_7d,
      'uniqueUsersWithOrders', unique_users,
      'latestSyncedAt', latest_synced_at,
      'syncFreshnessStatus', sync_status
    )
  );

  RETURN result;
END;
$$;

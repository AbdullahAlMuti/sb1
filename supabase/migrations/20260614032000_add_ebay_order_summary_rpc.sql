-- Migration: Add get_ebay_order_summary RPC with deduplication
CREATE OR REPLACE FUNCTION public.get_ebay_order_summary(
  p_user_id uuid,
  p_status text DEFAULT 'all',
  p_search text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE(total_revenue numeric, distinct_rows bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deduped_orders AS (
    -- Group orders by ebay_order_id and total_amount to collapse duplicate rows
    SELECT
      o.ebay_order_id,
      o.total_amount,
      MIN(o.order_status) AS order_status,
      MAX(o.buyer_name) AS buyer_name,
      MAX(o.buyer_email) AS buyer_email,
      MIN(o.order_date) AS order_date
    FROM public.ebay_orders o
    WHERE o.user_id = p_user_id
      AND o.deleted_at IS NULL
    GROUP BY o.ebay_order_id, o.total_amount
  )
  SELECT
    COALESCE(SUM(COALESCE(d.total_amount, 0)), 0)::numeric AS total_revenue,
    COUNT(*)::bigint AS distinct_rows
  FROM deduped_orders d
  WHERE
    -- Apply status filter
    (
      p_status IS NULL
      OR p_status = 'all'
      OR (
        lower(p_status) = 'cancelled'
        AND (lower(COALESCE(d.order_status, '')) = 'cancelled' OR COALESCE(d.total_amount, 0) = 0)
      )
      OR (
        lower(p_status) <> 'cancelled'
        AND lower(COALESCE(d.order_status, '')) = lower(p_status)
        AND COALESCE(d.total_amount, 0) <> 0
      )
    )
    AND (
      p_status <> 'all'
      OR (lower(COALESCE(d.order_status, '')) <> 'cancelled' AND COALESCE(d.total_amount, 0) <> 0)
    )
    -- Apply search filter
    AND (
      p_search IS NULL
      OR d.ebay_order_id ILIKE '%' || p_search || '%'
      OR d.buyer_name ILIKE '%' || p_search || '%'
      OR d.buyer_email ILIKE '%' || p_search || '%'
    )
    -- Apply date filters
    AND (p_date_from IS NULL OR d.order_date >= p_date_from)
    AND (p_date_to IS NULL OR d.order_date <= p_date_to);
$$;

-- Revoke default execute permissions and grant strictly to the service_role
REVOKE EXECUTE ON FUNCTION public.get_ebay_order_summary(uuid, text, text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ebay_order_summary(uuid, text, text, timestamptz, timestamptz) TO service_role;

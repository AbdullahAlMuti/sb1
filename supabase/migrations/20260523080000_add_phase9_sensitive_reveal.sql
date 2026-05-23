-- Phase 9: Controlled Debug Data Reveal

CREATE OR REPLACE FUNCTION public.get_sensitive_order_debug_data(
  p_user_id uuid,
  p_order_id text, -- Supports both id (uuid) or ebay_order_id (text) searches
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_rec record;
  sync_log_rec record;
  result jsonb;
  v_uuid uuid;
  is_valid_uuid boolean := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to reveal sensitive data.';
  END IF;

  IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
    RAISE EXCEPTION 'An order ID is required.';
  END IF;

  -- Check if p_order_id is a UUID
  BEGIN
    v_uuid := p_order_id::uuid;
    is_valid_uuid := true;
  EXCEPTION WHEN invalid_text_representation THEN
    is_valid_uuid := false;
  END;

  -- Fetch the order safely
  SELECT * INTO order_rec
  FROM public.ebay_orders
  WHERE user_id = p_user_id
    AND (
      (is_valid_uuid AND id = v_uuid) OR 
      (ebay_order_id = p_order_id)
    )
  LIMIT 1;

  IF order_rec IS NULL THEN
    RAISE EXCEPTION 'Order not found for this user.';
  END IF;

  -- Optionally fetch the most recent sync log error for this specific order if available
  SELECT * INTO sync_log_rec
  FROM public.ebay_sync_logs
  WHERE user_id = p_user_id
    AND entity_id = order_rec.ebay_order_id
    AND status = 'error'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Construct response payload
  result := jsonb_build_object(
    'order', jsonb_build_object(
      'id', order_rec.id,
      'ebay_order_id', order_rec.ebay_order_id,
      'order_status', order_rec.order_status,
      'order_date', order_rec.order_date,
      'total_amount', order_rec.total_amount,
      'currency', order_rec.currency,
      'item_title', order_rec.item_title,
      'quantity', order_rec.quantity
    ),
    'buyer', jsonb_build_object(
      'name', order_rec.buyer_name,
      'username', order_rec.buyer_username,
      'email', order_rec.buyer_email,
      'zip', order_rec.buyer_zip
    ),
    'shipping', jsonb_build_object(
      'address', order_rec.shipping_address,
      'ship_by_date', order_rec.ship_by_date,
      'date_sold', order_rec.date_sold,
      'date_paid', order_rec.date_paid
    ),
    'debug', jsonb_build_object(
      'line_items', order_rec.line_items,
      'sync_error', sync_log_rec.error_message,
      'sync_metadata', sync_log_rec.metadata
    )
  );

  -- Log the sensitive reveal to audit logs before returning
  PERFORM public.log_admin_action(
    p_user_id,
    'sensitive_data_revealed',
    'ebay_order',
    order_rec.ebay_order_id,
    NULL,
    NULL,
    p_reason,
    jsonb_build_object(
      'fields_revealed', ARRAY['buyer', 'shipping', 'line_items'],
      'source', 'ebay_admin_support_center',
      'reveal_type', 'controlled_debug'
    )
  );

  RETURN result;
END;
$$;

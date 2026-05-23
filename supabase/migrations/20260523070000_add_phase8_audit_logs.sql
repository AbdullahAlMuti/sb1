-- Phase 8: Audit Logs RPCs

-- 1. Search Audit Logs
CREATE OR REPLACE FUNCTION public.search_admin_audit_logs(
  search_query text DEFAULT '',
  action_filter text DEFAULT 'all',
  limit_val int DEFAULT 50,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  log_id uuid,
  admin_id uuid,
  admin_email text,
  target_user_id uuid,
  target_user_email text,
  action text,
  entity_type text,
  entity_id text,
  old_value text,
  new_value text,
  reason text,
  metadata jsonb,
  created_at timestamp with time zone
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
  SELECT 
    al.id AS log_id,
    al.admin_id,
    adm.email AS admin_email,
    al.target_user_id,
    tgt.email AS target_user_email,
    al.action,
    al.entity_type,
    al.entity_id,
    al.old_value,
    al.new_value,
    al.reason,
    al.metadata,
    al.created_at
  FROM public.admin_audit_logs al
  LEFT JOIN auth.users adm ON adm.id = al.admin_id
  LEFT JOIN public.profiles tgt ON tgt.id = al.target_user_id
  WHERE (
    search_query = '' OR 
    tgt.email ILIKE '%' || search_query || '%' OR 
    adm.email ILIKE '%' || search_query || '%' OR
    al.action ILIKE '%' || search_query || '%' OR
    al.reason ILIKE '%' || search_query || '%'
  )
  AND (
    action_filter = 'all' OR 
    al.action = action_filter OR
    (action_filter = 'credits' AND al.action = 'credit_adjusted') OR
    (action_filter = 'features' AND al.action IN ('update_global_feature', 'update_user_feature_override', 'remove_user_feature_override'))
  )
  ORDER BY al.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

-- 2. Get Audit Log Detail
CREATE OR REPLACE FUNCTION public.get_admin_audit_log_detail(p_log_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'id', al.id,
    'admin_id', al.admin_id,
    'admin_email', adm.email,
    'target_user_id', al.target_user_id,
    'target_user_email', tgt.email,
    'action', al.action,
    'entity_type', al.entity_type,
    'entity_id', al.entity_id,
    'old_value', al.old_value,
    'new_value', al.new_value,
    'reason', al.reason,
    'metadata', al.metadata,
    'created_at', al.created_at
  ) INTO result
  FROM public.admin_audit_logs al
  LEFT JOIN auth.users adm ON adm.id = al.admin_id
  LEFT JOIN public.profiles tgt ON tgt.id = al.target_user_id
  WHERE al.id = p_log_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

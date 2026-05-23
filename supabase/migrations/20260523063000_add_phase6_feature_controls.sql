-- Phase 6: Feature Controls RPCs and Audit Table

-- 1. admin_audit_logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  old_value text,
  new_value text,
  reason text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS: Only admins can read/write
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage audit logs" ON public.admin_audit_logs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Helper function to log audits securely
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_target_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_old_value text,
  p_new_value text,
  p_reason text,
  p_metadata jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.admin_audit_logs (admin_id, target_user_id, action, entity_type, entity_id, old_value, new_value, reason, metadata)
  VALUES (auth.uid(), p_target_user_id, p_action, p_entity_type, p_entity_id, p_old_value, p_new_value, p_reason, p_metadata);
END;
$$;


-- 2. Verify Feature Key
CREATE OR REPLACE FUNCTION public.is_valid_ebay_feature(feature_key text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN feature_key IN (
    'ebay_dashboard', 'ebay_orders', 'ebay_sync', 'ebay_product_insights',
    'ebay_best_selling', 'ebay_must_sell', 'ebay_profitable_products',
    'ebay_sync_health', 'ebay_marketplace_trends', 'ebay_listing_analytics',
    'ebay_experimental_modules'
  );
END;
$$;


-- 3. Get Global Feature Controls
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
      'ebay_best_selling', 'ebay_must_sell', 'ebay_profitable_products',
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


-- 4. Update Global Feature Control
CREATE OR REPLACE FUNCTION public.update_ebay_global_feature_control(
  p_feature_key text,
  p_enabled boolean,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_val text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.is_valid_ebay_feature(p_feature_key) THEN
    RAISE EXCEPTION 'Invalid feature key: %', p_feature_key;
  END IF;
  
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to modify global features.';
  END IF;

  -- Get old value
  SELECT value INTO old_val FROM public.admin_settings WHERE key = 'feature_' || p_feature_key;

  -- Insert or Update
  INSERT INTO public.admin_settings (key, value, description, updated_at)
  VALUES ('feature_' || p_feature_key, p_enabled::text, 'Global feature toggle for ' || p_feature_key, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  -- Audit Log
  PERFORM public.log_admin_action(
    NULL, 'update_global_feature', 'feature_control', p_feature_key, 
    COALESCE(old_val, 'true'), p_enabled::text, p_reason
  );
END;
$$;


-- 5. Get User Feature Overrides
CREATE OR REPLACE FUNCTION public.get_user_feature_overrides_admin(p_user_id uuid)
RETURNS TABLE (
  feature_key text,
  is_enabled boolean,
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
  SELECT o.feature_key, o.is_enabled, o.created_at
  FROM public.user_feature_overrides o
  WHERE o.user_id = p_user_id;
END;
$$;


-- 6. Update User Feature Override
CREATE OR REPLACE FUNCTION public.update_user_feature_override(
  p_user_id uuid,
  p_feature_key text,
  p_enabled boolean,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_val text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.is_valid_ebay_feature(p_feature_key) THEN
    RAISE EXCEPTION 'Invalid feature key: %', p_feature_key;
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to modify user overrides.';
  END IF;

  SELECT is_enabled::text INTO old_val FROM public.user_feature_overrides 
  WHERE user_id = p_user_id AND feature_key = p_feature_key;

  INSERT INTO public.user_feature_overrides (user_id, feature_key, is_enabled, admin_id, created_at)
  VALUES (p_user_id, p_feature_key, p_enabled, auth.uid(), now())
  ON CONFLICT (user_id, feature_key) DO UPDATE 
  SET is_enabled = EXCLUDED.is_enabled, admin_id = EXCLUDED.admin_id, created_at = now();

  PERFORM public.log_admin_action(
    p_user_id, 'update_user_feature_override', 'feature_override', p_feature_key, 
    COALESCE(old_val, 'none'), p_enabled::text, p_reason
  );
END;
$$;


-- 7. Remove User Feature Override
CREATE OR REPLACE FUNCTION public.remove_user_feature_override(
  p_user_id uuid,
  p_feature_key text,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_val text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.is_valid_ebay_feature(p_feature_key) THEN
    RAISE EXCEPTION 'Invalid feature key: %', p_feature_key;
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to remove user overrides.';
  END IF;

  SELECT is_enabled::text INTO old_val FROM public.user_feature_overrides 
  WHERE user_id = p_user_id AND feature_key = p_feature_key;

  IF old_val IS NOT NULL THEN
    DELETE FROM public.user_feature_overrides WHERE user_id = p_user_id AND feature_key = p_feature_key;

    PERFORM public.log_admin_action(
      p_user_id, 'remove_user_feature_override', 'feature_override', p_feature_key, 
      old_val, 'none', p_reason
    );
  END IF;
END;
$$;

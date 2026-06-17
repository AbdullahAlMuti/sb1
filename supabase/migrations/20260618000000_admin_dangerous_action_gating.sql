-- Migration: Tighten the most dangerous admin RPCs to super_admin
-- Location: supabase/migrations/20260618000000_admin_dangerous_action_gating.sql
--
-- Policy (see ADMIN_SCOPE.md Part D): routine support stays at `admin`
-- (verify email, support notes, SMALL credit comps, plan changes, extend sub,
-- suspend/activate). The genuinely dangerous overrides move to `super_admin`:
--   * update_user_limits_admin     — overriding plan entitlements
--   * adjust_user_credits_admin     — only when |amount| > LARGE_GRANT_THRESHOLD
--
-- LOCKOUT-SAFE: the super_admin requirement only takes effect once at least one
-- super_admin exists. Until then, admins keep full access, so this migration is
-- safe to apply immediately. Assign super_admin roles when ready to enforce.

-- 1. Limit overrides → super_admin only
CREATE OR REPLACE FUNCTION public.update_user_limits_admin(
  p_user_id uuid,
  p_max_listings int,
  p_max_auto_orders int,
  p_credits_per_month int,
  p_reason text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_limits jsonb;
  v_new_limits jsonb;
BEGIN
  -- Must be at least admin.
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  -- Lockout-safe tightening: require super_admin for limit overrides ONLY once a
  -- super_admin exists. Before any super_admin is assigned, admins retain access
  -- so applying this migration cannot lock anyone out.
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin')
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized: limit overrides require super_admin' USING ERRCODE = '42501';
  END IF;

  SELECT admin_override_limits INTO v_old_limits FROM public.user_plans WHERE user_id = p_user_id;

  v_new_limits := jsonb_build_object(
    'max_listings', p_max_listings,
    'max_auto_orders', p_max_auto_orders,
    'credits_per_month', p_credits_per_month
  );

  UPDATE public.user_plans
  SET admin_override_limits = v_new_limits,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, metadata)
  VALUES (
    p_user_id,
    'USER_LIMITS_OVERRIDDEN',
    'plan',
    p_user_id::text,
    COALESCE(v_old_limits, '{}'::jsonb),
    v_new_limits,
    jsonb_build_object('admin_id', auth.uid(), 'reason', p_reason)
  );

  RETURN true;
END;
$$;

-- 2. Large credit grants → super_admin; small comps stay at admin
CREATE OR REPLACE FUNCTION public.adjust_user_credits_admin(
  p_user_id uuid,
  p_amount int,
  p_adjustment_type text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_balance int;
  new_balance int;
  valid_types text[] := ARRAY['grant', 'revoke', 'correction', 'goodwill', 'refund'];
  large_grant_threshold int := 100;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Lockout-safe tightening: large adjustments require super_admin ONLY once a
  -- super_admin exists; routine comps stay admin. Before any super_admin is
  -- assigned, admins retain full access.
  IF abs(p_amount) > large_grant_threshold
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin')
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized: adjustments over % credits require super_admin', large_grant_threshold
      USING ERRCODE = '42501';
  END IF;

  IF NOT p_adjustment_type = ANY(valid_types) THEN
    RAISE EXCEPTION 'Invalid adjustment type: %', p_adjustment_type USING ERRCODE = '42601';
  END IF;

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Adjustment amount cannot be zero.' USING ERRCODE = '42601';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to adjust credits.' USING ERRCODE = '42601';
  END IF;

  SELECT COALESCE(credits, 0) INTO old_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF old_balance IS NULL THEN
    RAISE EXCEPTION 'User not found.' USING ERRCODE = 'P0002';
  END IF;

  new_balance := old_balance + p_amount;
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in negative balance.' USING ERRCODE = '42601';
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, balance_after, description)
  VALUES (p_user_id, p_amount, p_adjustment_type, new_balance, p_reason);

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, metadata)
  VALUES (
    p_user_id,
    'CREDITS_ADJUSTED',
    'user',
    p_user_id::text,
    jsonb_build_object('credits', old_balance),
    jsonb_build_object('credits', new_balance),
    jsonb_build_object('admin_id', auth.uid(), 'reason', p_reason, 'adjustment_type', p_adjustment_type, 'amount', p_amount)
  );

  RETURN jsonb_build_object(
    'old_balance', old_balance,
    'new_balance', new_balance,
    'adjustment_amount', p_amount,
    'adjustment_type', p_adjustment_type
  );
END;
$$;

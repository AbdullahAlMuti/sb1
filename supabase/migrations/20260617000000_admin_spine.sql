-- Migration: Operational Admin Panel Spine
-- Location: supabase/migrations/20260617000000_admin_spine.sql

-- 1. Immutable Audit Log Triggers
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_update_delete_audit_logs ON public.audit_logs;
CREATE TRIGGER trg_prevent_update_delete_audit_logs
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_modification();

DROP TRIGGER IF EXISTS trg_prevent_update_delete_admin_audit_logs ON public.admin_audit_logs;
CREATE TRIGGER trg_prevent_update_delete_admin_audit_logs
  BEFORE UPDATE OR DELETE ON public.admin_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_modification();


-- 2. Modify Credit Transactions Check Constraint
ALTER TABLE public.credit_transactions 
  DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;

ALTER TABLE public.credit_transactions 
  ADD CONSTRAINT credit_transactions_transaction_type_check 
  CHECK (transaction_type IN ('plan_grant', 'usage', 'manual_adjustment', 'promo', 'refund', 'period_reset', 'grant', 'revoke', 'correction', 'goodwill'));


-- 3. Redefine Profile Guard with ledger_sync Bypass
CREATE OR REPLACE FUNCTION public.guard_profile_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims text := current_setting('request.jwt.claims', true);
  v_role   text;
  v_sync   text := current_setting('app.ledger_sync', true);
BEGIN
  -- Ledger sync bypass
  IF v_sync = 'true' THEN
    RETURN NEW;
  END IF;

  -- No JWT claims → trusted server/DB context (signup trigger, migrations). Allow.
  IF v_claims IS NULL OR v_claims = '' THEN
    RETURN NEW;
  END IF;

  v_role := (v_claims::jsonb) ->> 'role';

  -- service_role bypasses (edge functions / webhook run with the service key).
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admins/super-admins may manage billing + account status from the panel.
  IF public.has_role((select auth.uid()), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Ordinary authenticated client: reject any change to a protected column.
  IF NEW.credits             IS DISTINCT FROM OLD.credits
     OR NEW.payment_status      IS DISTINCT FROM OLD.payment_status
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.plan_id             IS DISTINCT FROM OLD.plan_id
     OR NEW.selected_plan_id    IS DISTINCT FROM OLD.selected_plan_id
     OR NEW.pending_plan_id     IS DISTINCT FROM OLD.pending_plan_id
     OR NEW.customer_id         IS DISTINCT FROM OLD.customer_id
     OR NEW.subscription_id     IS DISTINCT FROM OLD.subscription_id
     OR NEW.subscription_provider IS DISTINCT FROM OLD.subscription_provider
     OR NEW.current_period_start  IS DISTINCT FROM OLD.current_period_start
     OR NEW.current_period_end    IS DISTINCT FROM OLD.current_period_end
     OR NEW.is_active           IS DISTINCT FROM OLD.is_active
  THEN
    RAISE EXCEPTION 'Not allowed to modify billing, subscription, or account-status columns'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;


-- 4. Credit Ledger Auto-Sync Trigger
CREATE OR REPLACE FUNCTION public.sync_profile_credits_from_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
BEGIN
  -- Calculate total credits from ledger
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM public.credit_transactions
  WHERE user_id = NEW.user_id;

  -- Enable ledger sync bypass
  PERFORM set_config('app.ledger_sync', 'true', true);

  -- Update profile
  UPDATE public.profiles
  SET credits = v_total,
      updated_at = now()
  WHERE id = NEW.user_id;

  -- Reset ledger sync bypass
  PERFORM set_config('app.ledger_sync', 'false', true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_credits ON public.credit_transactions;
CREATE TRIGGER trg_sync_profile_credits
  AFTER INSERT ON public.credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_credits_from_ledger();


-- 5. Admin Database Mutation RPCs
-- 5.1 Credit Adjustment
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
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
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

  -- Lock profile row
  SELECT COALESCE(credits, 0) INTO old_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF old_balance IS NULL THEN
    RAISE EXCEPTION 'User not found.' USING ERRCODE = 'P0002';
  END IF;

  new_balance := old_balance + p_amount;
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in negative balance.' USING ERRCODE = '42601';
  END IF;

  -- Insert credit transaction (Trigger trg_sync_profile_credits will update profiles.credits)
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, balance_after, description)
  VALUES (p_user_id, p_amount, p_adjustment_type, new_balance, p_reason);

  -- Insert audit log
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

-- 5.2 User status toggling
CREATE OR REPLACE FUNCTION public.toggle_user_status_admin(
  p_user_id uuid,
  p_is_active boolean,
  p_reason text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT is_active INTO v_old_status FROM public.profiles WHERE id = p_user_id;
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  -- Bypass trigger column check
  PERFORM set_config('app.ledger_sync', 'true', true);

  UPDATE public.profiles
  SET is_active = p_is_active,
      updated_at = now()
  WHERE id = p_user_id;

  PERFORM set_config('app.ledger_sync', 'false', true);

  -- Write audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, metadata)
  VALUES (
    p_user_id,
    CASE WHEN p_is_active THEN 'USER_ACTIVATED' ELSE 'USER_DEACTIVATED' END,
    'user',
    p_user_id::text,
    jsonb_build_object('is_active', v_old_status),
    jsonb_build_object('is_active', p_is_active),
    jsonb_build_object('admin_id', auth.uid(), 'reason', p_reason)
  );

  RETURN true;
END;
$$;

-- 5.3 User Plan Update
CREATE OR REPLACE FUNCTION public.update_user_plan_admin(
  p_user_id uuid,
  p_plan_id uuid,
  p_reason text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_plan_id uuid;
  v_new_plan_name text;
  v_credits int;
  v_old_credits int;
  v_existing_user_plan uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT plan_id, COALESCE(credits, 0) INTO v_old_plan_id, v_old_credits FROM public.profiles WHERE id = p_user_id;
  IF v_old_plan_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT name, COALESCE(credits_per_month, 0) INTO v_new_plan_name, v_credits
  FROM public.plans WHERE id = p_plan_id;
  
  IF v_new_plan_name IS NULL THEN
    RAISE EXCEPTION 'Plan not found' USING ERRCODE = 'P0002';
  END IF;

  -- Bypass profile triggers
  PERFORM set_config('app.ledger_sync', 'true', true);

  -- Update profiles plan_id
  UPDATE public.profiles
  SET plan_id = p_plan_id,
      updated_at = now()
  WHERE id = p_user_id;

  PERFORM set_config('app.ledger_sync', 'false', true);

  -- Upsert user_plans
  SELECT id INTO v_existing_user_plan FROM public.user_plans WHERE user_id = p_user_id LIMIT 1;
  IF v_existing_user_plan IS NOT NULL THEN
    UPDATE public.user_plans
    SET plan_id = p_plan_id,
        status = 'active',
        credits_used = 0,
        current_period_start = now(),
        current_period_end = now() + INTERVAL '30 days',
        updated_at = now()
    WHERE id = v_existing_user_plan;
  ELSE
    INSERT INTO public.user_plans (user_id, plan_id, status, credits_used, current_period_start, current_period_end)
    VALUES (p_user_id, p_plan_id, 'active', 0, now(), now() + INTERVAL '30 days');
  END IF;

  -- Grant plan credits via ledger
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, balance_after, description)
  VALUES (p_user_id, v_credits, 'plan_grant', v_old_credits + v_credits, 'Plan change grant to ' || v_new_plan_name || ' by admin');

  -- Write audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, metadata)
  VALUES (
    p_user_id,
    'USER_PLAN_UPDATED',
    'plan',
    p_user_id::text,
    jsonb_build_object('plan_id', v_old_plan_id),
    jsonb_build_object('plan_id', p_plan_id),
    jsonb_build_object('admin_id', auth.uid(), 'reason', p_reason, 'plan_name', v_new_plan_name)
  );

  RETURN true;
END;
$$;

-- 5.4 Update User Limits
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
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
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

  -- Write audit log
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

-- 5.5 Extend User Subscription
CREATE OR REPLACE FUNCTION public.extend_user_subscription_admin(
  p_user_id uuid,
  p_days int,
  p_reason text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_end timestamp with time zone;
  v_new_end timestamp with time zone;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT current_period_end INTO v_old_end FROM public.user_plans WHERE user_id = p_user_id;
  IF v_old_end IS NULL THEN
    v_old_end := now();
  END IF;

  v_new_end := v_old_end + (p_days || ' days')::interval;

  UPDATE public.user_plans
  SET current_period_end = v_new_end,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Write audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, metadata)
  VALUES (
    p_user_id,
    'USER_SUBSCRIPTION_EXTENDED',
    'plan',
    p_user_id::text,
    jsonb_build_object('current_period_end', v_old_end),
    jsonb_build_object('current_period_end', v_new_end),
    jsonb_build_object('admin_id', auth.uid(), 'days', p_days, 'reason', p_reason)
  );

  RETURN true;
END;
$$;


-- 6. Unified User Dashboard Stats RPC for Admin Panel
CREATE OR REPLACE FUNCTION public.get_ebay_user_dashboard_stats_admin(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
  v_user_plan public.user_plans;
  v_plan_name text;
  
  v_inventory_value numeric;
  v_total_cost numeric;
  v_active_listings bigint;
  
  v_total_orders bigint;
  v_completed_orders bigint;
  v_cancelled_orders bigint;
  v_revenue numeric;
  v_success_rate numeric;
  v_avg_order_value numeric;
  
  v_sync_enabled boolean;
  v_last_sync_at timestamp with time zone;
  v_sync_status text;
  
  v_stripe_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Profile details
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  -- Plan details
  SELECT * INTO v_user_plan FROM public.user_plans WHERE user_id = p_user_id;
  SELECT display_name INTO v_plan_name FROM public.plans WHERE id = v_profile.plan_id;

  -- Listings calculations
  SELECT 
    COALESCE(SUM(ebay_price), 0),
    COALESCE(SUM(amazon_price), 0),
    COUNT(*)
  INTO v_inventory_value, v_total_cost, v_active_listings
  FROM public.listings
  WHERE user_id = p_user_id AND status = 'active';

  -- Orders calculations
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN order_status IN ('completed', 'paid', 'shipped', 'vat paid') THEN 1 END),
    COUNT(CASE WHEN order_status ILIKE '%cancel%' OR order_status ILIKE '%refund%' OR order_status ILIKE '%return%' THEN 1 END),
    COALESCE(SUM(revenue), 0),
    COALESCE(MAX(synced_at), v_profile.updated_at)
  INTO v_total_orders, v_completed_orders, v_cancelled_orders, v_revenue, v_last_sync_at
  FROM public.ebay_orders
  WHERE user_id = p_user_id;

  -- Blended stats
  IF v_completed_orders + v_cancelled_orders > 0 THEN
    v_success_rate := (v_completed_orders::numeric / (v_completed_orders + v_cancelled_orders)::numeric) * 100;
  ELSE
    v_success_rate := 100; -- default 100% if no orders completed/cancelled yet
  END IF;

  IF v_total_orders > 0 THEN
    v_avg_order_value := v_revenue / v_total_orders;
  ELSE
    v_avg_order_value := 0;
  END IF;

  -- Feature Flags / Sync settings
  SELECT COALESCE(is_enabled, true) INTO v_sync_enabled 
  FROM public.user_feature_overrides 
  WHERE user_id = p_user_id AND feature_key = 'ebay_sync';
  
  IF v_sync_enabled IS NULL THEN
    v_sync_enabled := true;
  END IF;

  SELECT status INTO v_sync_status 
  FROM public.ebay_sync_logs 
  WHERE user_id = p_user_id 
  ORDER BY created_at DESC LIMIT 1;

  -- Stripe status
  SELECT status INTO v_stripe_status
  FROM public.subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC LIMIT 1;

  IF v_stripe_status IS NULL THEN
    v_stripe_status := COALESCE(v_profile.subscription_status, 'none');
  END IF;

  RETURN jsonb_build_object(
    'id', v_profile.id,
    'email', v_profile.email,
    'full_name', v_profile.full_name,
    'credits', COALESCE(v_profile.credits, 0),
    'is_active', COALESCE(v_profile.is_active, true),
    'plan_name', COALESCE(v_plan_name, 'Free Trial'),
    'plan_status', COALESCE(v_user_plan.status, 'inactive'),
    'stripe_status', v_stripe_status,
    'subscription_period_end', v_user_plan.current_period_end,
    'active_listings', v_active_listings,
    'inventory_value', v_inventory_value,
    'total_cost', v_total_cost,
    'total_orders', v_total_orders,
    'completed_orders', v_completed_orders,
    'cancelled_orders', v_cancelled_orders,
    'revenue', v_revenue,
    'success_rate', ROUND(v_success_rate, 1),
    'avg_order_value', ROUND(v_avg_order_value, 2),
    'is_sync_enabled', v_sync_enabled,
    'last_sync_at', v_last_sync_at,
    'sync_status', COALESCE(v_sync_status, 'pending'),
    'created_at', v_profile.created_at
  );
END;
$$;

-- SellerSuit audit remediation P1/P2 database hardening.
-- Generated with: npx supabase@latest migration new audit_remediation_p1

-- Billing customer canonical id used by checkout, customer portal, and webhooks.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
ON public.profiles (stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Compatibility/indexes for atomic idempotency checks.
CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_orders_user_ebay_order_unique
ON public.auto_orders (user_id, ebay_order_id)
WHERE ebay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_user_ebay_item_id
ON public.listings (user_id, ebay_item_id)
WHERE ebay_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_user_sku
ON public.listings (user_id, sku)
WHERE sku IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  workspace_id uuid,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'dead_letter')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  run_after timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own background jobs" ON public.background_jobs;
CREATE POLICY "Users can view own background jobs"
ON public.background_jobs
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_background_jobs_claim
ON public.background_jobs (status, run_after, created_at)
WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_background_jobs_user_created
ON public.background_jobs (user_id, created_at DESC);

-- RLS UPDATE hardening: USING controls the old row, WITH CHECK controls the new row.
DROP POLICY IF EXISTS "Users can update own alerts" ON public.inventory_alerts;
CREATE POLICY "Users can update own alerts"
ON public.inventory_alerts
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own listings" ON public.listings;
CREATE POLICY "Users can update own listings"
ON public.listings
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON public.auto_orders;
CREATE POLICY "Users can update own orders"
ON public.auto_orders
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.notification_settings;
CREATE POLICY "Users can update own settings"
ON public.notification_settings
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.create_listing_with_usage(
  p_user_id uuid,
  p_listing jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_rec public.profiles%rowtype;
  user_plan_rec public.user_plans%rowtype;
  plan_rec record;
  listing_limit integer := 10;
  active_listing_count integer := 0;
  existing_listing public.listings%rowtype;
  created_listing public.listings%rowtype;
  new_credit_balance integer;
  listing_idempotency_key text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('create-listing:' || p_user_id::text, 0));

  SELECT * INTO profile_rec
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  SELECT * INTO user_plan_rec
  FROM public.user_plans
  WHERE user_id = p_user_id
  FOR UPDATE;

  SELECT p.* INTO plan_rec
  FROM public.plans p
  WHERE p.is_active = true
    AND (
      p.id = user_plan_rec.plan_id
      OR p.id::text = profile_rec.plan_id
      OR p.name = profile_rec.plan_id
    )
  ORDER BY CASE WHEN p.id = user_plan_rec.plan_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF user_plan_rec.is_blocked THEN
    RAISE EXCEPTION '%', COALESCE(user_plan_rec.blocked_reason, 'Account is blocked');
  END IF;

  IF user_plan_rec.status = 'canceled'
    OR (user_plan_rec.current_period_end IS NOT NULL AND user_plan_rec.current_period_end < now())
    OR (COALESCE(plan_rec.is_trial, false) AND user_plan_rec.trial_end IS NOT NULL AND user_plan_rec.trial_end < now())
  THEN
    RAISE EXCEPTION 'Subscription expired. Please renew your plan.';
  END IF;

  listing_limit := COALESCE(
    NULLIF(user_plan_rec.admin_override_limits ->> 'max_listings', '')::integer,
    plan_rec.max_listings,
    10
  );

  listing_idempotency_key := COALESCE(NULLIF(p_listing ->> 'ebay_item_id', ''), NULLIF(p_listing ->> 'sku', ''));

  IF listing_idempotency_key IS NOT NULL THEN
    SELECT * INTO existing_listing
    FROM public.listings
    WHERE user_id = p_user_id
      AND (
        ebay_item_id = listing_idempotency_key
        OR sku = listing_idempotency_key
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'action', 'existing',
        'listing', to_jsonb(existing_listing),
        'credits_remaining', profile_rec.credits
      );
    END IF;
  END IF;

  SELECT count(*) INTO active_listing_count
  FROM public.listings
  WHERE user_id = p_user_id
    AND status = 'active';

  IF active_listing_count + 1 > listing_limit THEN
    RAISE EXCEPTION 'Listing limit reached (%/%). Upgrade your plan.', active_listing_count, listing_limit;
  END IF;

  IF COALESCE(profile_rec.credits, 0) < 1 THEN
    RAISE EXCEPTION 'Insufficient credits. You have %, need 1.', COALESCE(profile_rec.credits, 0);
  END IF;

  new_credit_balance := COALESCE(profile_rec.credits, 0) - 1;

  INSERT INTO public.listings (
    user_id,
    title,
    description,
    price,
    asin,
    sku,
    category,
    status,
    amazon_data,
    ebay_data,
    ebay_item_id,
    ebay_price,
    amazon_price,
    amazon_asin,
    amazon_url,
    auto_order_enabled
  )
  VALUES (
    p_user_id,
    NULLIF(p_listing ->> 'title', ''),
    NULLIF(p_listing ->> 'description', ''),
    NULLIF(p_listing ->> 'price', '')::numeric,
    NULLIF(p_listing ->> 'asin', ''),
    NULLIF(p_listing ->> 'sku', ''),
    NULLIF(p_listing ->> 'category', ''),
    COALESCE(NULLIF(p_listing ->> 'status', ''), 'active'),
    COALESCE(p_listing -> 'amazon_data', '{}'::jsonb),
    COALESCE(p_listing -> 'ebay_data', '{}'::jsonb),
    NULLIF(p_listing ->> 'ebay_item_id', ''),
    NULLIF(p_listing ->> 'ebay_price', '')::numeric,
    NULLIF(p_listing ->> 'amazon_price', '')::numeric,
    NULLIF(p_listing ->> 'amazon_asin', ''),
    NULLIF(p_listing ->> 'amazon_url', ''),
    COALESCE(NULLIF(p_listing ->> 'auto_order_enabled', '')::boolean, false)
  )
  RETURNING * INTO created_listing;

  UPDATE public.profiles
  SET credits = new_credit_balance,
      updated_at = now()
  WHERE id = p_user_id;

  UPDATE public.user_plans
  SET credits_used = COALESCE(credits_used, 0) + 1,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    balance_after,
    description,
    metadata
  )
  VALUES (
    p_user_id,
    -1,
    'usage',
    new_credit_balance,
    'Created listing',
    jsonb_build_object('listing_id', created_listing.id, 'action', 'create_listing')
  );

  INSERT INTO public.usage_logs (user_id, action, credits_used, metadata)
  VALUES (
    p_user_id,
    'create_listing',
    1,
    jsonb_build_object('listing_id', created_listing.id)
  );

  RETURN jsonb_build_object(
    'action', 'created',
    'listing', to_jsonb(created_listing),
    'credits_remaining', new_credit_balance
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_auto_order_with_usage(
  p_user_id uuid,
  p_order jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_rec public.profiles%rowtype;
  user_plan_rec public.user_plans%rowtype;
  plan_rec record;
  effective_order_limit integer := 0;
  orders_used_now integer := 0;
  existing_order public.auto_orders%rowtype;
  created_order public.auto_orders%rowtype;
  order_key text := COALESCE(NULLIF(p_order ->> 'ebay_order_id', ''), NULLIF(p_order ->> 'order_id', ''));
  active_plan_id uuid;
BEGIN
  IF order_key IS NULL THEN
    RAISE EXCEPTION 'Missing ebay_order_id or order_id';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('create-auto-order:' || p_user_id::text, 0));

  SELECT * INTO profile_rec
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  SELECT * INTO user_plan_rec
  FROM public.user_plans
  WHERE user_id = p_user_id
  FOR UPDATE;

  SELECT p.* INTO plan_rec
  FROM public.plans p
  WHERE p.is_active = true
    AND (
      p.id = user_plan_rec.plan_id
      OR p.id::text = profile_rec.plan_id
      OR p.name = profile_rec.plan_id
    )
  ORDER BY CASE WHEN p.id = user_plan_rec.plan_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active plan found for user';
  END IF;

  active_plan_id := plan_rec.id;

  SELECT * INTO existing_order
  FROM public.auto_orders
  WHERE user_id = p_user_id
    AND ebay_order_id = order_key
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'action', 'existing',
      'order', to_jsonb(existing_order),
      'orders_remaining', GREATEST(0, COALESCE(plan_rec.max_auto_orders, 0) - COALESCE(user_plan_rec.orders_used, 0))
    );
  END IF;

  IF user_plan_rec.is_blocked THEN
    RAISE EXCEPTION '%', COALESCE(user_plan_rec.blocked_reason, 'Account is blocked');
  END IF;

  IF user_plan_rec.status = 'canceled'
    OR (user_plan_rec.current_period_end IS NOT NULL AND user_plan_rec.current_period_end < now())
    OR (COALESCE(plan_rec.is_trial, false) AND user_plan_rec.trial_end IS NOT NULL AND user_plan_rec.trial_end < now())
  THEN
    RAISE EXCEPTION 'Subscription expired. Please renew your plan.';
  END IF;

  IF COALESCE(plan_rec.auto_orders_enabled, false) = false THEN
    RAISE EXCEPTION 'Auto orders are not available on your current plan';
  END IF;

  effective_order_limit := COALESCE(
    NULLIF(user_plan_rec.admin_override_limits ->> 'max_auto_orders', '')::integer,
    plan_rec.max_auto_orders,
    0
  );
  orders_used_now := COALESCE(user_plan_rec.orders_used, 0);

  IF effective_order_limit = 0 OR orders_used_now + 1 > effective_order_limit THEN
    RAISE EXCEPTION 'Order limit reached for this billing period';
  END IF;

  INSERT INTO public.auto_orders (
    user_id,
    listing_id,
    order_id,
    ebay_order_id,
    ebay_sku,
    buyer_name,
    buyer_address,
    item_price,
    total_cost,
    profit,
    details,
    status,
    order_data
  )
  VALUES (
    p_user_id,
    NULLIF(p_order ->> 'listing_id', '')::uuid,
    order_key,
    order_key,
    NULLIF(COALESCE(p_order ->> 'ebay_sku', p_order ->> 'sku'), ''),
    NULLIF(p_order ->> 'buyer_name', ''),
    COALESCE(p_order -> 'buyer_address', p_order -> 'shipping_address', '{}'::jsonb),
    NULLIF(p_order ->> 'item_price', '')::numeric,
    NULLIF(p_order ->> 'total_cost', '')::numeric,
    NULLIF(p_order ->> 'profit', '')::numeric,
    COALESCE(p_order -> 'details', '{}'::jsonb),
    COALESCE(NULLIF(p_order ->> 'status', ''), 'pending'),
    p_order
  )
  RETURNING * INTO created_order;

  IF user_plan_rec.id IS NULL THEN
    INSERT INTO public.user_plans (user_id, plan_id, orders_used, status)
    VALUES (p_user_id, active_plan_id, 1, 'active');
    orders_used_now := 1;
  ELSE
    UPDATE public.user_plans
    SET orders_used = COALESCE(orders_used, 0) + 1,
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING orders_used INTO orders_used_now;
  END IF;

  INSERT INTO public.order_transactions (
    user_id,
    order_id,
    transaction_type,
    orders_used_after,
    description,
    metadata
  )
  VALUES (
    p_user_id,
    created_order.id,
    'order_placed',
    orders_used_now,
    'Auto order placed',
    jsonb_build_object('ebay_order_id', order_key, 'limit', effective_order_limit)
  );

  INSERT INTO public.usage_logs (user_id, action, credits_used, metadata)
  VALUES (
    p_user_id,
    'create_auto_order',
    0,
    jsonb_build_object('order_id', created_order.id, 'ebay_order_id', order_key)
  );

  RETURN jsonb_build_object(
    'action', 'created',
    'order', to_jsonb(created_order),
    'orders_remaining', GREATEST(0, effective_order_limit - orders_used_now)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_listing_with_usage(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_auto_order_with_usage(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_listing_with_usage(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_auto_order_with_usage(uuid, jsonb) TO service_role;

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
  SELECT
    COALESCE(SUM(COALESCE(o.total_amount, 0)), 0)::numeric AS total_revenue,
    COUNT(*)::bigint AS distinct_rows
  FROM public.ebay_orders o
  WHERE o.user_id = p_user_id
    AND o.deleted_at IS NULL
    AND (
      p_status IS NULL
      OR p_status = 'all'
      OR (
        lower(p_status) = 'cancelled'
        AND (lower(COALESCE(o.order_status, '')) = 'cancelled' OR COALESCE(o.total_amount, 0) = 0)
      )
      OR (
        lower(p_status) <> 'cancelled'
        AND lower(COALESCE(o.order_status, '')) = lower(p_status)
        AND COALESCE(o.total_amount, 0) <> 0
      )
    )
    AND (
      p_status <> 'all'
      OR (lower(COALESCE(o.order_status, '')) <> 'cancelled' AND COALESCE(o.total_amount, 0) <> 0)
    )
    AND (
      p_search IS NULL
      OR o.ebay_order_id ILIKE '%' || p_search || '%'
      OR o.buyer_name ILIKE '%' || p_search || '%'
      OR o.buyer_email ILIKE '%' || p_search || '%'
    )
    AND (p_date_from IS NULL OR o.order_date >= p_date_from)
    AND (p_date_to IS NULL OR o.order_date <= p_date_to);
$$;

REVOKE EXECUTE ON FUNCTION public.get_ebay_order_summary(uuid, text, text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ebay_order_summary(uuid, text, text, timestamptz, timestamptz) TO service_role;

-- Harden default function exposure and remove implicit public/anon execute on existing SECURITY DEFINER functions.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', fn.nspname, fn.proname, fn.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', fn.nspname, fn.proname, fn.args);
  END LOOP;
END $$;

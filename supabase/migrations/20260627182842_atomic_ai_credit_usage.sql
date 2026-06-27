-- Atomic credit deduction for AI usage.
-- Locks the profile row, inserts one ledger transaction, and relies on
-- trg_sync_profile_credits to keep profiles.credits consistent.

CREATE OR REPLACE FUNCTION public.deduct_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text DEFAULT 'AI credit usage',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits integer;
  v_new_credits integer;
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required.' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive.' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(credits, 0)
  INTO v_current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_credits IS NULL THEN
    RAISE EXCEPTION 'User profile not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_current_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits.' USING ERRCODE = 'P0001';
  END IF;

  v_new_credits := v_current_credits - p_amount;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    balance_after,
    description,
    metadata
  ) VALUES (
    p_user_id,
    -p_amount,
    'usage',
    v_new_credits,
    COALESCE(NULLIF(trim(p_description), ''), 'AI credit usage'),
    v_metadata || jsonb_build_object(
      'deduction_source', 'deduct_user_credits',
      'credits_before', v_current_credits,
      'credits_after', v_new_credits
    )
  );

  UPDATE public.user_plans
  SET credits_used = COALESCE(credits_used, 0) + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.usage_logs (
    user_id,
    action,
    credits_used,
    metadata
  ) VALUES (
    p_user_id,
    'credit',
    p_amount,
    v_metadata || jsonb_build_object(
      'amount', p_amount,
      'description', COALESCE(NULLIF(trim(p_description), ''), 'AI credit usage'),
      'timestamp', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_credits', v_current_credits,
    'new_credits', v_new_credits,
    'credits_deducted', p_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_user_credits(uuid, integer, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_user_credits(uuid, integer, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.deduct_user_credits(uuid, integer, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_credits(uuid, integer, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_user_plan_usage(
  p_user_id uuid,
  p_action text,
  p_amount integer DEFAULT 1,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required.' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Usage amount must be positive.' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'order' THEN
    UPDATE public.user_plans
    SET orders_used = COALESCE(orders_used, 0) + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_action = 'seo_title' THEN
    UPDATE public.user_plans
    SET seo_titles_used = COALESCE(seo_titles_used, 0) + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_action = 'seo_description' THEN
    UPDATE public.user_plans
    SET seo_descriptions_used = COALESCE(seo_descriptions_used, 0) + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Unsupported usage action: %', p_action USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.usage_logs (
    user_id,
    action,
    credits_used,
    metadata
  ) VALUES (
    p_user_id,
    p_action,
    0,
    v_metadata || jsonb_build_object(
      'action_type', p_action,
      'amount', p_amount,
      'timestamp', now()
    )
  );

  RETURN jsonb_build_object('success', true, 'action', p_action, 'amount', p_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_plan_usage(uuid, text, integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_user_plan_usage(uuid, text, integer, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.increment_user_plan_usage(uuid, text, integer, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_plan_usage(uuid, text, integer, jsonb) TO service_role;

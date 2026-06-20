-- Atomic AI credit deduction.
--
-- plan-middleware.deductUsage('credit') previously did a non-atomic read-then-write
-- on profiles.credits (SELECT credits → UPDATE credits = max(0, credits-amount)),
-- and validateUserPlan → deductUsage span two round-trips. Concurrent AI requests
-- could both pass the balance check and overspend (or the floor-at-0 silently
-- masked a double-spend). This mirrors the atomic credit block already used by
-- create_listing_with_variations: lock the profile row FOR UPDATE, check, deduct,
-- bump user_plans.credits_used, and log — all in one transaction.

CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(
  p_user_id  uuid,
  p_amount   int,
  p_reason   text  DEFAULT 'AI credit usage',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credits int;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid credit amount: %', p_amount USING ERRCODE = '22023';
  END IF;

  -- Lock the profile row so concurrent deducts serialize on the balance.
  SELECT COALESCE(credits, 0) INTO v_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_credits < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits. You have %, need %.', v_credits, p_amount
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.profiles
  SET credits = v_credits - p_amount,
      updated_at = now()
  WHERE id = p_user_id;

  -- Keep the per-period counter in lockstep (no-op if no user_plans row).
  UPDATE public.user_plans
  SET credits_used = COALESCE(credits_used, 0) + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (
    user_id, amount, transaction_type, balance_after, description, metadata
  ) VALUES (
    p_user_id, -p_amount, 'usage', v_credits - p_amount, p_reason,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN v_credits - p_amount;
END $$;

-- Lock down: only the service role (used by edge functions) may execute it.
REVOKE ALL ON FUNCTION public.deduct_credits_atomic(uuid, int, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_credits_atomic(uuid, int, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic(uuid, int, text, jsonb) TO service_role;

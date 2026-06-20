-- SS-A2-002: Atomic AI-credit deduction.
--
-- The old path in _shared/plan-middleware.ts deductUsage('credit') did a
-- non-atomic read-modify-write (SELECT credits -> compute -> UPDATE), so two
-- concurrent AI-credit requests both read N and both wrote N-1 -> double-spend.
--
-- This guarded decrement is atomic: the UPDATE only succeeds when the row still
-- has enough credits, and the conditional WHERE makes concurrent callers
-- serialize on the row. It also writes the credit_transactions ledger row and
-- bumps user_plans.credits_used, mirroring the previous behaviour in one txn.
--
-- service_role only (edge functions call it); never anon/authenticated, matching
-- the create_listing_with_variations / *_admin RPC lockdown pattern.

CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(
  p_user_id  uuid,
  p_amount   integer,
  p_reason   text DEFAULT 'AI credit usage',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be a positive integer' USING ERRCODE = '22023';
  END IF;

  -- Atomic guarded decrement: only succeeds if the balance still covers it.
  UPDATE public.profiles
     SET credits = credits - p_amount
   WHERE id = p_user_id
     AND COALESCE(credits, 0) >= p_amount
  RETURNING credits INTO v_new_balance;

  IF NOT FOUND THEN
    -- Either the user does not exist or has insufficient credits.
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_or_missing');
  END IF;

  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, transaction_type, description, metadata
  ) VALUES (
    p_user_id, -p_amount, v_new_balance, 'usage', p_reason, COALESCE(p_metadata, '{}'::jsonb)
  );

  -- Best-effort usage counter on user_plans (row may not exist).
  UPDATE public.user_plans
     SET credits_used = COALESCE(credits_used, 0) + p_amount,
         updated_at   = now()
   WHERE user_id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'balance_after', v_new_balance);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deduct_credits_atomic(uuid, integer, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.deduct_credits_atomic(uuid, integer, text, jsonb) TO service_role;

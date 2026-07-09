-- Atomic credit refund for AI usage (companion to deduct_user_credits).
-- Supports the "reserve-then-charge" pattern (BILLING-P1-002): edge functions
-- reserve a credit BEFORE the paid LLM call and refund it here if generation
-- fails, so a failure never permanently burns a user's credit.
--
-- Locks the profile row, inserts one positive 'refund' ledger transaction, and
-- relies on trg_sync_profile_credits to recompute profiles.credits. Mirrors
-- deduct_user_credits and is likewise service-role only.

CREATE OR REPLACE FUNCTION public.refund_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text DEFAULT 'AI credit refund',
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
    RAISE EXCEPTION 'Refund amount must be positive.' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(credits, 0)
  INTO v_current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_credits IS NULL THEN
    RAISE EXCEPTION 'User profile not found.' USING ERRCODE = 'P0002';
  END IF;

  v_new_credits := v_current_credits + p_amount;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    balance_after,
    description,
    metadata
  ) VALUES (
    p_user_id,
    p_amount,
    'refund',
    v_new_credits,
    COALESCE(NULLIF(trim(p_description), ''), 'AI credit refund'),
    v_metadata || jsonb_build_object(
      'refund_source', 'refund_user_credits',
      'credits_before', v_current_credits,
      'credits_after', v_new_credits
    )
  );

  -- Symmetric with deduct_user_credits, which increments credits_used.
  UPDATE public.user_plans
  SET credits_used = GREATEST(COALESCE(credits_used, 0) - p_amount, 0),
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'previous_credits', v_current_credits,
    'new_credits', v_new_credits,
    'credits_refunded', p_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refund_user_credits(uuid, integer, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_user_credits(uuid, integer, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.refund_user_credits(uuid, integer, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refund_user_credits(uuid, integer, text, jsonb) TO service_role;

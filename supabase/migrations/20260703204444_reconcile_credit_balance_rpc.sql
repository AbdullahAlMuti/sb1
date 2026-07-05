-- Make set_user_credit_balance self-healing for idempotent plan/trial grants.
--
-- The UI and listing gates read public.profiles.credits as the remaining
-- balance, while credit_transactions is the audit ledger. The older function
-- relied entirely on trg_sync_profile_credits to copy the ledger total back to
-- profiles.credits. If a grant was already recorded but the profile row stayed
-- stale, replaying the same idempotent grant returned early and left the user
-- showing 0 credits. Keep the ledger authoritative, but reconcile the profile
-- row every time this RPC runs.

CREATE OR REPLACE FUNCTION public.set_user_credit_balance(
  p_user_id uuid,
  p_target_balance integer,
  p_transaction_type text DEFAULT 'manual_adjustment',
  p_description text DEFAULT 'Credit balance updated',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_credits integer;
  v_ledger_credits integer;
  v_delta integer;
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
  v_grant_key text := NULLIF(v_metadata->>'grant_key', '');
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required.' USING ERRCODE = '22023';
  END IF;

  IF p_target_balance IS NULL OR p_target_balance < 0 THEN
    RAISE EXCEPTION 'Target credit balance must be zero or greater.' USING ERRCODE = '22023';
  END IF;

  IF p_transaction_type NOT IN (
    'plan_grant',
    'usage',
    'manual_adjustment',
    'promo',
    'refund',
    'period_reset',
    'grant',
    'revoke',
    'correction',
    'goodwill'
  ) THEN
    RAISE EXCEPTION 'Unsupported credit transaction type: %', p_transaction_type USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(credits, 0)
  INTO v_profile_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_profile_credits IS NULL THEN
    RAISE EXCEPTION 'User profile not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_ledger_credits
  FROM public.credit_transactions
  WHERE user_id = p_user_id;

  IF v_grant_key IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.credit_transactions
    WHERE user_id = p_user_id
      AND metadata->>'grant_key' = v_grant_key
  ) THEN
    -- Duplicate webhook/reconcile run: do not reset spent credits back to the
    -- original plan amount. Heal the profile from the ledger total instead.
    PERFORM set_config('app.ledger_sync', 'true', true);
    UPDATE public.profiles
    SET credits = COALESCE(v_ledger_credits, 0),
        updated_at = now()
    WHERE id = p_user_id;
    PERFORM set_config('app.ledger_sync', 'false', true);

    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'previous_credits', v_profile_credits,
      'new_credits', COALESCE(v_ledger_credits, 0),
      'delta', 0,
      'reconciled_profile', true
    );
  END IF;

  v_delta := p_target_balance - COALESCE(v_ledger_credits, 0);

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    balance_after,
    description,
    metadata
  ) VALUES (
    p_user_id,
    v_delta,
    p_transaction_type,
    p_target_balance,
    COALESCE(NULLIF(trim(p_description), ''), 'Credit balance updated'),
    v_metadata || jsonb_build_object(
      'credit_source', 'set_user_credit_balance',
      'credits_before_profile', v_profile_credits,
      'credits_before_ledger', COALESCE(v_ledger_credits, 0),
      'credits_after', p_target_balance
    )
  );

  -- The credit_transactions trigger should sync this too, but this explicit
  -- update makes the RPC safe even when repairing an environment with a stale
  -- or previously missing trigger.
  PERFORM set_config('app.ledger_sync', 'true', true);
  UPDATE public.profiles
  SET credits = p_target_balance,
      updated_at = now()
  WHERE id = p_user_id;
  PERFORM set_config('app.ledger_sync', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'previous_credits', v_profile_credits,
    'ledger_credits_before', COALESCE(v_ledger_credits, 0),
    'new_credits', p_target_balance,
    'delta', v_delta,
    'reconciled_profile', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_credit_balance(uuid, integer, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_credit_balance(uuid, integer, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.set_user_credit_balance(uuid, integer, text, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_credit_balance(uuid, integer, text, text, jsonb) TO service_role;

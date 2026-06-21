-- Migration: deduct_usage_atomic
-- Fixes non-atomic read-then-write race in deductUsage('order' | 'seo_title' | 'seo_description').
-- Two concurrent requests can both read the same counter value, both compute counter+1,
-- and both write it — resulting in one usage unit consumed but two actions served.
-- This function mirrors the pattern of deduct_credits_atomic (20260620120000).
--
-- REQUIRES MUTI APPROVAL BEFORE APPLY (schema change).

CREATE OR REPLACE FUNCTION public.deduct_usage_atomic(
  p_user_id   uuid,
  p_column    text,
  p_amount    integer DEFAULT 1,
  p_max       integer DEFAULT NULL  -- NULL = no cap enforced
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
  v_col     text;
BEGIN
  -- Allowlist: only permit the three non-credit usage columns.
  -- This prevents the column parameter from being used as a SQL injection vector.
  IF p_column NOT IN ('orders_used', 'seo_titles_used', 'seo_descriptions_used') THEN
    RAISE EXCEPTION 'deduct_usage_atomic: unknown column "%"', p_column
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_col := p_column;

  -- Lock the row with FOR UPDATE so concurrent calls serialize.
  EXECUTE format(
    'SELECT %I FROM user_plans WHERE user_id = $1 FOR UPDATE',
    v_col
  ) INTO v_current USING p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deduct_usage_atomic: no user_plans row for user %', p_user_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Enforce cap if provided.
  IF p_max IS NOT NULL AND (v_current + p_amount) > p_max THEN
    RAISE EXCEPTION 'deduct_usage_atomic: usage limit reached (current=%, max=%)', v_current, p_max
      USING ERRCODE = 'check_violation';
  END IF;

  -- Increment atomically.
  EXECUTE format(
    'UPDATE user_plans SET %I = %I + $1 WHERE user_id = $2',
    v_col, v_col
  ) USING p_amount, p_user_id;
END;
$$;

-- Grant execute to service_role only (edge functions use service_role client).
REVOKE ALL ON FUNCTION public.deduct_usage_atomic(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_usage_atomic(uuid, text, integer, integer) TO service_role;

COMMENT ON FUNCTION public.deduct_usage_atomic IS
  'Atomically increments a usage counter in user_plans with a FOR UPDATE row lock. '
  'Replaces non-atomic read-then-write in plan-middleware.ts deductUsage(). '
  'Column must be one of: orders_used, seo_titles_used, seo_descriptions_used.';

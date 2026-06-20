-- Test: public.deduct_credits_atomic — logic + invariants + atomicity contract.
--
-- Run against a BRANCH/STAGING database (NOT prod) with postgres/service_role
-- privileges. The whole script runs in one transaction and ROLLBACKs at the end,
-- so it leaves no data behind:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/deduct_credits_atomic_test.sql
--
-- Requires migration 20260620120000_deduct_credits_atomic.sql to be applied first.
-- On any failed ASSERT, psql exits non-zero. On success it prints "ALL ASSERTIONS PASSED".

BEGIN;

DO $$
DECLARE
  v_uid  uuid := '00000000-0000-4000-8000-0000000c0de1';
  v_after int;
  v_used  int;
  v_txn   int;
  v_raised boolean;
BEGIN
  -- Fixture. Inserting into auth.users fires handle_new_user() which creates the
  -- profiles + user_roles rows; the ON CONFLICT updates normalize known state.
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
          'credtest@example.com', '', now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, email, credits, is_active)
  VALUES (v_uid, 'credtest@example.com', 10, true)
  ON CONFLICT (id) DO UPDATE SET credits = 10;

  INSERT INTO public.user_plans (user_id, credits_used)
  VALUES (v_uid, 0)
  ON CONFLICT (user_id) DO UPDATE SET credits_used = 0;

  -- 1. Happy path: deduct 3 of 10 -> returns 7
  SELECT public.deduct_credits_atomic(v_uid, 3, 'test deduct', '{"t":1}'::jsonb) INTO v_after;
  ASSERT v_after = 7, format('return value: expected 7, got %s', v_after);

  SELECT credits INTO v_after FROM public.profiles WHERE id = v_uid;
  ASSERT v_after = 7, format('profiles.credits: expected 7, got %s', v_after);

  SELECT credits_used INTO v_used FROM public.user_plans WHERE user_id = v_uid;
  ASSERT v_used = 3, format('user_plans.credits_used: expected 3, got %s', v_used);

  SELECT count(*) INTO v_txn FROM public.credit_transactions
   WHERE user_id = v_uid AND transaction_type = 'usage' AND amount = -3;
  ASSERT v_txn = 1, format('credit_transactions usage rows: expected 1, got %s', v_txn);

  -- 2. Over-spend: deduct 8 of remaining 7 must RAISE and leave the balance untouched
  v_raised := false;
  BEGIN
    PERFORM public.deduct_credits_atomic(v_uid, 8, 'overspend', '{}'::jsonb);
  EXCEPTION WHEN others THEN
    v_raised := (SQLERRM ILIKE '%Insufficient credits%');
  END;
  ASSERT v_raised, 'over-spend did not raise "Insufficient credits"';

  SELECT credits INTO v_after FROM public.profiles WHERE id = v_uid;
  ASSERT v_after = 7, format('balance changed after a failed over-spend: %s', v_after);

  -- 3. Invalid amount (0) must RAISE
  v_raised := false;
  BEGIN
    PERFORM public.deduct_credits_atomic(v_uid, 0, 'zero', '{}'::jsonb);
  EXCEPTION WHEN others THEN
    v_raised := true;
  END;
  ASSERT v_raised, 'zero amount did not raise';

  RAISE NOTICE 'deduct_credits_atomic: ALL ASSERTIONS PASSED';
END $$;

ROLLBACK;

-- ─────────────────────────────────────────────────────────────────────────────
-- CONCURRENCY (manual two-session check — cannot be expressed in one session).
-- Serialization is guaranteed by `SELECT ... FOR UPDATE` on the profiles row.
--
--   -- seed: a user with exactly 1 credit
--   Session A:  BEGIN;
--               SELECT public.deduct_credits_atomic('<uid>', 1, 'A', '{}');  -- holds the row lock
--   Session B:  SELECT public.deduct_credits_atomic('<uid>', 1, 'B', '{}');  -- BLOCKS on FOR UPDATE
--   Session A:  COMMIT;                                                       -- B unblocks…
--               -- B now sees balance 0 and RAISES "Insufficient credits".
--   => exactly ONE of two concurrent deducts succeeds; credits never go negative.
--
-- Load-test variant: seed K credits, then
--   pgbench -n -c 20 -t 50 -f deduct_one.sql "$DATABASE_URL"
-- final profiles.credits must equal max(0, K - successful_calls) and never be < 0.

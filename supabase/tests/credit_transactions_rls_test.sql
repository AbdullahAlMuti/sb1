-- pgTAP regression test for BILLING-P0-001 / DB-P0-001 (credit self-mint).
--
-- Run with: supabase test db
--
-- Guards against re-introduction of any client-writable INSERT policy on
-- public.credit_transactions. Credits are the paid currency, so a user-
-- reachable INSERT here is a payment bypass (see the accompanying migration
-- 20260709000000_drop_credit_transactions_user_insert_policy.sql).

BEGIN;
SELECT plan(6);

-- 1. RLS must be enabled on the ledger table.
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.credit_transactions'::regclass),
  'RLS is enabled on public.credit_transactions'
);

-- 2. The vulnerable client INSERT policy must be gone.
SELECT is(
  (SELECT count(*)::int FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'credit_transactions'
       AND policyname = 'Users can insert their own credit transactions'),
  0,
  'client-writable "Users can insert their own credit transactions" policy is removed'
);

-- 3. The service-role INSERT policy must still exist (legit server writes).
SELECT is(
  (SELECT count(*)::int FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'credit_transactions'
       AND cmd = 'INSERT'
       AND policyname = 'Service role can insert credit transactions'),
  1,
  'service-role INSERT policy is retained'
);

-- 4. Exactly ONE INSERT policy may exist (service-role only). Fails loudly if
--    any future migration re-adds a client-facing INSERT policy.
SELECT is(
  (SELECT count(*)::int FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'credit_transactions'
       AND cmd = 'INSERT'),
  1,
  'exactly one INSERT policy remains on credit_transactions (service-role only)'
);

-- 5. Users can still READ their own ledger (UI history must keep working).
SELECT ok(
  (SELECT count(*) > 0 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'credit_transactions'
       AND cmd = 'SELECT'),
  'SELECT policy retained so users can read their own credit history'
);

-- 6. Behavioral proof: an authenticated (non-service) user CANNOT insert.
--    A row-level-security violation raises SQLSTATE 42501 (insufficient_privilege).
CREATE OR REPLACE FUNCTION pg_temp.try_authenticated_credit_insert()
RETURNS text
LANGUAGE plpgsql
AS $fn$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', '11111111-1111-1111-1111-111111111111',
      'role', 'authenticated'
    )::text,
    true
  );

  BEGIN
    INSERT INTO public.credit_transactions
      (user_id, amount, transaction_type, balance_after, description)
    VALUES
      ('11111111-1111-1111-1111-111111111111', 999999, 'grant', 999999,
       'pgTAP regression: this insert MUST be blocked');
    RESET ROLE;
    RETURN 'INSERT_ALLOWED';          -- would mean the P0 is reintroduced
  EXCEPTION
    WHEN insufficient_privilege THEN  -- 42501: RLS blocked the write
      RESET ROLE;
      RETURN 'BLOCKED_RLS';
    WHEN OTHERS THEN
      RESET ROLE;
      RETURN 'BLOCKED_OTHER:' || SQLSTATE;
  END;
END;
$fn$;

SELECT is(
  pg_temp.try_authenticated_credit_insert(),
  'BLOCKED_RLS',
  'an authenticated user cannot self-mint credits via credit_transactions INSERT'
);

SELECT * FROM finish();
ROLLBACK;

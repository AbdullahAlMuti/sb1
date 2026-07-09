-- pgTAP: RLS + multi-tenant isolation regression (QA-P1).
-- Run with: supabase test db
--
-- Guards that every table holding per-user data keeps RLS enabled AND retains an
-- owner-scoped policy (auth.uid()-based). This fails loudly if a future migration
-- disables RLS or drops the ownership predicate — the class of change that turns
-- into a cross-user data-leak (see DB-P0-001 for the credit-ledger variant).

BEGIN;
SELECT plan(11);

-- listings
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.listings'::regclass),
  'RLS enabled: listings'
);
SELECT ok(
  (SELECT count(*) > 0 FROM pg_policies
     WHERE schemaname='public' AND tablename='listings' AND qual ILIKE '%auth.uid()%'),
  'listings has an auth.uid()-scoped policy'
);

-- ebay_orders
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.ebay_orders'::regclass),
  'RLS enabled: ebay_orders'
);
SELECT ok(
  (SELECT count(*) > 0 FROM pg_policies
     WHERE schemaname='public' AND tablename='ebay_orders' AND qual ILIKE '%auth.uid()%'),
  'ebay_orders has an auth.uid()-scoped policy'
);

-- credit_transactions (owner-scoped SELECT; writes are service-role only)
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.credit_transactions'::regclass),
  'RLS enabled: credit_transactions'
);
SELECT ok(
  (SELECT count(*) > 0 FROM pg_policies
     WHERE schemaname='public' AND tablename='credit_transactions'
       AND cmd='SELECT' AND qual ILIKE '%auth.uid()%'),
  'credit_transactions has an auth.uid()-scoped SELECT policy'
);

-- profiles (auth.uid() = id)
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass),
  'RLS enabled: profiles'
);
SELECT ok(
  (SELECT count(*) > 0 FROM pg_policies
     WHERE schemaname='public' AND tablename='profiles' AND qual ILIKE '%auth.uid()%'),
  'profiles has an auth.uid()-scoped policy'
);

-- order_transactions
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.order_transactions'::regclass),
  'RLS enabled: order_transactions'
);
SELECT ok(
  (SELECT count(*) > 0 FROM pg_policies
     WHERE schemaname='public' AND tablename='order_transactions' AND qual ILIKE '%auth.uid()%'),
  'order_transactions has an auth.uid()-scoped policy'
);

-- user_roles: RLS must stay enabled (role rows must never be world-readable/writable).
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.user_roles'::regclass),
  'RLS enabled: user_roles'
);

SELECT * FROM finish();
ROLLBACK;

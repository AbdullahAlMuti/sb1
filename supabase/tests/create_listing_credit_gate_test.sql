-- pgTAP: create_listing_with_variations keeps its credit + ownership gates.
-- Run with: supabase test db
--
-- 20260711100000_central_pricing_authority replaced this RPC to persist the
-- supplier/pricing columns. An earlier draft of that migration was written
-- against a pre-ledger body and would have silently dropped the credit
-- deduction and the forbidden check. This test fails if any future
-- CREATE OR REPLACE of the function loses either of them.

BEGIN;
SELECT plan(14);

-- Two throwaway users. handle_new_user() creates their profiles with 0 credits.
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'clwv-a@test.invalid', '{}', now(), now()),
  ('aaaaaaaa-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'clwv-b@test.invalid', '{}', now(), now());

-- Give user A 3 credits through the ledger (profiles.credits is ledger-synced).
SELECT public.set_user_credit_balance(
  'aaaaaaaa-0000-4000-8000-000000000001', 3, 'manual_adjustment', 'pgtap seed', '{}'::jsonb
);

SELECT is(
  (SELECT credits FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  3, 'seed: user A has 3 credits'
);

-- ── 1. Function shape: SECURITY DEFINER + pinned search_path ────────────────
SELECT ok(
  (SELECT prosecdef FROM pg_proc
     WHERE oid = 'public.create_listing_with_variations(uuid,jsonb,jsonb)'::regprocedure),
  'create_listing_with_variations is SECURITY DEFINER'
);
SELECT ok(
  (SELECT proconfig::text ILIKE '%search_path=public%' FROM pg_proc
     WHERE oid = 'public.create_listing_with_variations(uuid,jsonb,jsonb)'::regprocedure),
  'create_listing_with_variations pins search_path = public'
);

-- ── 2. New listing (server context, no JWT) deducts exactly one credit ──────
CREATE TEMP TABLE _r1 AS
SELECT public.create_listing_with_variations(
  'aaaaaaaa-0000-4000-8000-000000000001',
  jsonb_build_object(
    'title', 'pgtap widget', 'sku', 'PGTAP-SKU-1', 'ebay_price', 19.99,
    'supplier', 'walmart', 'supplier_product_id', 'WM-123',
    'supplier_url', 'https://www.walmart.com/ip/123', 'supplier_price', 10.50,
    'pricing_rule_version', 7, 'price_source', 'calculated'
  ),
  '[]'::jsonb
) AS r;

SELECT is((SELECT r->>'action' FROM _r1), 'created', 'first call creates the listing');
SELECT is(
  (SELECT credits FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  2, 'creating a listing deducts one credit (3 -> 2)'
);
SELECT is(
  (SELECT count(*)::int FROM public.credit_transactions
     WHERE user_id = 'aaaaaaaa-0000-4000-8000-000000000001'
       AND transaction_type = 'usage'
       AND metadata->>'action' = 'create_listing_with_variations'
       AND (metadata->>'credits_before')::int = 3
       AND (metadata->>'credits_after')::int = 2),
  1, 'one usage ledger row with credits_before=3 / credits_after=2'
);

-- New central-pricing columns are persisted
SELECT is(
  (SELECT supplier_price FROM public.listings WHERE id = ((SELECT r FROM _r1)->'listing'->>'id')::uuid),
  10.50::numeric(10,2), 'supplier_price persisted'
);
SELECT is(
  (SELECT pricing_rule_version FROM public.listings WHERE id = ((SELECT r FROM _r1)->'listing'->>'id')::uuid),
  7, 'pricing_rule_version persisted'
);

-- ── 3. Re-import via (supplier, supplier_product_id) updates, no charge ─────
CREATE TEMP TABLE _r2 AS
SELECT public.create_listing_with_variations(
  'aaaaaaaa-0000-4000-8000-000000000001',
  jsonb_build_object('title', 'pgtap widget v2', 'supplier', 'walmart', 'supplier_product_id', 'WM-123'),
  '[]'::jsonb
) AS r;

SELECT is((SELECT r->>'action' FROM _r2), 'updated', 'same supplier product id dedupes to an update');
SELECT is(
  (SELECT credits FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  2, 'update does not charge a credit'
);
SELECT is(
  (SELECT supplier_price FROM public.listings WHERE id = ((SELECT r FROM _r1)->'listing'->>'id')::uuid),
  10.50::numeric(10,2), 'update without supplier_price keeps the raw supplier price'
);

-- ── 4. Zero credits is rejected ─────────────────────────────────────────────
SELECT throws_ok(
  $$ SELECT public.create_listing_with_variations(
       'aaaaaaaa-0000-4000-8000-000000000002',
       '{"title":"no credits","sku":"PGTAP-SKU-B"}'::jsonb, '[]'::jsonb) $$,
  'P0001', 'INSUFFICIENT_CREDITS',
  'user with 0 credits cannot create a listing'
);

-- ── 5. Authenticated caller cannot act for another user ─────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000002', true);

SELECT throws_ok(
  $$ SELECT public.create_listing_with_variations(
       'aaaaaaaa-0000-4000-8000-000000000001',
       '{"title":"hijack","sku":"PGTAP-SKU-X"}'::jsonb, '[]'::jsonb) $$,
  '42501', 'forbidden',
  'a JWT for user B cannot create listings for user A'
);

SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);

SELECT is(
  (SELECT credits FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  2, 'rejected calls did not change user A credits'
);

SELECT * FROM finish();
ROLLBACK;

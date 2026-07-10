-- pgTAP: central pricing authority schema regression (PRICING-P0).
-- Run with: supabase test db
--
-- Guards the invariants introduced by 20260711100000_central_pricing_authority:
--   1. Raw supplier data and calculated selling price live in SEPARATE columns.
--   2. The pricing audit trail (breakdown, rule version, timestamps) exists.
--   3. user_pricing_settings keeps RLS + per-user uniqueness (one rule per
--      user per supplier — the settings-isolation contract).
--   4. The supplier-neutral idempotent-import index exists.
-- If a future migration drops any of these, imports silently lose auditability
-- or (worse) start mixing raw cost with selling price again.

BEGIN;
SELECT plan(16);

-- 1. Raw vs calculated price separation on listings
SELECT has_column('public', 'listings', 'supplier_price',      'listings.supplier_price (raw cost) exists');
SELECT has_column('public', 'listings', 'supplier_currency',   'listings.supplier_currency exists');
SELECT has_column('public', 'listings', 'ebay_price',          'listings.ebay_price (calculated selling price) exists');
SELECT has_column('public', 'listings', 'supplier',            'listings.supplier exists');
SELECT has_column('public', 'listings', 'supplier_product_id', 'listings.supplier_product_id exists');
SELECT has_column('public', 'listings', 'supplier_url',        'listings.supplier_url exists');

-- 2. Pricing audit trail
SELECT has_column('public', 'listings', 'pricing_breakdown',    'listings.pricing_breakdown exists');
SELECT has_column('public', 'listings', 'pricing_rule_version', 'listings.pricing_rule_version exists');
SELECT has_column('public', 'listings', 'price_calculated_at',  'listings.price_calculated_at exists');
SELECT has_column('public', 'listings', 'price_source',         'listings.price_source exists');

-- Variant-level separation + provenance
SELECT has_column('public', 'listing_variations', 'raw_supplier_price', 'listing_variations.raw_supplier_price exists');
SELECT has_column('public', 'listing_variations', 'final_price',        'listing_variations.final_price exists');
SELECT has_column('public', 'listing_variations', 'price_source',       'listing_variations.price_source exists');

-- 3. Settings isolation: RLS on + unique (user_id, supplier_key)
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.user_pricing_settings'::regclass),
  'RLS enabled: user_pricing_settings'
);
SELECT ok(
  (SELECT count(*) > 0 FROM pg_indexes
     WHERE schemaname='public' AND tablename='user_pricing_settings'
       AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%user_id%' AND indexdef ILIKE '%supplier_key%'),
  'user_pricing_settings unique per (user_id, supplier_key)'
);

-- 4. Idempotent supplier-neutral import lookup
SELECT ok(
  (SELECT count(*) > 0 FROM pg_indexes
     WHERE schemaname='public' AND tablename='listings' AND indexname='idx_listings_user_supplier_pid'),
  'idx_listings_user_supplier_pid exists for idempotent imports'
);

SELECT * FROM finish();
ROLLBACK;

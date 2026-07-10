-- central_pricing_authority — persist supplier-neutral raw product data and the
-- server-computed pricing audit trail, separately from the selling price.
--
-- Context: the selling price is now computed SERVER-SIDE in create-listing /
-- sync-listing from the authenticated user's user_pricing_settings row via
-- _shared/pricing-service.ts (single pricing engine: _shared/pricing-core.js).
-- These columns store the raw inputs and the auditable result of that
-- calculation. Raw supplier prices are NEVER overwritten by calculated values.
--
-- Safety: strictly additive (ADD COLUMN IF NOT EXISTS, new indexes, CREATE OR
-- REPLACE of one RPC). No column drops, no type changes, no destructive
-- backfill. Existing rows keep working unchanged.
--
-- Rollback: drop the added columns and indexes, and restore the previous
-- create_listing_with_variations body from migration
-- 20260608140000_create_listing_with_variations_rpc.sql:
--   ALTER TABLE public.listings
--     DROP COLUMN IF EXISTS supplier, DROP COLUMN IF EXISTS supplier_product_id,
--     DROP COLUMN IF EXISTS supplier_url, DROP COLUMN IF EXISTS supplier_price,
--     DROP COLUMN IF EXISTS supplier_currency, DROP COLUMN IF EXISTS supplier_shipping_cost,
--     DROP COLUMN IF EXISTS pricing_breakdown, DROP COLUMN IF EXISTS pricing_rule_version,
--     DROP COLUMN IF EXISTS price_calculated_at, DROP COLUMN IF EXISTS pricing_drift_cents,
--     DROP COLUMN IF EXISTS price_source, DROP COLUMN IF EXISTS title_source,
--     DROP COLUMN IF EXISTS description_source, DROP COLUMN IF EXISTS sku_source;
--   ALTER TABLE public.listing_variations
--     DROP COLUMN IF EXISTS price_source, DROP COLUMN IF EXISTS pricing_rule_version;
--   DROP INDEX IF EXISTS idx_listings_user_supplier_pid;

-- ── listings: supplier-neutral raw data ──────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS supplier               text,
  ADD COLUMN IF NOT EXISTS supplier_product_id    text,
  ADD COLUMN IF NOT EXISTS supplier_url           text,
  ADD COLUMN IF NOT EXISTS supplier_price         numeric(10,2),
  ADD COLUMN IF NOT EXISTS supplier_currency      text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS supplier_shipping_cost numeric(10,2);

-- ── listings: auditable pricing result ───────────────────────────────────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS pricing_breakdown    jsonb,
  ADD COLUMN IF NOT EXISTS pricing_rule_version integer,
  ADD COLUMN IF NOT EXISTS price_calculated_at  timestamptz,
  ADD COLUMN IF NOT EXISTS pricing_drift_cents  integer;

-- ── listings: provenance flags (Phase 7 create-listing already SENDS these; the
--    columns never existed, so the RPC silently dropped them until now) ────────
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS price_source       text,
  ADD COLUMN IF NOT EXISTS title_source       text,
  ADD COLUMN IF NOT EXISTS description_source text,
  ADD COLUMN IF NOT EXISTS sku_source         text;

-- ── listing_variations: per-variant provenance + rule version ────────────────
ALTER TABLE public.listing_variations
  ADD COLUMN IF NOT EXISTS price_source         text,
  ADD COLUMN IF NOT EXISTS pricing_rule_version integer;

-- ── Backfill (idempotent, non-destructive): existing rows are Amazon-era ─────
UPDATE public.listings
SET supplier = 'amazon'
WHERE supplier IS NULL
  AND (amazon_asin IS NOT NULL OR amazon_url IS NOT NULL);

UPDATE public.listings
SET supplier_product_id = amazon_asin
WHERE supplier_product_id IS NULL AND amazon_asin IS NOT NULL;

UPDATE public.listings
SET supplier_url = amazon_url
WHERE supplier_url IS NULL AND amazon_url IS NOT NULL;

-- amazon_price has always held the raw supplier cost; mirror it into the
-- supplier-neutral column. amazon_price itself is retained for compatibility.
UPDATE public.listings
SET supplier_price = amazon_price
WHERE supplier_price IS NULL AND amazon_price IS NOT NULL;

-- ── Idempotent import lookup for non-Amazon suppliers ────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_user_supplier_pid
  ON public.listings (user_id, supplier, supplier_product_id)
  WHERE supplier_product_id IS NOT NULL;

-- ── RPC: persist the new fields + supplier-neutral idempotent upsert ─────────
-- Replaces the 20260608150000 version. Changes (strict superset — the ON
-- CONFLICT clause, return shape, and all existing column writes are preserved
-- verbatim):
--   * dedupe key extended: (user_id, amazon_asin) first (unchanged), then
--     (user_id, supplier, supplier_product_id) for non-Amazon suppliers
--   * new supplier/pricing columns written on insert and update
--   * raw supplier fields are only ever COALESCE'd — a later write without
--     supplier data can never null them out
CREATE OR REPLACE FUNCTION public.create_listing_with_variations(
  p_user_id   uuid,
  p_listing   jsonb,
  p_variations jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing    public.listings;
  v_count      int := COALESCE(jsonb_array_length(p_variations), 0);
  v_existing   uuid;
BEGIN
  -- Idempotent parent lookup: ASIN key (legacy) then supplier-neutral key
  SELECT id INTO v_existing
  FROM public.listings
  WHERE user_id = p_user_id
    AND amazon_asin = p_listing->>'amazon_asin'
    AND (p_listing->>'amazon_asin') IS NOT NULL
  LIMIT 1;

  IF v_existing IS NULL
     AND (p_listing->>'supplier') IS NOT NULL
     AND (p_listing->>'supplier_product_id') IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.listings
    WHERE user_id = p_user_id
      AND supplier = p_listing->>'supplier'
      AND supplier_product_id = p_listing->>'supplier_product_id'
    LIMIT 1;
  END IF;

  IF v_existing IS NOT NULL THEN
    UPDATE public.listings SET
      title          = COALESCE(p_listing->>'title', title),
      sku            = COALESCE(p_listing->>'sku', sku),
      ebay_price     = COALESCE((p_listing->>'ebay_price')::numeric, ebay_price),
      amazon_price   = COALESCE((p_listing->>'amazon_price')::numeric, amazon_price),
      amazon_url     = COALESCE(p_listing->>'amazon_url', amazon_url),
      has_variations = (v_count > 1),
      variation_count = GREATEST(v_count, variation_count),
      price_low      = COALESCE((p_listing->>'price_low')::numeric, price_low),
      price_high     = COALESCE((p_listing->>'price_high')::numeric, price_high),
      amazon_data    = COALESCE(p_listing->'amazon_data', amazon_data),
      ebay_data      = COALESCE(p_listing->'ebay_data', ebay_data),
      -- Supplier-neutral raw data (never nulled by later writes)
      supplier               = COALESCE(p_listing->>'supplier', supplier),
      supplier_product_id    = COALESCE(p_listing->>'supplier_product_id', supplier_product_id),
      supplier_url           = COALESCE(p_listing->>'supplier_url', supplier_url),
      supplier_price         = COALESCE((p_listing->>'supplier_price')::numeric, supplier_price),
      supplier_currency      = COALESCE(NULLIF(p_listing->>'supplier_currency',''), supplier_currency),
      supplier_shipping_cost = COALESCE((p_listing->>'supplier_shipping_cost')::numeric, supplier_shipping_cost),
      -- Pricing audit trail (updated whenever a fresh calculation arrives)
      pricing_breakdown    = COALESCE(p_listing->'pricing_breakdown', pricing_breakdown),
      pricing_rule_version = COALESCE((p_listing->>'pricing_rule_version')::integer, pricing_rule_version),
      price_calculated_at  = COALESCE((p_listing->>'price_calculated_at')::timestamptz, price_calculated_at),
      pricing_drift_cents  = COALESCE((p_listing->>'pricing_drift_cents')::integer, pricing_drift_cents),
      -- Provenance flags
      price_source       = COALESCE(p_listing->>'price_source', price_source),
      title_source       = COALESCE(p_listing->>'title_source', title_source),
      description_source = COALESCE(p_listing->>'description_source', description_source),
      sku_source         = COALESCE(p_listing->>'sku_source', sku_source),
      updated_at     = now()
    WHERE id = v_existing
    RETURNING * INTO v_listing;
  ELSE
    INSERT INTO public.listings (
      user_id, title, sku, ebay_price, amazon_price, amazon_url, amazon_asin,
      status, amazon_data, ebay_data, has_variations, variation_count,
      price_low, price_high,
      supplier, supplier_product_id, supplier_url, supplier_price,
      supplier_currency, supplier_shipping_cost,
      pricing_breakdown, pricing_rule_version, price_calculated_at, pricing_drift_cents,
      price_source, title_source, description_source, sku_source
    ) VALUES (
      p_user_id,
      p_listing->>'title',
      p_listing->>'sku',
      (p_listing->>'ebay_price')::numeric,
      (p_listing->>'amazon_price')::numeric,
      p_listing->>'amazon_url',
      p_listing->>'amazon_asin',
      COALESCE(p_listing->>'status', 'active'),
      COALESCE(p_listing->'amazon_data', '{}'),
      COALESCE(p_listing->'ebay_data', '{}'),
      (v_count > 1),
      v_count,
      (p_listing->>'price_low')::numeric,
      (p_listing->>'price_high')::numeric,
      p_listing->>'supplier',
      p_listing->>'supplier_product_id',
      p_listing->>'supplier_url',
      (p_listing->>'supplier_price')::numeric,
      COALESCE(NULLIF(p_listing->>'supplier_currency',''), 'USD'),
      (p_listing->>'supplier_shipping_cost')::numeric,
      p_listing->'pricing_breakdown',
      (p_listing->>'pricing_rule_version')::integer,
      (p_listing->>'price_calculated_at')::timestamptz,
      (p_listing->>'pricing_drift_cents')::integer,
      p_listing->>'price_source',
      p_listing->>'title_source',
      p_listing->>'description_source',
      p_listing->>'sku_source'
    )
    RETURNING * INTO v_listing;
  END IF;

  IF v_count > 0 THEN
    INSERT INTO public.listing_variations (
      listing_id, user_id, parent_asin, variant_asin, sku, ebay_sku_encoded,
      raw_supplier_price, final_price, currency, stock_quantity, attributes,
      image_url, price_source, pricing_rule_version
    )
    SELECT
      v_listing.id,
      p_user_id,
      e->>'parent_asin',
      e->>'variant_asin',
      e->>'sku',
      e->>'ebay_sku_encoded',
      (e->>'raw_supplier_price')::numeric,
      (e->>'final_price')::numeric,
      COALESCE(e->>'currency', 'USD'),
      COALESCE((e->>'stock_quantity')::int, 1),
      COALESCE(e->'attributes', '{}'),
      NULLIF(e->>'image_url', ''),
      e->>'price_source',
      (e->>'pricing_rule_version')::integer
    FROM jsonb_array_elements(p_variations) AS e
    ON CONFLICT (user_id, sku) DO UPDATE SET
      listing_id           = EXCLUDED.listing_id,
      final_price          = EXCLUDED.final_price,
      raw_supplier_price   = EXCLUDED.raw_supplier_price,
      stock_quantity       = EXCLUDED.stock_quantity,
      attributes           = EXCLUDED.attributes,
      image_url            = COALESCE(EXCLUDED.image_url, listing_variations.image_url),
      price_source         = COALESCE(EXCLUDED.price_source, listing_variations.price_source),
      pricing_rule_version = COALESCE(EXCLUDED.pricing_rule_version, listing_variations.pricing_rule_version),
      updated_at           = now();
  END IF;

  RETURN jsonb_build_object(
    'listing',         row_to_json(v_listing),
    'variation_count', v_count,
    'action',          CASE WHEN v_existing IS NOT NULL THEN 'updated' ELSE 'created' END
  );
END $$;

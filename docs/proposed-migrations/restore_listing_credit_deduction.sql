-- PROPOSED MIGRATION — NOT APPLIED, NOT IN supabase/migrations ON PURPOSE.
--
-- Problem: 20260711100000_central_pricing_authority.sql re-created
-- create_listing_with_variations from the 20260608 version and thereby dropped
-- the credit gate + deduction that 20260703083802 had added. The backup
-- trigger enforce_listing_credit_gate skips service-role callers
-- (auth.uid() IS NULL), and create-listing calls the RPC with the service
-- role — so, per the migration files, a new listing no longer spends a credit.
--
-- BEFORE APPLYING:
--   1. Read the LIVE definition and confirm it matches the 20260711 text:
--        select pg_get_functiondef('public.create_listing_with_variations(uuid,jsonb,jsonb)'::regprocedure);
--      If the live function already contains 'INSUFFICIENT_CREDITS', do NOT apply.
--   2. Confirm how profiles.credits is kept in step with credit_transactions
--      (20260703 treats the ledger as authoritative) on a test user.
--   3. Apply on a branch/staging database, create one listing, check that
--      exactly one 'usage' ledger row appears and the balance drops by 1.
--
-- This file is the 20260711 function text with ONLY the credit block added
-- (generated mechanically, no other line changed).

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
  v_credits    int;
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
    -- ── credit gate (restored from 20260703083802) ──────────────────────────
    -- Row lock serialises concurrent creates for the same user, so two
    -- requests can never both spend the last credit.
    SELECT COALESCE(credits, 0)
    INTO v_credits
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_credits IS NULL THEN
      RAISE EXCEPTION 'User profile not found.' USING ERRCODE = 'P0002';
    END IF;

    IF v_credits < 1 THEN
      RAISE EXCEPTION 'INSUFFICIENT_CREDITS'
        USING ERRCODE = 'P0001',
              DETAIL = 'You do not have enough credits to create a listing.',
              HINT = 'credits';
    END IF;

    -- This function gates + deducts itself; tell the listings insert trigger
    -- not to charge a second credit.
    PERFORM set_config('app.listing_credit_handled', 'true', true);

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

    PERFORM set_config('app.listing_credit_handled', 'false', true);

    UPDATE public.user_plans
    SET credits_used = COALESCE(credits_used, 0) + 1,
        updated_at = now()
    WHERE user_id = p_user_id;

    INSERT INTO public.credit_transactions (
      user_id, amount, transaction_type, balance_after, description, metadata
    ) VALUES (
      p_user_id,
      -1,
      'usage',
      v_credits - 1,
      'Created eBay listing',
      jsonb_build_object(
        'listing_id', v_listing.id,
        'action', 'create_listing_with_variations',
        'credits_before', v_credits,
        'credits_after', v_credits - 1
      )
    );
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

REVOKE EXECUTE ON FUNCTION public.create_listing_with_variations(uuid, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_listing_with_variations(uuid, jsonb, jsonb)
  TO service_role;

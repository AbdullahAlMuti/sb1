-- Keep credits ledger-authoritative across trials, paid plan refreshes,
-- admin adjustments, and eBay listing creation.

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_user_grant_key
ON public.credit_transactions (user_id, (metadata->>'grant_key'))
WHERE metadata ? 'grant_key';

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

  IF v_grant_key IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.credit_transactions
    WHERE user_id = p_user_id
      AND metadata->>'grant_key' = v_grant_key
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'previous_credits', v_profile_credits,
      'new_credits', v_profile_credits,
      'delta', 0
    );
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_ledger_credits
  FROM public.credit_transactions
  WHERE user_id = p_user_id;

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

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'previous_credits', v_profile_credits,
    'ledger_credits_before', COALESCE(v_ledger_credits, 0),
    'new_credits', p_target_balance,
    'delta', v_delta
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_credit_balance(uuid, integer, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_credit_balance(uuid, integer, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.set_user_credit_balance(uuid, integer, text, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_credit_balance(uuid, integer, text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.create_listing_with_variations(
  p_user_id   uuid,
  p_listing   jsonb,
  p_variations jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing    public.listings;
  v_count      int := COALESCE(jsonb_array_length(p_variations), 0);
  v_existing   uuid;
  v_credits    int;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_existing
  FROM public.listings
  WHERE user_id = p_user_id
    AND (
      (NULLIF(p_listing->>'amazon_asin', '') IS NOT NULL AND amazon_asin = NULLIF(p_listing->>'amazon_asin', ''))
      OR (NULLIF(p_listing->>'sku', '') IS NOT NULL AND sku = NULLIF(p_listing->>'sku', ''))
      OR (NULLIF(p_listing->>'amazon_url', '') IS NOT NULL AND amazon_url = NULLIF(p_listing->>'amazon_url', ''))
    )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.listings SET
      title           = COALESCE(p_listing->>'title', title),
      sku             = COALESCE(p_listing->>'sku', sku),
      ebay_price      = COALESCE((p_listing->>'ebay_price')::numeric, ebay_price),
      amazon_price    = COALESCE((p_listing->>'amazon_price')::numeric, amazon_price),
      amazon_url      = COALESCE(p_listing->>'amazon_url', amazon_url),
      amazon_asin     = COALESCE(p_listing->>'amazon_asin', amazon_asin),
      status          = COALESCE(p_listing->>'status', status),
      has_variations  = (v_count > 1),
      variation_count = GREATEST(v_count, variation_count),
      price_low       = COALESCE((p_listing->>'price_low')::numeric, price_low),
      price_high      = COALESCE((p_listing->>'price_high')::numeric, price_high),
      amazon_data     = COALESCE(p_listing->'amazon_data', amazon_data),
      ebay_data       = COALESCE(p_listing->'ebay_data', ebay_data),
      updated_at      = now()
    WHERE id = v_existing
    RETURNING * INTO v_listing;
  ELSE
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
    -- not to charge a second credit (same pattern as app.ledger_sync).
    PERFORM set_config('app.listing_credit_handled', 'true', true);

    INSERT INTO public.listings (
      user_id, title, sku, ebay_price, amazon_price, amazon_url, amazon_asin,
      status, amazon_data, ebay_data, has_variations, variation_count,
      price_low, price_high
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
      (p_listing->>'price_high')::numeric
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
      raw_supplier_price, final_price, currency, stock_quantity, attributes, image_url
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
      NULLIF(e->>'image_url', '')
    FROM jsonb_array_elements(p_variations) AS e
    ON CONFLICT (user_id, sku) DO UPDATE SET
      listing_id         = EXCLUDED.listing_id,
      final_price        = EXCLUDED.final_price,
      raw_supplier_price = EXCLUDED.raw_supplier_price,
      stock_quantity     = EXCLUDED.stock_quantity,
      attributes         = EXCLUDED.attributes,
      image_url          = COALESCE(EXCLUDED.image_url, listing_variations.image_url),
      updated_at         = now();
  END IF;

  RETURN jsonb_build_object(
    'listing', row_to_json(v_listing),
    'variation_count', v_count,
    'action', CASE WHEN v_existing IS NOT NULL THEN 'updated' ELSE 'created' END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_listing_with_variations(uuid, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_listing_with_variations(uuid, jsonb, jsonb)
  TO service_role;

-- RLS lets an authenticated user INSERT their own listings row directly
-- (policy "Users can insert own listings"), bypassing the edge functions and
-- the credit gate in create_listing_with_variations. Gate + deduct at the
-- table level so no client-context insert can create a listing with zero
-- credits or without consuming one. Server paths (edge functions call the RPC
-- with the service-role key, so auth.uid() is NULL) manage credits themselves
-- and are skipped, as is the RPC via app.listing_credit_handled.
CREATE OR REPLACE FUNCTION public.enforce_listing_credit_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits integer;
BEGIN
  -- Trusted server/DB context, or the listing RPC already charged the credit.
  IF auth.uid() IS NULL
     OR current_setting('app.listing_credit_handled', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(credits, 0)
  INTO v_credits
  FROM public.profiles
  WHERE id = NEW.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_credits < 1 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS'
      USING ERRCODE = 'P0001',
            DETAIL = 'You do not have enough credits to create a listing.',
            HINT = 'credits';
  END IF;

  UPDATE public.user_plans
  SET credits_used = COALESCE(credits_used, 0) + 1,
      updated_at = now()
  WHERE user_id = NEW.user_id;

  INSERT INTO public.credit_transactions (
    user_id, amount, transaction_type, balance_after, description, metadata
  ) VALUES (
    NEW.user_id,
    -1,
    'usage',
    v_credits - 1,
    'Created eBay listing',
    jsonb_build_object(
      'listing_id', NEW.id,
      'action', 'listing_insert_gate',
      'credits_before', v_credits,
      'credits_after', v_credits - 1
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_listing_credit_gate ON public.listings;
CREATE TRIGGER trg_enforce_listing_credit_gate
  BEFORE INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_listing_credit_gate();

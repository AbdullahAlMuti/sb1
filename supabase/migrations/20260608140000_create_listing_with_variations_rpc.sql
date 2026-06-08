-- Atomic parent+children upsert. Called by create-listing edge fn.
-- Single listing: pass p_variations as empty array '[]'.
-- Variation listing: pass all N variation rows.

CREATE OR REPLACE FUNCTION public.create_listing_with_variations(
  p_user_id   uuid,
  p_listing   jsonb,   -- parent fields
  p_variations jsonb   -- array of variation rows (may be [])
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing    public.listings;
  v_count      int := COALESCE(jsonb_array_length(p_variations), 0);
  v_existing   uuid;
BEGIN
  -- Check if parent already exists (user_id + amazon_asin)
  SELECT id INTO v_existing
  FROM public.listings
  WHERE user_id = p_user_id
    AND amazon_asin = p_listing->>'amazon_asin'
    AND (p_listing->>'amazon_asin') IS NOT NULL
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    -- Update existing parent
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
      updated_at     = now()
    WHERE id = v_existing
    RETURNING * INTO v_listing;
  ELSE
    -- Insert new parent
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
  END IF;

  -- Bulk upsert children (single statement, any N)
  IF v_count > 0 THEN
    INSERT INTO public.listing_variations (
      listing_id, user_id, parent_asin, variant_asin, sku, ebay_sku_encoded,
      raw_supplier_price, final_price, currency, stock_quantity, attributes
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
      COALESCE(e->'attributes', '{}')
    FROM jsonb_array_elements(p_variations) AS e
    ON CONFLICT (user_id, sku) DO UPDATE SET
      listing_id         = EXCLUDED.listing_id,
      final_price        = EXCLUDED.final_price,
      raw_supplier_price = EXCLUDED.raw_supplier_price,
      stock_quantity     = EXCLUDED.stock_quantity,
      attributes         = EXCLUDED.attributes,
      updated_at         = now();
  END IF;

  RETURN jsonb_build_object(
    'listing',         row_to_json(v_listing),
    'variation_count', v_count,
    'action',          CASE WHEN v_existing IS NOT NULL THEN 'updated' ELSE 'created' END
  );
END $$;

-- Keyset-paginated listing list for dashboard (avoids full-table scan)
CREATE OR REPLACE FUNCTION public.list_user_listings(
  p_status         text DEFAULT NULL,
  p_search         text DEFAULT NULL,
  p_limit          int  DEFAULT 25,
  p_cursor_created timestamptz DEFAULT NULL,
  p_cursor_id      uuid DEFAULT NULL
) RETURNS SETOF public.listings
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT * FROM public.listings
  WHERE user_id = auth.uid()
    AND (p_status IS NULL OR status = p_status)
    AND (
      p_search IS NULL
      OR title      ILIKE '%' || p_search || '%'
      OR sku        ILIKE '%' || p_search || '%'
      OR amazon_asin ILIKE '%' || p_search || '%'
    )
    AND (
      p_cursor_created IS NULL
      OR (created_at < p_cursor_created)
      OR (created_at = p_cursor_created AND id < p_cursor_id)
    )
  ORDER BY created_at DESC, id DESC
  LIMIT LEAST(p_limit, 100);
$$;

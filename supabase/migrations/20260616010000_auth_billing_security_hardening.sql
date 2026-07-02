-- Auth & Billing security hardening (launch P0).
-- Covers audit findings #2 (profile billing escalation), #3 (RPC bypass),
-- #6 (missing SELECT RLS), and #11 (metadata getter enumeration).
-- All changes are idempotent so the migration can be re-applied safely.

-- ---------------------------------------------------------------------------
-- 1.1 — Lock create_listing_with_variations to service_role (audit #3)
--
-- The function is SECURITY DEFINER and writes listings + deducts credits with
-- no caller check. The only legitimate caller, the `create-listing` edge
-- function, already invokes it with the service-role key (see
-- supabase/functions/create-listing/index.ts). Revoking client EXECUTE removes
-- the cross-user abuse vector entirely: an authenticated user can no longer
-- invoke it via PostgREST with an arbitrary p_user_id.
-- Rollback: GRANT EXECUTE ON FUNCTION ... TO authenticated;
CREATE OR REPLACE FUNCTION public.create_listing_with_variations(
  p_user_id   uuid,
  p_listing   jsonb,   -- parent fields
  p_variations jsonb   -- array of variation rows (may be [])
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
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

  -- Check if parent already exists (user_id + amazon_asin)
  SELECT id INTO v_existing
  FROM public.listings
  WHERE user_id = p_user_id
    AND amazon_asin = p_listing->>'amazon_asin'
    AND (p_listing->>'amazon_asin') IS NOT NULL
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    -- Update existing parent (no credit charge for re-syncs)
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
    -- New listing costs 1 credit. Lock the profile row so concurrent inserts
    -- can't both pass the balance check.
    SELECT COALESCE(credits, 0) INTO v_credits
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_credits IS NULL THEN
      RAISE EXCEPTION 'User profile not found';
    END IF;
    IF v_credits < 1 THEN
      RAISE EXCEPTION 'Insufficient credits. You have %, need 1.', v_credits;
    END IF;

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

    UPDATE public.profiles
    SET credits = v_credits - 1,
        updated_at = now()
    WHERE id = p_user_id;

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
      'Created listing',
      jsonb_build_object('listing_id', v_listing.id, 'action', 'create_listing_with_variations')
    );
  END IF;

  -- Bulk upsert children (single statement, any N)
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
    'listing',         row_to_json(v_listing),
    'variation_count', v_count,
    'action',          CASE WHEN v_existing IS NOT NULL THEN 'updated' ELSE 'created' END
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.create_listing_with_variations(uuid, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_listing_with_variations(uuid, jsonb, jsonb)
  TO service_role;


-- ---------------------------------------------------------------------------
-- 1.3 — Revoke client EXECUTE on enumeration-prone SECURITY DEFINER getters
--       (audit #11)
--
-- These accept an arbitrary UUID and leak block status / subscription expiry /
-- plan name for any account. No web-app path calls them directly with a user
-- JWT; the only callers are the `get-template-url` edge function (service role,
-- unaffected) and a dormant Shopify hook (SHOPIFY_ENABLED is false). RLS
-- policies and function-to-function calls run as definer and are unaffected by
-- these REST grants.
-- Rollback: GRANT EXECUTE ON FUNCTION ... TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_user_blocked(uuid)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_subscription_expired(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_plan_name(uuid)     FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1.2 — Protect billing/subscription columns on profiles (audit #2)
--
-- RLS scopes WRITES to the owner row but not to specific columns, so an
-- authenticated user can `update({ credits, payment_status, subscription_status })`
-- on their own row and self-grant premium access. A BEFORE UPDATE trigger
-- rejects such writes from ordinary clients while preserving every legitimate
-- writer:
--   * service_role (Stripe webhook, ensure-profile, create-checkout,
--     trial-activation, create_listing_with_variations via the edge function)
--   * non-PostgREST contexts with no JWT claims (the GoTrue handle_new_user
--     signup trigger, SQL migrations, replication)
--   * admins / super_admins (the admin panel adjusts credits + is_active
--     directly from the client — see apps/admin/src/pages/AdminUsers.tsx)
-- Only a non-admin authenticated client is blocked.
CREATE OR REPLACE FUNCTION public.guard_profile_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims text := current_setting('request.jwt.claims', true);
  v_role   text;
BEGIN
  -- No JWT claims → trusted server/DB context (signup trigger, migrations). Allow.
  IF v_claims IS NULL OR v_claims = '' THEN
    RETURN NEW;
  END IF;

  v_role := (v_claims::jsonb) ->> 'role';

  -- service_role bypasses (edge functions / webhook run with the service key).
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admins/super-admins may manage billing + account status from the panel.
  IF public.has_role((select auth.uid()), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Ordinary authenticated client: reject any change to a protected column.
  IF NEW.credits             IS DISTINCT FROM OLD.credits
     OR NEW.payment_status      IS DISTINCT FROM OLD.payment_status
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.plan_id             IS DISTINCT FROM OLD.plan_id
     OR NEW.selected_plan_id    IS DISTINCT FROM OLD.selected_plan_id
     OR NEW.pending_plan_id     IS DISTINCT FROM OLD.pending_plan_id
     OR NEW.customer_id         IS DISTINCT FROM OLD.customer_id
     OR NEW.stripe_customer_id  IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.subscription_id     IS DISTINCT FROM OLD.subscription_id
     OR NEW.subscription_provider IS DISTINCT FROM OLD.subscription_provider
     OR NEW.current_period_start  IS DISTINCT FROM OLD.current_period_start
     OR NEW.current_period_end    IS DISTINCT FROM OLD.current_period_end
     OR NEW.is_active           IS DISTINCT FROM OLD.is_active
     OR NEW.account_status      IS DISTINCT FROM OLD.account_status
     OR NEW.trial_used_at       IS DISTINCT FROM OLD.trial_used_at
     OR NEW.platform_access     IS DISTINCT FROM OLD.platform_access
  THEN
    RAISE EXCEPTION 'Not allowed to modify billing, subscription, or account-status columns'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_billing ON public.profiles;
CREATE TRIGGER trg_guard_profile_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_billing_columns();

-- ---------------------------------------------------------------------------
-- 1.4 — Missing SELECT RLS policies (audit #6)
--
-- extension_sessions and app_feature_flags have RLS enabled but no SELECT
-- policy, so the dashboard's active-sessions list and feature-flag reads return
-- empty. Add owner-scoped / authenticated-read policies.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'extension_sessions'
      AND policyname = 'Users can view their extension sessions'
  ) THEN
    CREATE POLICY "Users can view their extension sessions"
      ON public.extension_sessions
      FOR SELECT TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_feature_flags'
      AND policyname = 'Authenticated users can read feature flags'
  ) THEN
    CREATE POLICY "Authenticated users can read feature flags"
      ON public.app_feature_flags
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

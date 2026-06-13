-- Seed the production plan catalog (trial / starter / pro) and stop granting
-- implicit free plans on signup. Idempotent via ON CONFLICT (name).

-- 1. Canonical plans. Prices in USD. Stripe price ids are populated later by
--    scripts/stripe-sync-plans.mjs — never hardcoded here.
INSERT INTO public.plans (
  name, display_name, price_monthly, price_yearly,
  max_listings, max_auto_orders, credits_per_month,
  is_trial, trial_duration_days, is_popular, is_active, sort_order,
  auto_orders_enabled, seo_enabled, order_reset_frequency,
  feature_flags, features
)
VALUES
  (
    'trial', 'Trial', 1.00, 0,
    10, 10, 10,
    true, 7, false, true, 0,
    true, false, 'never',
    '{"bulk_lister": true, "price_monitoring": false, "top_selling_products": false, "ai_product_research": false, "profitable_products": false, "priority_support": false, "max_ebay_accounts": 1}'::jsonb,
    '["7-day full trial for $1", "10 active listings", "10 auto-orders", "10 AI credits", "Bulk lister"]'::jsonb
  ),
  (
    'starter', 'Starter', 15.00, 144.00,
    500, -1, 500,
    false, 0, false, true, 1,
    true, true, 'monthly',
    '{"bulk_lister": true, "price_monitoring": true, "top_selling_products": true, "ai_product_research": false, "profitable_products": false, "priority_support": false, "max_ebay_accounts": 1}'::jsonb,
    '["500 active listings", "Unlimited auto-orders", "500 AI credits/mo", "Bulk lister", "Price monitoring", "Top selling products", "1 eBay account"]'::jsonb
  ),
  (
    'pro', 'Pro', 49.00, 470.40,
    5000, -1, 1500,
    false, 0, true, true, 2,
    true, true, 'monthly',
    '{"bulk_lister": true, "price_monitoring": true, "top_selling_products": true, "ai_product_research": true, "profitable_products": true, "priority_support": true, "max_ebay_accounts": 5}'::jsonb,
    '["5,000 active listings", "Unlimited auto-orders", "1,500 AI credits/mo", "AI product research", "Profitable products", "Priority support + onboarding", "5 eBay accounts"]'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_listings = EXCLUDED.max_listings,
  max_auto_orders = EXCLUDED.max_auto_orders,
  credits_per_month = EXCLUDED.credits_per_month,
  is_trial = EXCLUDED.is_trial,
  trial_duration_days = EXCLUDED.trial_duration_days,
  is_popular = EXCLUDED.is_popular,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  auto_orders_enabled = EXCLUDED.auto_orders_enabled,
  seo_enabled = EXCLUDED.seo_enabled,
  order_reset_frequency = EXCLUDED.order_reset_frequency,
  feature_flags = EXCLUDED.feature_flags,
  features = EXCLUDED.features;

-- 2. Retire every legacy plan (free/Trial/Growth/Enterprise/...). Rows survive
--    for FK integrity; existing subscribers keep working via Stripe price ids.
UPDATE public.plans
SET is_active = false
WHERE name NOT IN ('trial', 'starter', 'pro');

-- 3. New signups get NO plan and 0 credits — they must pick a plan (trial or
--    paid) from /choose-plan. Replaces the 20-free-credit grant.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, plan_id, credits, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NULL,
        0,
        true
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$function$;

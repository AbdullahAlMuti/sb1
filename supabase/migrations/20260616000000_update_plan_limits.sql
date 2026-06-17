-- Update Starter and Pro Plan limits and features
-- Target: Starter (250 auto-orders)
-- Target: Pro (Unlimited auto-orders, 5,000 AI credits, 2 eBay accounts)

-- 1. Update plans table
UPDATE public.plans
SET 
  max_auto_orders = 250,
  features = '["500 active listings", "250 auto-orders/mo", "500 AI credits/mo", "Bulk lister", "Price monitoring", "Top selling products", "1 eBay account"]'::jsonb
WHERE name IN ('starter', 'Starter');

UPDATE public.plans
SET 
  credits_per_month = 5000,
  feature_flags = '{"bulk_lister": true, "price_monitoring": true, "top_selling_products": true, "ai_product_research": true, "profitable_products": true, "priority_support": true, "max_ebay_accounts": 2}'::jsonb,
  features = '["5,000 active listings", "Unlimited auto-orders", "5,000 AI credits/mo", "AI product research", "Profitable products", "Priority support + onboarding", "2 eBay accounts"]'::jsonb
WHERE name IN ('pro', 'Pro');

-- 2. Update existing plan_features display values
UPDATE public.plan_features
SET display_value = '250/month'
WHERE title = 'Auto-orders'
  AND plan_id = (SELECT id FROM public.plans WHERE name IN ('starter', 'Starter') LIMIT 1);

UPDATE public.plan_features
SET display_value = '5,000/month'
WHERE title = 'AI credits'
  AND plan_id = (SELECT id FROM public.plans WHERE name IN ('pro', 'Pro') LIMIT 1);

-- 3. Upsert eBay accounts comparison feature for all plans
DO $$
DECLARE
  v_plan_id uuid;
BEGIN
  -- Trial
  SELECT id INTO v_plan_id FROM public.plans WHERE name = 'trial' LIMIT 1;
  IF v_plan_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.plan_features WHERE plan_id = v_plan_id AND title = 'eBay accounts') THEN
      INSERT INTO public.plan_features (plan_id, group_name, title, display_value, included, is_highlighted, sort_order)
      VALUES (v_plan_id, 'Marketplace Support', 'eBay accounts', '1', true, false, 10);
    ELSE
      UPDATE public.plan_features SET display_value = '1' WHERE plan_id = v_plan_id AND title = 'eBay accounts';
    END IF;
  END IF;

  -- Starter
  SELECT id INTO v_plan_id FROM public.plans WHERE name IN ('starter', 'Starter') LIMIT 1;
  IF v_plan_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.plan_features WHERE plan_id = v_plan_id AND title = 'eBay accounts') THEN
      INSERT INTO public.plan_features (plan_id, group_name, title, display_value, included, is_highlighted, sort_order)
      VALUES (v_plan_id, 'Marketplace Support', 'eBay accounts', '1', true, false, 14);
    ELSE
      UPDATE public.plan_features SET display_value = '1' WHERE plan_id = v_plan_id AND title = 'eBay accounts';
    END IF;
  END IF;

  -- Pro
  SELECT id INTO v_plan_id FROM public.plans WHERE name IN ('pro', 'Pro') LIMIT 1;
  IF v_plan_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.plan_features WHERE plan_id = v_plan_id AND title = 'eBay accounts') THEN
      INSERT INTO public.plan_features (plan_id, group_name, title, display_value, included, is_highlighted, sort_order)
      VALUES (v_plan_id, 'Marketplace Support', 'eBay accounts', '2', true, false, 14);
    ELSE
      UPDATE public.plan_features SET display_value = '2' WHERE plan_id = v_plan_id AND title = 'eBay accounts';
    END IF;
  END IF;
END $$;

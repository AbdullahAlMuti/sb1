-- Billing v2: backfill plan metadata + seed plan_features / plan_prices.
-- All statements are idempotent (ON CONFLICT DO NOTHING or WHERE col IS NULL).

-- ── Backfill slugs ────────────────────────────────────────────────────────────
UPDATE plans SET slug = lower(replace(name, ' ', '-'))
  WHERE slug IS NULL;

-- ── Backfill is_recommended from is_popular ───────────────────────────────────
UPDATE plans SET is_recommended = true
  WHERE is_popular = true AND is_recommended = false;

-- ── Backfill badge_text ────────────────────────────────────────────────────────
UPDATE plans SET badge_text = 'Popular'
  WHERE is_popular = true AND badge_text IS NULL;

UPDATE plans SET badge_text = '$1 Trial'
  WHERE is_trial = true AND badge_text IS NULL;

-- ── Backfill cta_text ─────────────────────────────────────────────────────────
UPDATE plans SET cta_text = CASE
  WHEN is_trial     THEN 'Start $1 Trial'
  WHEN name = 'starter'    THEN 'Start with Starter'
  WHEN name = 'Starter'    THEN 'Start with Starter'
  WHEN name = 'pro'        THEN 'Choose Pro'
  WHEN name = 'Pro'        THEN 'Choose Pro'
  WHEN name = 'growth'     THEN 'Choose Growth'
  WHEN name = 'Growth'     THEN 'Choose Growth'
  WHEN name = 'enterprise' THEN 'Contact Sales'
  WHEN name = 'Enterprise' THEN 'Contact Sales'
  ELSE 'Get Started'
END
WHERE cta_text IS NULL;

-- ── Backfill short_description ────────────────────────────────────────────────
UPDATE plans SET short_description = CASE
  WHEN is_trial            THEN 'Try SellerSuit free for 7 days — no commitment.'
  WHEN name IN ('starter','Starter') THEN 'Everything you need to start selling on eBay.'
  WHEN name IN ('pro','Pro')         THEN 'Advanced tools for serious eBay sellers.'
  WHEN name IN ('growth','Growth')   THEN 'Scale your store with more listings and automation.'
  WHEN name IN ('enterprise','Enterprise') THEN 'High-volume selling with dedicated support.'
  ELSE NULL
END
WHERE short_description IS NULL;

-- ── Backfill best_for ─────────────────────────────────────────────────────────
UPDATE plans SET best_for = CASE
  WHEN is_trial            THEN 'New sellers exploring SellerSuit'
  WHEN name IN ('starter','Starter') THEN 'Small sellers with up to 500 active listings'
  WHEN name IN ('pro','Pro')         THEN 'Power sellers needing AI research & bulk tools'
  WHEN name IN ('growth','Growth')   THEN 'Growing stores scaling past 500 listings'
  WHEN name IN ('enterprise','Enterprise') THEN 'Agencies and high-volume multi-account sellers'
  ELSE NULL
END
WHERE best_for IS NULL;

-- ── Seed plan_prices from existing price columns ──────────────────────────────
-- Uses ON CONFLICT to avoid duplicates on re-runs.

INSERT INTO plan_prices (plan_id, interval, currency, amount, stripe_price_id, is_active)
SELECT
  id,
  'one_time' AS interval,
  'usd'      AS currency,
  price_monthly AS amount,
  stripe_price_id_monthly AS stripe_price_id,
  true
FROM plans
WHERE is_trial = true
  AND price_monthly > 0
ON CONFLICT DO NOTHING;

INSERT INTO plan_prices (plan_id, interval, currency, amount, stripe_price_id, is_active)
SELECT
  id,
  'monthly'  AS interval,
  'usd'      AS currency,
  price_monthly AS amount,
  stripe_price_id_monthly AS stripe_price_id,
  true
FROM plans
WHERE is_trial = false
  AND price_monthly > 0
ON CONFLICT DO NOTHING;

INSERT INTO plan_prices (plan_id, interval, currency, amount, stripe_price_id, is_active)
SELECT
  id,
  'yearly'   AS interval,
  'usd'      AS currency,
  price_yearly AS amount,
  stripe_price_id_yearly AS stripe_price_id,
  true
FROM plans
WHERE is_trial = false
  AND price_yearly > 0
ON CONFLICT DO NOTHING;

-- ── Seed plan_features ────────────────────────────────────────────────────────
-- Insert featured rows per plan (is_highlighted = top 5 shown on plan cards).
-- group_name drives the comparison table sections.
-- We insert per plan name so this is robust across UUID changes.

DO $$
DECLARE
  v_plan_id uuid;
BEGIN

  -- ── Trial / trial plans ────────────────────────────────────────────────────
  FOR v_plan_id IN
    SELECT id FROM plans WHERE is_trial = true
  LOOP
    INSERT INTO plan_features (plan_id, group_name, title, display_value, included, is_highlighted, sort_order) VALUES
      (v_plan_id, 'Listing & Automation', 'Active listings',       '10',          true,  true,  1),
      (v_plan_id, 'Listing & Automation', 'Auto-orders',           '10',          true,  true,  2),
      (v_plan_id, 'AI Tools',             'AI credits',            '10/month',    true,  true,  3),
      (v_plan_id, 'Listing & Automation', 'Bulk lister',           '✓',           true,  true,  4),
      (v_plan_id, 'Supplier Support',     'Amazon supplier',       '✓',           true,  true,  5),
      (v_plan_id, 'Supplier Support',     'Walmart supplier',      '✗',           false, false, 6),
      (v_plan_id, 'AI Tools',             'AI title generation',   '✓',           true,  false, 7),
      (v_plan_id, 'AI Tools',             'AI description writer', '✓',           true,  false, 8),
      (v_plan_id, 'Marketplace Support',  'eBay listings',         '✓',           true,  false, 9),
      (v_plan_id, 'Support',              'Support level',         'Standard',    true,  false, 10),
      (v_plan_id, 'Team & Workspace',     'Team members',          '1',           true,  false, 11)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Starter plan ───────────────────────────────────────────────────────────
  FOR v_plan_id IN
    SELECT id FROM plans WHERE name IN ('starter','Starter') AND is_trial = false
  LOOP
    INSERT INTO plan_features (plan_id, group_name, title, display_value, included, is_highlighted, sort_order) VALUES
      (v_plan_id, 'Listing & Automation', 'Active listings',        '500',          true,  true,  1),
      (v_plan_id, 'Listing & Automation', 'Auto-orders',            'Unlimited',    true,  true,  2),
      (v_plan_id, 'AI Tools',             'AI credits',             '500/month',    true,  true,  3),
      (v_plan_id, 'Listing & Automation', 'Bulk lister',            '✓',            true,  true,  4),
      (v_plan_id, 'Product Research',     'Price monitoring',       '✓',            true,  true,  5),
      (v_plan_id, 'Supplier Support',     'Amazon supplier',        '✓',            true,  false, 6),
      (v_plan_id, 'Supplier Support',     'Walmart supplier',       '✓',            true,  false, 7),
      (v_plan_id, 'AI Tools',             'AI title generation',    '✓',            true,  false, 8),
      (v_plan_id, 'AI Tools',             'AI description writer',  '✓',            true,  false, 9),
      (v_plan_id, 'AI Tools',             'AI product research',    '✗',            false, false, 10),
      (v_plan_id, 'Product Research',     'Top selling products',   '✓',            true,  false, 11),
      (v_plan_id, 'Product Research',     'Profitable products',    '✗',            false, false, 12),
      (v_plan_id, 'Marketplace Support',  'eBay listings',          '✓',            true,  false, 13),
      (v_plan_id, 'Support',              'Support level',          'Standard',     true,  false, 14),
      (v_plan_id, 'Team & Workspace',     'Team members',           '1',            true,  false, 15),
      (v_plan_id, 'Security',             'RLS & data isolation',   '✓',            true,  false, 16)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Pro plan ───────────────────────────────────────────────────────────────
  FOR v_plan_id IN
    SELECT id FROM plans WHERE name IN ('pro','Pro') AND is_trial = false
  LOOP
    INSERT INTO plan_features (plan_id, group_name, title, display_value, included, is_highlighted, sort_order) VALUES
      (v_plan_id, 'Listing & Automation', 'Active listings',        '5,000',        true,  true,  1),
      (v_plan_id, 'Listing & Automation', 'Auto-orders',            'Unlimited',    true,  true,  2),
      (v_plan_id, 'AI Tools',             'AI credits',             '1,500/month',  true,  true,  3),
      (v_plan_id, 'AI Tools',             'AI product research',    '✓',            true,  true,  4),
      (v_plan_id, 'Product Research',     'Profitable products',    '✓',            true,  true,  5),
      (v_plan_id, 'Listing & Automation', 'Bulk lister',            '✓',            true,  false, 6),
      (v_plan_id, 'Supplier Support',     'Amazon supplier',        '✓',            true,  false, 7),
      (v_plan_id, 'Supplier Support',     'Walmart supplier',       '✓',            true,  false, 8),
      (v_plan_id, 'AI Tools',             'AI title generation',    '✓',            true,  false, 9),
      (v_plan_id, 'AI Tools',             'AI description writer',  '✓',            true,  false, 10),
      (v_plan_id, 'Product Research',     'Price monitoring',       '✓',            true,  false, 11),
      (v_plan_id, 'Product Research',     'Top selling products',   '✓',            true,  false, 12),
      (v_plan_id, 'Marketplace Support',  'eBay listings',          '✓',            true,  false, 13),
      (v_plan_id, 'Support',              'Support level',          'Priority',     true,  false, 14),
      (v_plan_id, 'Team & Workspace',     'Team members',           '1',            true,  false, 15),
      (v_plan_id, 'Security',             'RLS & data isolation',   '✓',            true,  false, 16)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Growth plan ────────────────────────────────────────────────────────────
  FOR v_plan_id IN
    SELECT id FROM plans WHERE name IN ('growth','Growth') AND is_trial = false
  LOOP
    INSERT INTO plan_features (plan_id, group_name, title, display_value, included, is_highlighted, sort_order) VALUES
      (v_plan_id, 'Listing & Automation', 'Active listings',        '2,000',        true,  true,  1),
      (v_plan_id, 'Listing & Automation', 'Auto-orders',            '2,000/month',  true,  true,  2),
      (v_plan_id, 'AI Tools',             'AI credits',             '2,000/month',  true,  true,  3),
      (v_plan_id, 'Listing & Automation', 'Bulk lister',            '✓',            true,  true,  4),
      (v_plan_id, 'Product Research',     'Price monitoring',       '✓',            true,  true,  5),
      (v_plan_id, 'Supplier Support',     'Amazon supplier',        '✓',            true,  false, 6),
      (v_plan_id, 'Supplier Support',     'Walmart supplier',       '✓',            true,  false, 7),
      (v_plan_id, 'AI Tools',             'AI title generation',    '✓',            true,  false, 8),
      (v_plan_id, 'AI Tools',             'AI description writer',  '✓',            true,  false, 9),
      (v_plan_id, 'AI Tools',             'AI product research',    '✓',            true,  false, 10),
      (v_plan_id, 'Product Research',     'Top selling products',   '✓',            true,  false, 11),
      (v_plan_id, 'Product Research',     'Profitable products',    '✓',            true,  false, 12),
      (v_plan_id, 'Marketplace Support',  'eBay listings',          '✓',            true,  false, 13),
      (v_plan_id, 'Support',              'Support level',          'Standard',     true,  false, 14),
      (v_plan_id, 'Team & Workspace',     'Team members',           '3',            true,  false, 15),
      (v_plan_id, 'Security',             'RLS & data isolation',   '✓',            true,  false, 16)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── Enterprise plan ────────────────────────────────────────────────────────
  FOR v_plan_id IN
    SELECT id FROM plans WHERE name IN ('enterprise','Enterprise') AND is_trial = false
  LOOP
    INSERT INTO plan_features (plan_id, group_name, title, display_value, included, is_highlighted, sort_order) VALUES
      (v_plan_id, 'Listing & Automation', 'Active listings',        'Unlimited',    true,  true,  1),
      (v_plan_id, 'Listing & Automation', 'Auto-orders',            'Unlimited',    true,  true,  2),
      (v_plan_id, 'AI Tools',             'AI credits',             'Unlimited',    true,  true,  3),
      (v_plan_id, 'Support',              'Support level',          'Dedicated',    true,  true,  4),
      (v_plan_id, 'Team & Workspace',     'Team members',           'Unlimited',    true,  true,  5),
      (v_plan_id, 'Listing & Automation', 'Bulk lister',            '✓',            true,  false, 6),
      (v_plan_id, 'Supplier Support',     'Amazon supplier',        '✓',            true,  false, 7),
      (v_plan_id, 'Supplier Support',     'Walmart supplier',       '✓',            true,  false, 8),
      (v_plan_id, 'AI Tools',             'AI title generation',    '✓',            true,  false, 9),
      (v_plan_id, 'AI Tools',             'AI description writer',  '✓',            true,  false, 10),
      (v_plan_id, 'AI Tools',             'AI product research',    '✓',            true,  false, 11),
      (v_plan_id, 'Product Research',     'Price monitoring',       '✓',            true,  false, 12),
      (v_plan_id, 'Product Research',     'Top selling products',   '✓',            true,  false, 13),
      (v_plan_id, 'Product Research',     'Profitable products',    '✓',            true,  false, 14),
      (v_plan_id, 'Marketplace Support',  'eBay listings',          '✓',            true,  false, 15),
      (v_plan_id, 'Security',             'RLS & data isolation',   '✓',            true,  false, 16)
    ON CONFLICT DO NOTHING;
  END LOOP;

END $$;

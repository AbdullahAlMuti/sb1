-- ============================================================
-- Product Intelligence: must-sell & profitable products control
--
-- Targets the LIVE profitable_products schema (verified 2026-07-05):
--   id, title, description, image_url, price, shipping_cost, profit,
--   stock, sales_count, total_sold, sku, tags, discount, is_active,
--   position, country, category (text), ebay_url, created_at, updated_at
-- (NOTE: repo migration 20260126204006 describes a different shape
--  that was never applied to prod — do not trust it.)
--
-- Adds taxonomy (suppliers + category vocabulary), per-day
-- performance metrics, a percentile-based scoring engine, must-sell
-- recommendations with admin approval, a smart-settings singleton,
-- and automation logs.
--
-- Design rule: NO hardcoded business values. All scoring is
-- relative (percent_rank across the catalog), weights/cutoffs live
-- in product_smart_settings and are auto-suggested from the data
-- itself. Equal weights are used only as the documented no-data
-- fallback.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Taxonomy
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  website text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Managed vocabulary for the existing free-text profitable_products.category.
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the vocabulary from categories already in use.
INSERT INTO public.product_categories (name)
SELECT DISTINCT trim(category) FROM public.profitable_products
WHERE category IS NOT NULL AND trim(category) <> ''
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- 2) Extend profitable_products (the admin-curated catalog)
-- ------------------------------------------------------------
ALTER TABLE public.profitable_products
  ADD COLUMN IF NOT EXISTS cost_price numeric,
  ADD COLUMN IF NOT EXISTS discount_price numeric,
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.product_suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_must_sell boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_sell_source text,
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclude_from_auto boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profitable_products_status_check') THEN
    ALTER TABLE public.profitable_products
      ADD CONSTRAINT profitable_products_status_check
      CHECK (status IN ('active', 'inactive', 'clearance', 'archived'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profitable_products_must_sell_source_check') THEN
    ALTER TABLE public.profitable_products
      ADD CONSTRAINT profitable_products_must_sell_source_check
      CHECK (must_sell_source IS NULL OR must_sell_source IN ('manual', 'auto'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profitable_products_status ON public.profitable_products (status);
CREATE INDEX IF NOT EXISTS idx_profitable_products_must_sell ON public.profitable_products (is_must_sell) WHERE is_must_sell;
CREATE INDEX IF NOT EXISTS idx_profitable_products_priority ON public.profitable_products (priority DESC);
CREATE INDEX IF NOT EXISTS idx_profitable_products_supplier ON public.profitable_products (supplier_id);
CREATE INDEX IF NOT EXISTS idx_profitable_products_category ON public.profitable_products (category);

-- ------------------------------------------------------------
-- 3) Performance history (feeds demand/conversion/return scores)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.profitable_products(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT current_date,
  views integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  orders integer NOT NULL DEFAULT 0,
  units_sold integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  returns integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_product_metrics_daily_date ON public.product_metrics_daily (metric_date DESC);

-- ------------------------------------------------------------
-- 4) Computed scores (one row per product, rewritten each run)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_scores (
  product_id uuid PRIMARY KEY REFERENCES public.profitable_products(id) ON DELETE CASCADE,
  profit_per_unit numeric,
  margin_pct numeric,
  potential_profit numeric,
  revenue_potential numeric,
  stock_value numeric,
  margin_score numeric,
  velocity_score numeric,
  demand_score numeric,
  conversion_score numeric,
  return_risk_score numeric,
  stock_urgency_score numeric,
  overstock_score numeric,
  seasonal_score numeric,
  data_coverage numeric NOT NULL DEFAULT 0,
  final_score numeric NOT NULL DEFAULT 0,
  rank integer,
  auto_recommendation text,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 5) Must-sell recommendations (pending until admin decides,
--    unless auto-apply mode is enabled)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.must_sell_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.profitable_products(id) ON DELETE CASCADE,
  recommendation text NOT NULL CHECK (recommendation IN ('must_sell', 'high_priority', 'normal', 'clearance', 'hidden')),
  confidence numeric NOT NULL DEFAULT 0,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'superseded', 'auto_applied')),
  decided_by uuid,
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_msr_one_pending_per_product
  ON public.must_sell_recommendations (product_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_msr_status ON public.must_sell_recommendations (status, created_at DESC);

-- ------------------------------------------------------------
-- 6) Smart settings singleton. weights = NULL means "use the
--    system-suggested weights" (data-driven, recomputed each run).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_smart_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  auto_must_sell_detection boolean NOT NULL DEFAULT false,
  auto_priority_update boolean NOT NULL DEFAULT false,
  auto_clearance_detection boolean NOT NULL DEFAULT false,
  require_manual_approval boolean NOT NULL DEFAULT true,
  ranking_strategy text NOT NULL DEFAULT 'suggested' CHECK (ranking_strategy IN ('suggested', 'custom')),
  weights jsonb,
  suggested_weights jsonb,
  suggested_at timestamptz,
  category_strategies jsonb NOT NULL DEFAULT '{}'::jsonb,
  supplier_strategies jsonb NOT NULL DEFAULT '{}'::jsonb,
  seasonal_campaign jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.product_smart_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 7) Automation logs — every automated decision is recorded
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid,
  run_type text NOT NULL,
  product_id uuid REFERENCES public.profitable_products(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_automation_logs_created ON public.product_automation_logs (created_at DESC);

-- ------------------------------------------------------------
-- 8) updated_at triggers
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_product_suppliers_updated_at') THEN
    CREATE TRIGGER trg_product_suppliers_updated_at
      BEFORE UPDATE ON public.product_suppliers
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_product_categories_updated_at') THEN
    CREATE TRIGGER trg_product_categories_updated_at
      BEFORE UPDATE ON public.product_categories
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 9) RLS — admin-manage on everything new; the existing policies
--    on profitable_products (public read, admin write) stay as-is.
-- ------------------------------------------------------------
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.must_sell_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_smart_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_automation_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'product_suppliers', 'product_categories', 'product_metrics_daily',
    'product_scores', 'must_sell_recommendations', 'product_smart_settings',
    'product_automation_logs'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = 'Admins manage ' || t
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))',
        'Admins manage ' || t, t
      );
    END IF;
  END LOOP;
END $$;

-- Users can read the active category vocabulary (shown as filters on the
-- user-facing profitable-products page).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_categories' AND policyname = 'Authenticated read active categories'
  ) THEN
    CREATE POLICY "Authenticated read active categories"
      ON public.product_categories FOR SELECT
      USING (auth.uid() IS NOT NULL AND is_active = true);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 10) Demand telemetry: users viewing/clicking active catalog
--     products feed the demand + conversion scores.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_product_event(p_product_id uuid, p_event text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  IF p_event NOT IN ('view', 'click') THEN
    RAISE EXCEPTION 'unknown event %', p_event;
  END IF;
  -- Only track active products; silently ignore anything else.
  IF NOT EXISTS (SELECT 1 FROM profitable_products WHERE id = p_product_id AND is_active = true) THEN
    RETURN;
  END IF;

  INSERT INTO product_metrics_daily AS m (product_id, metric_date, views, clicks)
  VALUES (p_product_id, current_date, (p_event = 'view')::int, (p_event = 'click')::int)
  ON CONFLICT (product_id, metric_date) DO UPDATE
    SET views = m.views + excluded.views,
        clicks = m.clicks + excluded.clicks;
END;
$$;

REVOKE ALL ON FUNCTION public.record_product_event(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_product_event(uuid, text) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 11) Settings suggestion engine (internal).
--
-- Weights are derived from the data itself:
--   raw_weight(factor) = coverage(factor) * discrimination(factor)
-- where coverage = share of products with real data for the factor
-- and discrimination = distinct-value ratio (a factor where every
-- product looks the same cannot rank anything). Weights are then
-- normalized to sum to 1. When NOTHING has data, fall back to
-- equal weights across the always-computable profit factors —
-- the only "default" in the system, used only when no data exists.
--
-- Cutoffs are suggested from catalog size (~sqrt(n) products in the
-- must-sell tier) so small catalogs don't promote half their rows
-- and large ones stay selective. Admin can override everything.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.product_engine_suggest_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer;
  v_factors jsonb := '{}'::jsonb;
  v_total numeric := 0;
  v_row record;
  v_must_share numeric;
  v_cutoffs jsonb;
  v_has_sales boolean;
  v_has_traffic boolean;
BEGIN
  SELECT count(*) INTO v_n FROM profitable_products WHERE status <> 'archived';
  IF v_n = 0 THEN
    RETURN jsonb_build_object('factors', '{}'::jsonb, 'cutoffs', '{}'::jsonb, 'sample_size', 0);
  END IF;

  -- coverage & discrimination per factor, computed from live data
  FOR v_row IN
    WITH m AS (
      SELECT product_id,
             sum(views) AS views, sum(clicks) AS clicks, sum(orders) AS orders,
             sum(units_sold) AS units, sum(returns) AS returns
      FROM product_metrics_daily
      GROUP BY product_id
    ), f AS (
      SELECT
        p.id,
        CASE WHEN p.cost_price IS NOT NULL AND p.price > 0
             THEN coalesce(nullif(p.discount_price, 0), p.price) - p.cost_price - p.shipping_cost
             WHEN p.profit <> 0 THEN p.profit
             ELSE NULL END AS margin_val,
        CASE WHEN coalesce(m.units, 0) + p.total_sold > 0 THEN coalesce(m.units, 0) + p.total_sold ELSE NULL END AS velocity_val,
        CASE WHEN coalesce(m.views, 0) + coalesce(m.clicks, 0) > 0 THEN coalesce(m.views, 0) + coalesce(m.clicks, 0) ELSE NULL END AS demand_val,
        CASE WHEN coalesce(m.clicks, 0) > 0 THEN m.orders::numeric / m.clicks ELSE NULL END AS conversion_val,
        CASE WHEN coalesce(m.orders, 0) > 0 THEN m.returns::numeric / m.orders ELSE NULL END AS return_val,
        CASE WHEN p.stock > 0 THEN p.stock ELSE NULL END AS stock_val,
        CASE WHEN p.priority <> 0 THEN p.priority ELSE NULL END AS priority_val
      FROM profitable_products p
      LEFT JOIN m ON m.product_id = p.id
      WHERE p.status <> 'archived'
    )
    SELECT x.factor,
           count(x.val)::numeric / v_n AS coverage,
           CASE WHEN count(x.val) = 0 THEN 0
                ELSE count(DISTINCT x.val)::numeric / count(x.val) END AS discrimination
    FROM f, LATERAL (VALUES
      ('margin', f.margin_val),
      ('velocity', f.velocity_val),
      ('demand', f.demand_val),
      ('conversion', f.conversion_val),
      ('return_risk', f.return_val),
      ('stock_urgency', f.stock_val),
      ('manual_priority', f.priority_val)
    ) AS x(factor, val)
    GROUP BY x.factor
  LOOP
    v_factors := v_factors || jsonb_build_object(v_row.factor, round(v_row.coverage * v_row.discrimination, 4));
    v_total := v_total + (v_row.coverage * v_row.discrimination);
  END LOOP;

  IF v_total <= 0 THEN
    -- No-data fallback: equal weights on the always-computable profit factors.
    v_factors := jsonb_build_object('margin', 0.5, 'stock_urgency', 0.5);
  ELSE
    SELECT jsonb_object_agg(key, round((value::numeric / v_total), 4))
    INTO v_factors
    FROM jsonb_each_text(v_factors);
  END IF;

  -- Tier sizes from catalog size: ~sqrt(n) products in the must-sell tier.
  v_must_share := least(0.5, sqrt(v_n) / v_n);
  v_cutoffs := jsonb_build_object(
    'must_sell', round(1 - v_must_share, 4),
    'high_priority', round(1 - (2 * v_must_share), 4),
    'hidden', round(v_must_share, 4)
  );

  SELECT exists(SELECT 1 FROM product_metrics_daily WHERE units_sold > 0 OR orders > 0),
         exists(SELECT 1 FROM product_metrics_daily WHERE views > 0 OR clicks > 0)
  INTO v_has_sales, v_has_traffic;

  RETURN jsonb_build_object(
    'factors', v_factors,
    'cutoffs', v_cutoffs,
    'sample_size', v_n,
    'suggest_auto_must_sell', v_has_sales,
    'suggest_auto_clearance', v_has_sales,
    'suggest_auto_priority', v_has_traffic OR v_has_sales
  );
END;
$$;

-- ------------------------------------------------------------
-- 12) Scoring + recommendation engine (internal).
--
-- Every factor is scored as its percent_rank across the catalog
-- (relative, self-calibrating — no fixed thresholds). Missing
-- factors are skipped and the remaining weights renormalized per
-- product; data_coverage records how much real data backed the
-- score. Recommendations come from the score distribution using
-- the (suggested or admin-set) quantile cutoffs.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.product_engine_recompute(p_triggered_by text DEFAULT 'manual')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings product_smart_settings%ROWTYPE;
  v_suggested jsonb;
  v_weights jsonb;
  v_cutoffs jsonb;
  v_run_id uuid := gen_random_uuid();
  v_scored integer := 0;
  v_recs integer := 0;
  v_applied integer := 0;
  v_auto boolean;
BEGIN
  SELECT * INTO v_settings FROM product_smart_settings WHERE id = 1 FOR UPDATE;

  -- Refresh the data-driven suggestion every run so it never goes stale.
  v_suggested := product_engine_suggest_settings();
  UPDATE product_smart_settings
  SET suggested_weights = v_suggested, suggested_at = now()
  WHERE id = 1;

  v_weights := CASE
    WHEN v_settings.ranking_strategy = 'custom' AND v_settings.weights ? 'factors'
      THEN v_settings.weights -> 'factors'
    ELSE v_suggested -> 'factors'
  END;
  v_cutoffs := CASE
    WHEN v_settings.ranking_strategy = 'custom' AND v_settings.weights ? 'cutoffs'
      THEN v_settings.weights -> 'cutoffs'
    ELSE v_suggested -> 'cutoffs'
  END;

  v_auto := NOT v_settings.require_manual_approval;

  -- Drop scores for archived/deleted products.
  DELETE FROM product_scores
  WHERE product_id NOT IN (SELECT id FROM profitable_products WHERE status <> 'archived');

  -- ---- score every non-archived product --------------------
  -- One INSERT..WITH statement: plpgsql only substitutes variables
  -- (v_weights, v_cutoffs, v_run_id) into optimizable statements,
  -- so no temp table / CREATE TABLE AS here.
  INSERT INTO product_scores AS ps (
    product_id, profit_per_unit, margin_pct, potential_profit, revenue_potential, stock_value,
    margin_score, velocity_score, demand_score, conversion_score, return_risk_score,
    stock_urgency_score, overstock_score, seasonal_score, data_coverage, final_score, rank,
    auto_recommendation, inputs, computed_at
  )
  WITH m AS (
    SELECT product_id,
           sum(views) AS views, sum(clicks) AS clicks, sum(orders) AS orders,
           sum(units_sold) AS units, sum(revenue) AS revenue, sum(returns) AS returns,
           sum(units_sold) FILTER (WHERE metric_date >= current_date - 28) AS units_recent,
           sum(units_sold) FILTER (WHERE metric_date < current_date - 28 AND metric_date >= current_date - 84) AS units_prior,
           count(DISTINCT metric_date) AS days_observed
    FROM product_metrics_daily
    GROUP BY product_id
  ), base AS (
    SELECT
      p.id AS product_id,
      p.pinned, p.exclude_from_auto, p.priority, p.stock,
      p.is_must_sell, p.status, p.is_active,
      -- Effective price: explicit discount_price wins; else the legacy
      -- percentage discount; else list price.
      coalesce(
        nullif(p.discount_price, 0),
        CASE WHEN coalesce(p.discount, 0) > 0 AND p.discount < 100
             THEN round(p.price * (1 - p.discount / 100.0), 2)
             ELSE p.price END
      ) AS eff_price,
      CASE WHEN p.cost_price IS NOT NULL
           THEN coalesce(
                  nullif(p.discount_price, 0),
                  CASE WHEN coalesce(p.discount, 0) > 0 AND p.discount < 100
                       THEN round(p.price * (1 - p.discount / 100.0), 2)
                       ELSE p.price END
                ) - p.cost_price - p.shipping_cost
           WHEN p.profit <> 0 THEN p.profit
           ELSE NULL END AS profit_unit,
      p.cost_price AS cost_unit,
      (coalesce(m.units, 0) + p.total_sold) AS lifetime_units,
      CASE WHEN m.units_recent IS NOT NULL AND m.units_recent > 0 THEN m.units_recent / 28.0
           WHEN coalesce(m.units, 0) + p.total_sold > 0 AND coalesce(m.days_observed, 0) > 0
             THEN (coalesce(m.units, 0) + p.total_sold)::numeric / greatest(m.days_observed, 1)
           WHEN coalesce(m.units, 0) + p.total_sold > 0
             THEN (coalesce(m.units, 0) + p.total_sold)::numeric / greatest(extract(day FROM now() - p.created_at)::numeric, 1)
           ELSE NULL END AS velocity,
      CASE WHEN coalesce(m.views, 0) + coalesce(m.clicks, 0) > 0
           THEN coalesce(m.views, 0) + coalesce(m.clicks, 0) ELSE NULL END AS demand_raw,
      CASE WHEN coalesce(m.clicks, 0) > 0 THEN m.orders::numeric / m.clicks ELSE NULL END AS conversion,
      CASE WHEN coalesce(m.orders, 0) > 0 THEN m.returns::numeric / m.orders ELSE NULL END AS return_rate,
      CASE WHEN m.units_prior IS NOT NULL AND m.units_prior > 0
           THEN (coalesce(m.units_recent, 0) / 28.0) / (m.units_prior / 56.0)
           ELSE NULL END AS seasonal_trend,
      m.revenue AS observed_revenue
    FROM profitable_products p
    LEFT JOIN m ON m.product_id = p.id
    WHERE p.status <> 'archived'
  ), derived AS (
    SELECT b.*,
      CASE WHEN b.eff_price > 0 AND b.profit_unit IS NOT NULL THEN b.profit_unit / b.eff_price END AS margin,
      CASE WHEN b.velocity IS NOT NULL AND b.velocity > 0 THEN b.stock / b.velocity END AS stock_days
    FROM base b
  ), pr AS (
    SELECT d.*,
      CASE WHEN d.margin IS NULL THEN NULL
           ELSE percent_rank() OVER (PARTITION BY (d.margin IS NULL) ORDER BY d.margin) END AS margin_pr,
      CASE WHEN d.velocity IS NULL THEN NULL
           ELSE percent_rank() OVER (PARTITION BY (d.velocity IS NULL) ORDER BY d.velocity) END AS velocity_pr,
      CASE WHEN d.demand_raw IS NULL THEN NULL
           ELSE percent_rank() OVER (PARTITION BY (d.demand_raw IS NULL) ORDER BY d.demand_raw) END AS demand_pr,
      CASE WHEN d.conversion IS NULL THEN NULL
           ELSE percent_rank() OVER (PARTITION BY (d.conversion IS NULL) ORDER BY d.conversion) END AS conversion_pr,
      CASE WHEN d.return_rate IS NULL THEN NULL
           ELSE 1 - percent_rank() OVER (PARTITION BY (d.return_rate IS NULL) ORDER BY d.return_rate) END AS return_risk_pr,
      CASE WHEN d.stock_days IS NULL THEN NULL
           ELSE 1 - percent_rank() OVER (PARTITION BY (d.stock_days IS NULL) ORDER BY d.stock_days) END AS stock_urgency_pr,
      CASE WHEN d.stock_days IS NULL THEN NULL
           ELSE percent_rank() OVER (PARTITION BY (d.stock_days IS NULL) ORDER BY d.stock_days) END AS overstock_pr,
      CASE WHEN d.seasonal_trend IS NULL THEN NULL
           ELSE percent_rank() OVER (PARTITION BY (d.seasonal_trend IS NULL) ORDER BY d.seasonal_trend) END AS seasonal_pr,
      CASE WHEN d.priority = 0 THEN NULL
           ELSE percent_rank() OVER (PARTITION BY (d.priority = 0) ORDER BY d.priority) END AS priority_pr
    FROM derived d
  ), scored AS (
  SELECT pr.*,
    -- weighted sum over available factors, weights renormalized per product
    (SELECT coalesce(
        sum(w.weight * f.score) / nullif(sum(w.weight), 0), 0)
     FROM (VALUES
        ('margin', pr.margin_pr),
        ('velocity', pr.velocity_pr),
        ('demand', pr.demand_pr),
        ('conversion', pr.conversion_pr),
        ('return_risk', pr.return_risk_pr),
        ('stock_urgency', pr.stock_urgency_pr),
        ('seasonal', pr.seasonal_pr),
        ('manual_priority', pr.priority_pr)
     ) AS f(factor, score)
     JOIN LATERAL (
        SELECT coalesce((v_weights ->> f.factor)::numeric, 0) AS weight
     ) w ON true
     WHERE f.score IS NOT NULL AND w.weight > 0
    ) AS final_score,
    (SELECT count(*) FILTER (WHERE s IS NOT NULL)::numeric / 8
     FROM unnest(ARRAY[pr.margin_pr, pr.velocity_pr, pr.demand_pr, pr.conversion_pr,
                       pr.return_risk_pr, pr.stock_urgency_pr, pr.overstock_pr, pr.seasonal_pr]) AS s
    ) AS data_coverage
  FROM pr
  )
  SELECT
    t.product_id,
    t.profit_unit,
    round(t.margin * 100, 2),
    t.profit_unit * t.stock,
    t.eff_price * t.stock,
    t.cost_unit * t.stock,
    t.margin_pr, t.velocity_pr, t.demand_pr, t.conversion_pr, t.return_risk_pr,
    t.stock_urgency_pr, t.overstock_pr, t.seasonal_pr,
    round(t.data_coverage, 3),
    round(t.final_score::numeric, 4),
    row_number() OVER (ORDER BY t.final_score DESC),
    CASE
      WHEN t.final_score >= (v_cutoffs ->> 'must_sell')::numeric THEN 'must_sell'
      WHEN t.overstock_pr IS NOT NULL AND t.margin_pr IS NOT NULL
           AND t.overstock_pr >= (v_cutoffs ->> 'must_sell')::numeric
           AND t.margin_pr <= (v_cutoffs ->> 'hidden')::numeric THEN 'clearance'
      WHEN t.final_score >= (v_cutoffs ->> 'high_priority')::numeric THEN 'high_priority'
      WHEN t.final_score <= (v_cutoffs ->> 'hidden')::numeric THEN 'hidden'
      ELSE 'normal'
    END,
    jsonb_build_object(
      'velocity', round(coalesce(t.velocity, 0), 4),
      'stock_days', round(t.stock_days, 1),
      'conversion', round(t.conversion, 4),
      'return_rate', round(t.return_rate, 4),
      'seasonal_trend', round(t.seasonal_trend, 3),
      'lifetime_units', t.lifetime_units,
      'observed_revenue', t.observed_revenue,
      'weights_used', v_weights,
      'run_id', v_run_id
    ),
    now()
  FROM scored t
  ON CONFLICT (product_id) DO UPDATE SET
    profit_per_unit = excluded.profit_per_unit,
    margin_pct = excluded.margin_pct,
    potential_profit = excluded.potential_profit,
    revenue_potential = excluded.revenue_potential,
    stock_value = excluded.stock_value,
    margin_score = excluded.margin_score,
    velocity_score = excluded.velocity_score,
    demand_score = excluded.demand_score,
    conversion_score = excluded.conversion_score,
    return_risk_score = excluded.return_risk_score,
    stock_urgency_score = excluded.stock_urgency_score,
    overstock_score = excluded.overstock_score,
    seasonal_score = excluded.seasonal_score,
    data_coverage = excluded.data_coverage,
    final_score = excluded.final_score,
    rank = excluded.rank,
    auto_recommendation = excluded.auto_recommendation,
    inputs = excluded.inputs,
    computed_at = excluded.computed_at;

  GET DIAGNOSTICS v_scored = ROW_COUNT;

  -- ---- recommendations -------------------------------------
  -- Supersede stale pending recommendations that no longer match.
  UPDATE must_sell_recommendations r
  SET status = 'superseded'
  FROM product_scores s
  WHERE r.status = 'pending'
    AND r.product_id = s.product_id
    AND r.recommendation <> s.auto_recommendation;

  -- Create pending recommendations where the engine's label differs
  -- from the product's current effective state. Pinned/excluded
  -- products are never touched by automation.
  WITH current_label AS (
    SELECT p.id,
      CASE
        WHEN p.is_must_sell THEN 'must_sell'
        WHEN p.status = 'clearance' THEN 'clearance'
        WHEN NOT p.is_active OR p.status = 'inactive' THEN 'hidden'
        WHEN p.priority > 0 THEN 'high_priority'
        ELSE 'normal'
      END AS label
    FROM profitable_products p
    WHERE p.status <> 'archived' AND NOT p.pinned AND NOT p.exclude_from_auto
  ), ins AS (
    INSERT INTO must_sell_recommendations (product_id, recommendation, confidence, reasons)
    SELECT s.product_id, s.auto_recommendation,
      coalesce(round(s.data_coverage * least(1, abs(s.final_score - (v_cutoffs ->> 'high_priority')::numeric) * 2), 3), 0),
      (
        SELECT coalesce(jsonb_agg(reason), '[]'::jsonb) FROM (
          SELECT format('%s: top %s%% of catalog', f.label, round((1 - f.score) * 100)) AS reason
          FROM (VALUES
            ('Profit margin', s.margin_score),
            ('Sales velocity', s.velocity_score),
            ('Customer demand', s.demand_score),
            ('Conversion rate', s.conversion_score),
            ('Low return risk', s.return_risk_score),
            ('Stock urgency', s.stock_urgency_score)
          ) AS f(label, score)
          WHERE f.score IS NOT NULL
          ORDER BY f.score DESC
          LIMIT 3
        ) top_reasons
      )
    FROM product_scores s
    JOIN current_label c ON c.id = s.product_id
    WHERE s.auto_recommendation <> c.label
      AND NOT EXISTS (
        SELECT 1 FROM must_sell_recommendations r
        WHERE r.product_id = s.product_id AND r.status = 'pending'
      )
    RETURNING id
  )
  SELECT count(*) INTO v_recs FROM ins;

  -- ---- auto-apply mode -------------------------------------
  IF v_auto THEN
    WITH applied AS (
      UPDATE profitable_products p
      SET is_must_sell = CASE WHEN v_settings.auto_must_sell_detection AND r.recommendation = 'must_sell' THEN true
                              WHEN v_settings.auto_must_sell_detection AND r.recommendation IN ('normal', 'clearance', 'hidden')
                                   AND p.must_sell_source = 'auto' THEN false
                              ELSE p.is_must_sell END,
          must_sell_source = CASE WHEN v_settings.auto_must_sell_detection AND r.recommendation = 'must_sell' THEN 'auto'
                                  WHEN v_settings.auto_must_sell_detection AND r.recommendation IN ('normal', 'clearance', 'hidden')
                                       AND p.must_sell_source = 'auto' THEN NULL
                                  ELSE p.must_sell_source END,
          status = CASE WHEN v_settings.auto_clearance_detection AND r.recommendation = 'clearance' THEN 'clearance'
                        WHEN v_settings.auto_clearance_detection AND r.recommendation <> 'clearance' AND p.status = 'clearance' THEN 'active'
                        ELSE p.status END,
          priority = CASE WHEN v_settings.auto_priority_update THEN round(s.final_score * 100)::int
                          ELSE p.priority END,
          -- position drives the user-facing sort order (ascending);
          -- follow the engine rank when auto priority is on.
          position = CASE WHEN v_settings.auto_priority_update THEN s.rank ELSE p.position END
      FROM must_sell_recommendations r
      JOIN product_scores s ON s.product_id = r.product_id
      WHERE r.status = 'pending' AND r.product_id = p.id
        AND NOT p.pinned AND NOT p.exclude_from_auto
        AND (v_settings.auto_must_sell_detection OR v_settings.auto_clearance_detection OR v_settings.auto_priority_update)
      RETURNING p.id
    )
    UPDATE must_sell_recommendations r
    SET status = 'auto_applied', decided_at = now(), decision_reason = 'auto-apply mode'
    FROM applied a
    WHERE r.product_id = a.id AND r.status = 'pending';

    GET DIAGNOSTICS v_applied = ROW_COUNT;
  END IF;

  INSERT INTO product_automation_logs (run_id, run_type, action, details, triggered_by)
  VALUES (
    v_run_id, 'recompute', 'scored_catalog',
    jsonb_build_object(
      'products_scored', v_scored,
      'recommendations_created', v_recs,
      'auto_applied', v_applied,
      'weights_used', v_weights,
      'cutoffs_used', v_cutoffs
    ),
    p_triggered_by
  );

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'products_scored', v_scored,
    'recommendations_created', v_recs,
    'auto_applied', v_applied
  );
END;
$$;

-- Internal engine: only the service role (cron worker) may call directly.
REVOKE ALL ON FUNCTION public.product_engine_suggest_settings() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.product_engine_recompute(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_engine_suggest_settings() TO service_role;
GRANT EXECUTE ON FUNCTION public.product_engine_recompute(text) TO service_role;

-- ------------------------------------------------------------
-- 13) Admin-facing RPCs (is_admin-guarded wrappers)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_recompute_product_scores()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required';
  END IF;
  RETURN public.product_engine_recompute('admin:' || auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_suggest_product_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required';
  END IF;
  v := public.product_engine_suggest_settings();
  UPDATE product_smart_settings SET suggested_weights = v, suggested_at = now() WHERE id = 1;
  INSERT INTO product_automation_logs (run_type, action, details, triggered_by)
  VALUES ('suggest_settings', 'suggested_configuration', v, 'admin:' || auth.uid());
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_decide_recommendation(
  p_recommendation_id uuid,
  p_decision text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec must_sell_recommendations%ROWTYPE;
  v_score numeric;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required';
  END IF;
  IF p_decision NOT IN ('accept', 'reject') THEN
    RAISE EXCEPTION 'decision must be accept or reject';
  END IF;

  SELECT * INTO v_rec FROM must_sell_recommendations WHERE id = p_recommendation_id FOR UPDATE;
  IF NOT FOUND OR v_rec.status <> 'pending' THEN
    RAISE EXCEPTION 'recommendation not found or already decided';
  END IF;

  IF p_decision = 'accept' THEN
    SELECT final_score INTO v_score FROM product_scores WHERE product_id = v_rec.product_id;

    UPDATE profitable_products SET
      is_must_sell = CASE WHEN v_rec.recommendation = 'must_sell' THEN true
                          WHEN must_sell_source = 'auto' THEN false
                          ELSE is_must_sell END,
      must_sell_source = CASE WHEN v_rec.recommendation = 'must_sell' THEN 'auto'
                              WHEN must_sell_source = 'auto' THEN NULL
                              ELSE must_sell_source END,
      status = CASE WHEN v_rec.recommendation = 'clearance' THEN 'clearance'
                    WHEN v_rec.recommendation <> 'clearance' AND status = 'clearance' THEN 'active'
                    ELSE status END,
      is_active = CASE WHEN v_rec.recommendation = 'hidden' THEN false ELSE is_active END,
      priority = CASE WHEN v_rec.recommendation = 'high_priority' THEN greatest(priority, round(coalesce(v_score, 0) * 100)::int)
                      WHEN v_rec.recommendation = 'normal' THEN 0
                      ELSE priority END
    WHERE id = v_rec.product_id;
  END IF;

  UPDATE must_sell_recommendations
  SET status = CASE p_decision WHEN 'accept' THEN 'accepted' ELSE 'rejected' END,
      decided_by = auth.uid(), decided_at = now(), decision_reason = p_reason
  WHERE id = p_recommendation_id;

  INSERT INTO product_automation_logs (run_type, action, product_id, details, triggered_by)
  VALUES ('apply_recommendation', p_decision || 'ed_' || v_rec.recommendation, v_rec.product_id,
          jsonb_build_object('recommendation_id', p_recommendation_id, 'reason', p_reason),
          'admin:' || auth.uid());

  RETURN jsonb_build_object('id', p_recommendation_id, 'status', p_decision || 'ed');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_bulk_update_products(
  p_ids uuid[],
  p_patch jsonb,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required';
  END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'no products selected';
  END IF;

  -- Whitelisted patch keys only — anything else is rejected.
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_patch) k
    WHERE k NOT IN ('status', 'priority', 'position', 'is_active', 'is_must_sell', 'pinned',
                    'exclude_from_auto', 'category', 'supplier_id', 'reset_ranking', 'delete')
  ) THEN
    RAISE EXCEPTION 'patch contains unsupported keys';
  END IF;

  IF coalesce((p_patch ->> 'delete')::boolean, false) THEN
    DELETE FROM profitable_products WHERE id = ANY (p_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSIF coalesce((p_patch ->> 'reset_ranking')::boolean, false) THEN
    DELETE FROM product_scores WHERE product_id = ANY (p_ids);
    UPDATE must_sell_recommendations SET status = 'superseded'
    WHERE product_id = ANY (p_ids) AND status = 'pending';
    UPDATE profitable_products
    SET priority = 0,
        is_must_sell = CASE WHEN must_sell_source = 'auto' THEN false ELSE is_must_sell END,
        must_sell_source = CASE WHEN must_sell_source = 'auto' THEN NULL ELSE must_sell_source END
    WHERE id = ANY (p_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    UPDATE profitable_products SET
      status = coalesce(p_patch ->> 'status', status),
      archived_at = CASE WHEN p_patch ->> 'status' = 'archived' THEN now()
                         WHEN p_patch ->> 'status' IS NOT NULL THEN NULL
                         ELSE archived_at END,
      priority = coalesce((p_patch ->> 'priority')::int, priority),
      position = coalesce((p_patch ->> 'position')::int, position),
      is_active = coalesce((p_patch ->> 'is_active')::boolean, is_active),
      is_must_sell = coalesce((p_patch ->> 'is_must_sell')::boolean, is_must_sell),
      must_sell_source = CASE
        WHEN (p_patch ->> 'is_must_sell')::boolean IS true THEN 'manual'
        WHEN (p_patch ->> 'is_must_sell')::boolean IS false THEN NULL
        ELSE must_sell_source END,
      pinned = coalesce((p_patch ->> 'pinned')::boolean, pinned),
      exclude_from_auto = coalesce((p_patch ->> 'exclude_from_auto')::boolean, exclude_from_auto),
      category = CASE WHEN p_patch ? 'category' THEN nullif(p_patch ->> 'category', '') ELSE category END,
      supplier_id = CASE WHEN p_patch ? 'supplier_id' THEN nullif(p_patch ->> 'supplier_id', '')::uuid ELSE supplier_id END
    WHERE id = ANY (p_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  INSERT INTO product_automation_logs (run_type, action, details, triggered_by)
  VALUES ('bulk_action', 'bulk_update',
          jsonb_build_object('ids', to_jsonb(p_ids), 'patch', p_patch, 'affected', v_count, 'reason', p_reason),
          'admin:' || auth.uid());

  RETURN jsonb_build_object('affected', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_recompute_product_scores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suggest_product_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_recommendation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_update_products(uuid[], jsonb, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_recompute_product_scores() FROM anon;
REVOKE ALL ON FUNCTION public.admin_suggest_product_settings() FROM anon;
REVOKE ALL ON FUNCTION public.admin_decide_recommendation(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_bulk_update_products(uuid[], jsonb, text) FROM anon;

-- ------------------------------------------------------------
-- 14) Seed daily metrics from lifetime total_sold for products with
--     no history yet, so the engine has a starting signal.
--     (Rough seed: lifetime units attributed to today, one order
--     per unit — replaced by real data as it accrues.)
-- ------------------------------------------------------------
INSERT INTO public.product_metrics_daily (product_id, metric_date, units_sold, orders)
SELECT p.id, current_date, p.total_sold, p.total_sold
FROM public.profitable_products p
WHERE p.total_sold > 0
  AND NOT EXISTS (SELECT 1 FROM public.product_metrics_daily m WHERE m.product_id = p.id)
ON CONFLICT (product_id, metric_date) DO NOTHING;

/**
 * Row shapes for the product intelligence module.
 *
 * CatalogProduct mirrors the LIVE profitable_products schema (verified
 * against prod 2026-07-05) plus the columns added by migration
 * 20260705100000_product_intelligence.sql.
 */

export type ProductStatus = "active" | "inactive" | "clearance" | "archived";
export type RecommendationLabel = "must_sell" | "high_priority" | "normal" | "clearance" | "hidden";
export type RecommendationStatus = "pending" | "accepted" | "rejected" | "superseded" | "auto_applied";

export interface ProductScore {
  product_id: string;
  profit_per_unit: number | null;
  margin_pct: number | null;
  potential_profit: number | null;
  revenue_potential: number | null;
  stock_value: number | null;
  margin_score: number | null;
  velocity_score: number | null;
  demand_score: number | null;
  conversion_score: number | null;
  return_risk_score: number | null;
  stock_urgency_score: number | null;
  overstock_score: number | null;
  seasonal_score: number | null;
  data_coverage: number;
  final_score: number;
  rank: number | null;
  auto_recommendation: RecommendationLabel | null;
  inputs: Record<string, unknown>;
  computed_at: string;
}

export interface CatalogProduct {
  // live columns
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number;
  shipping_cost: number;
  profit: number;
  stock: number;
  sales_count: number;
  total_sold: number;
  sku: string | null;
  tags: string[] | null;
  /** Legacy percentage discount (0–100) shown as a badge on the user page. */
  discount: number | null;
  is_active: boolean;
  /** User-facing sort order (ascending). */
  position: number;
  country: string;
  category: string | null;
  ebay_url: string | null;
  created_at: string;
  updated_at: string;
  // intelligence columns (migration 20260705100000)
  cost_price: number | null;
  discount_price: number | null;
  supplier_id: string | null;
  status: ProductStatus;
  priority: number;
  is_must_sell: boolean;
  must_sell_source: "manual" | "auto" | null;
  pinned: boolean;
  exclude_from_auto: boolean;
  low_stock_threshold: number;
  archived_at: string | null;
  /** One-to-one embed (product_scores PK = product id). */
  product_scores?: ProductScore | null;
}

export interface ProductSupplier {
  id: string;
  name: string;
  website: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface MustSellRecommendation {
  id: string;
  product_id: string;
  recommendation: RecommendationLabel;
  confidence: number;
  reasons: string[];
  status: RecommendationStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  created_at: string;
  profitable_products?: Pick<
    CatalogProduct,
    "title" | "sku" | "price" | "stock" | "is_must_sell" | "status" | "priority"
  > | null;
}

export interface SmartSettings {
  id: number;
  auto_must_sell_detection: boolean;
  auto_priority_update: boolean;
  auto_clearance_detection: boolean;
  require_manual_approval: boolean;
  ranking_strategy: "suggested" | "custom";
  weights: { factors?: Record<string, number>; cutoffs?: Record<string, number> } | null;
  suggested_weights: SuggestedSettings | null;
  suggested_at: string | null;
  updated_at: string;
}

/** Payload returned by admin_suggest_product_settings / stored in suggested_weights. */
export interface SuggestedSettings {
  factors: Record<string, number>;
  cutoffs: Record<string, number>;
  sample_size: number;
  suggest_auto_must_sell?: boolean;
  suggest_auto_clearance?: boolean;
  suggest_auto_priority?: boolean;
}

export interface AutomationLog {
  id: string;
  run_id: string | null;
  run_type: string;
  product_id: string | null;
  action: string;
  details: Record<string, unknown>;
  triggered_by: string;
  created_at: string;
}

export interface MetricsDaily {
  metric_date: string;
  views: number;
  clicks: number;
  orders: number;
  units_sold: number;
  revenue: number;
  returns: number;
}

import { type RecommendationLabel } from "./types";

/** Human labels + badge tones for engine recommendation tiers. */
export const RECOMMENDATION_META: Record<RecommendationLabel, { label: string; badge: string }> = {
  must_sell: { label: "Must Sell", badge: "active" },
  high_priority: { label: "High Priority", badge: "pending" },
  normal: { label: "Normal", badge: "queued" },
  clearance: { label: "Clearance", badge: "warning" },
  hidden: { label: "Hidden", badge: "inactive" },
};

/** Factor keys the engine understands, with display labels. */
export const FACTOR_LABELS: Record<string, string> = {
  margin: "Profit margin",
  velocity: "Sales velocity",
  demand: "Customer demand (views/clicks)",
  conversion: "Conversion rate",
  return_risk: "Low return risk",
  stock_urgency: "Stock urgency",
  seasonal: "Seasonal trend",
  manual_priority: "Manual priority",
};

/** Parse a "one URL per line" textarea into a clean list of image URLs. */
export function parseImageLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//i.test(line));
}

/**
 * Normalize a factor→weight map so weights sum to 1 (for display and for
 * saving custom strategies). Negative/invalid entries are dropped; an empty or
 * all-zero map returns {}.
 */
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const entries = Object.entries(weights).filter(([, v]) => Number.isFinite(v) && v > 0);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (total <= 0) return {};
  return Object.fromEntries(entries.map(([k, v]) => [k, Number((v / total).toFixed(4))]));
}

/**
 * Effective sell price: explicit discount price wins; else the legacy
 * percentage discount (0–100) is applied; else list price.
 * Mirrors the SQL engine's eff_price expression.
 */
export function effectivePrice(price: number, discountPrice: number | null, discountPct?: number | null): number {
  if (discountPrice && discountPrice > 0) return discountPrice;
  if (discountPct && discountPct > 0 && discountPct < 100) {
    return Number((price * (1 - discountPct / 100)).toFixed(2));
  }
  return price;
}

/**
 * Profit per unit, preferring real supplier cost when available and falling
 * back to the manually entered profit figure (legacy rows have only that).
 */
export function profitPerUnit(p: {
  price: number;
  discount_price: number | null;
  discount?: number | null;
  cost_price: number | null;
  shipping_cost: number;
  profit: number;
}): number | null {
  if (p.cost_price != null) {
    return effectivePrice(p.price, p.discount_price, p.discount) - p.cost_price - p.shipping_cost;
  }
  if (p.profit !== 0) return p.profit;
  return null;
}

export function formatMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatScore(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return (n * 100).toFixed(0);
}

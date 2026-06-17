/**
 * Central registry of React Query keys for the admin app.
 *
 * One namespace per data type. Every hook reads from here and every mutation
 * invalidates from here, so there is a single source of truth for cache
 * identity — no more ad-hoc string keys drifting across pages.
 */
export type ListParams = Record<string, unknown> | undefined;

function entity(name: string) {
  return {
    all: [name] as const,
    list: (params?: ListParams) => [name, "list", params ?? {}] as const,
    detail: (id: string) => [name, "detail", id] as const,
  };
}

export const keys = {
  users: entity("users"),
  notices: entity("notices"),
  coupons: entity("coupons"),
  plans: entity("plans"),
  planPrices: entity("plan_prices"),
  planFeatures: entity("plan_features"),
  subscriptions: entity("subscriptions"),
  checkoutSessions: entity("checkout_sessions"),
  prompts: entity("prompts"),
  catalogBestSelling: entity("best_selling_items"),
  catalogMustSell: entity("must_sell_items"),
  catalogProfitable: entity("profitable_products"),
  audit: entity("admin_audit_logs"),
  queues: entity("admin_queues"),
  syncHealth: entity("ebay_sync_health"),
  extensionDevices: entity("extension_devices"),
  featureFlags: entity("app_feature_flags"),
  stripeEvents: entity("stripe_events"),
  overview: entity("admin_overview"),
} as const;

export type EntityKey = keyof typeof keys;

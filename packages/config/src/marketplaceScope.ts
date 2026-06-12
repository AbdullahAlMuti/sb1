// ============================================
// MARKETPLACE SCOPE CONFIGURATION
// ============================================
//
// SINGLE SOURCE OF TRUTH for which marketplaces are active in the product.
//
// Current product scope = eBay ONLY. Shopify is disabled / future scope.
// See AI_AGENT_SCOPE_EBAY_ONLY.md at the repo root.
//
// To re-enable Shopify in the future:
//   set `shopify.enabled` / `shopify.active` / `shopify.currentScope` to true.
// No Shopify code is deleted — re-enabling is a flag flip, not a rebuild.
// ============================================

export interface MarketplaceFlags {
  /** Code paths/routes are mounted and reachable. */
  enabled: boolean;
  /** Treated as an active, supported marketplace in the current product. */
  active: boolean;
  /** Part of the current (not future) product scope. */
  currentScope: boolean;
  /** Reserved for a later release but intentionally off right now. */
  futureScope?: boolean;
}

export const marketplaceScope = {
  ebay: {
    enabled: true,
    active: true,
    currentScope: true,
  },
  shopify: {
    enabled: false,
    active: false,
    currentScope: false,
    futureScope: true,
  },
} as const satisfies Record<string, MarketplaceFlags>;

export type MarketplaceId = keyof typeof marketplaceScope;

/** True when a marketplace's UI/routes should be shown to users. */
export function isMarketplaceEnabled(id: MarketplaceId): boolean {
  return marketplaceScope[id].enabled;
}

/** Convenience flags for the common checks. */
export const EBAY_ENABLED = marketplaceScope.ebay.enabled;
export const SHOPIFY_ENABLED = marketplaceScope.shopify.enabled;

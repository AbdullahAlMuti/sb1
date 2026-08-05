# Full Shopify Marketplace Enablement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Shopify marketplace features across SellerSuit by updating the single-source-of-truth marketplace configuration, un-gating Shopify routes, restoring goal selection in user registration, and activating Shopify navigation.

**Architecture:** Update central `marketplaceScope.ts` flags (`shopify.enabled = true`), un-gate React SPA routes in `App.tsx`, and verify routing, registration, and navigation integration.

**Tech Stack:** TypeScript, React, Vite, `@repo/config`.

## Global Constraints

- Do not delete any existing eBay or Shopify code.
- Ensure `marketplaceScope.shopify.enabled`, `active`, and `currentScope` are set to `true`.
- Run typecheck after changes to verify zero compiler errors across web, admin, and marketing.

---

### Task 1: Update Central Marketplace Configuration Flag

**Files:**
- Modify: `packages/config/src/marketplaceScope.ts:26-38`

**Interfaces:**
- Consumes: None
- Produces: `SHOPIFY_ENABLED = true` exported from `@repo/config`

- [ ] **Step 1: Edit `marketplaceScope.ts` to enable Shopify**

Update `marketplaceScope.shopify` in `packages/config/src/marketplaceScope.ts`:

```typescript
export const marketplaceScope = {
  ebay: {
    enabled: true,
    active: true,
    currentScope: true,
  },
  shopify: {
    enabled: true,
    active: true,
    currentScope: true,
    futureScope: false,
  },
} as const satisfies Record<string, MarketplaceFlags>;
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run typecheck`
Expected: Passes with zero errors across all workspaces.

- [ ] **Step 3: Commit flag update**

```bash
git add packages/config/src/marketplaceScope.ts docs/superpowers/specs/2026-08-06-enable-shopify-design.md docs/superpowers/plans/2026-08-06-enable-shopify.md
git commit -m "feat: enable shopify marketplace feature flags in marketplaceScope"
```

---

### Task 2: Verify Un-gated Shopify Routes & Pre-Release Build Gate

**Files:**
- Modify: None (verified via build scripts)

- [ ] **Step 1: Run workspace typecheck**

Run: `npm run typecheck`
Expected: All packages pass typecheck cleanly.

- [ ] **Step 2: Run extension test suite**

Run: `cd apps/extension && npm test`
Expected: Extension tests pass 100%.

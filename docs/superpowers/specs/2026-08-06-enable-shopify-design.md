# Design Document: Full Shopify Marketplace Enablement

**Date**: 2026-08-06  
**Target Repository**: SellerSuit Monorepo (`d:\eBay Software\2026sellersuit\sb1`)  
**Scope Expansion**: Enabling Shopify marketplace alongside eBay (Multi-Marketplace SaaS)

---

## 1. Executive Summary

This design document specifies the complete un-gating and enablement of Shopify features across the SellerSuit monorepo. By updating the central single-source-of-truth marketplace configuration (`packages/config/src/marketplaceScope.ts`), Shopify routes, navigation items, registration goal selection (`ebay` | `shopify` | `both`), and onboarding steps will be enabled.

---

## 2. Component Modifications & Behavior

### 2.1 Central Feature Flag (`packages/config/src/marketplaceScope.ts`)
- Update `marketplaceScope.shopify`:
  - `enabled: true`
  - `active: true`
  - `currentScope: true`
  - `futureScope: false`
- `SHOPIFY_ENABLED` constant resolves to `true` globally across `@repo/config`, `apps/web`, `apps/admin`, and `@repo/auth`.

### 2.2 Routing & Route Guards (`apps/web/src/App.tsx` & `packages/auth/src/ProtectedRoute.tsx`)
- `ShopifyRoutes` in `App.tsx` renders `<ShopifyRoutesInner />` instead of redirecting to `/dashboard/ebay`.
- Un-gates all `/dashboard/shopify/*` sub-routes (`stores`, `products`, `orders`, `settings`, `connect`).
- `ProtectedRoute` permits access to Shopify routes for users with `goal: 'shopify'` or `goal: 'both'`.

### 2.3 User Registration & Onboarding (`Register.tsx` & `OnboardingStepper.tsx`)
- `Register.tsx` initializes at Step 1 (Goal Selection) with `selectedGoal` defaulting to `null`.
- Registration goal options UI displays **eBay**, **Shopify**, and **Both (Multi-Marketplace)** options.
- `OnboardingStepper.tsx` marks the Shopify store setup step as `active: true`.

### 2.4 Navigation & Sidebar (`navigation.ts` & `DashboardSidebar.tsx`)
- `getDashboardPathForGoal('shopify')` resolves to `/dashboard/shopify`.
- Sidebar displays Shopify navigation items and marketplace switching UI.

---

## 3. Verification Plan

- Run `npm run typecheck` across all workspace packages (`web`, `admin`, `marketing`).
- Verify zero TypeScript compiler errors.

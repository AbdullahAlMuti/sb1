# SellerSuit — Project Context Brief (for AI assistants)

> Paste this whole file at the start of a chat with any AI assistant.
> It gives the AI everything it needs to answer questions about my project accurately.

---

## 1. What the product is

**SellerSuit** is an **eBay dropshipping toolkit / SaaS**. It helps eBay sellers find products on
supplier sites (Amazon, Walmart, AliExpress), auto-list them to eBay, and manage listings, orders,
billing, and integrations from one dashboard.

The product is **eBay-only in scope right now.** Shopify code exists but is intentionally disabled
behind a `SHOPIFY_ENABLED` flag (kept as future scope, never deleted).

There are **two main pieces**:

1. **Web app** — a React/TypeScript SPA. Marketing landing page + an authenticated dashboard where
   sellers manage eBay listings, orders, billing, and integrations.
2. **Chrome extension** — a Manifest V3 extension that scrapes Amazon/Walmart/AliExpress product
   pages and auto-lists them to eBay through the web app's backend.

Both share the **same Supabase project** (`ojxzssooylmydystjvdo`).
Web app is deployed to **Vercel**; the extension is distributed via the **Chrome Web Store**.

---

## 2. Tech stack

- **Frontend:** React + TypeScript, Vite, shadcn/ui component library, Tailwind.
- **Backend:** Supabase — Postgres DB (with RLS), ~50 Edge Functions (Deno), Auth.
- **Billing:** Stripe (Checkout + Customer Portal + webhooks).
- **Extension:** Vanilla JS (Manifest V3). Only the supplier adapters + content-script injectors
  use small Vite bundles. Tests use Node's built-in `node:test` runner (no Jest/Vitest).
- **Hosting:** Vercel (web/marketing/admin), Chrome Web Store (extension).

---

## 3. Monorepo layout

```
apps/
  web/        — @sellersuit/web        React SPA, dashboard + marketing (port 3001)
  extension/  — @sellersuit/extension  Chrome extension (vanilla JS) — SOURCE OF TRUTH
  admin/      — @sellersuit/admin      separate operator/admin console (Vite SPA)
  marketing/  — @sellersuit/marketing  config-driven marketing site

packages/
  auth/             — AuthProvider, useAuth, ProtectedRoute
  api-client/       — Supabase client singleton (reads VITE_SUPABASE_* env)
  ui/               — shadcn/ui components
  types/            — shared TS types + generated Supabase Database types
  marketplace-core/ — shared listing/product logic
  config/, utils/   — shared config & utilities

supabase/
  functions/  — ~50 Edge Functions (Deno)
  migrations/ — sequential SQL migrations
```

Packages are aliased in Vite as `@repo/<name>` (e.g. `@repo/auth`, `@repo/ui`, `@repo/api-client`).

---

## 4. How the web app is structured

- Pure SPA. All routes live in `apps/web/src/App.tsx`.
- Route groups:
  - `/` — marketing landing page
  - `/auth`, `/signup`, `/verify-email` — unauthenticated auth flows
  - `/checkout`, `/payment-success`, `/payment-cancelled` — billing flow
  - `/dashboard/*` — main protected dashboard (wrapped in `DashboardLayout`)
  - `/dashboard/ebay/*` — eBay-specific sub-routes
  - `/admin/*` — redirects externally to `VITE_ADMIN_URL`
- **Auth:** `AuthProvider` (in `@repo/auth`) wraps the app. On first login it calls the
  `ensure-profile` Edge Function to create the user profile. `ProtectedRoute` gates dashboard routes;
  unauthenticated users go to `/auth`.
- **Supabase client** is a singleton at `@repo/api-client/supabase/client`. In dev it can read
  `SB_URL_OVERRIDE` / `SB_KEY_OVERRIDE` from localStorage.

---

## 5. How the Chrome extension works

- Manifest V3, mostly vanilla JS.
- Key files/roles:
  - `background/index.js` — service worker (alarms + message router)
  - `background/message-router.js` — single `chrome.runtime.onMessage` listener, routes all messages
  - `background/listing-runner.js` — orchestrates the eBay listing upload flow
  - `sidepanel/panel-main.js` — side-panel UI (single/all-variant import, advanced edit)
  - `common/ebay-listing-api.js` — `EbayListingApiHelper` + `SellerSuitUploader`; converts a
    product into an eBay payload and calls the eBay API
  - `suppliers/core/registry.js` — `SSSupplierRegistry`; maps URLs to adapters. **This is the plugin
    seam for adding new suppliers.**
  - `suppliers/amazon/adapter.js`, `suppliers/walmart/adapter.js` — supplier adapters
- **Supplier adapter contract** (in `suppliers/global.d.ts`): `supplierId`, `matchUrl(url)`,
  `scrapeProduct(opts)`, `scrapeVariants(opts)`, `normalize(raw)`. Adding a supplier = implement this
  contract + `SSSupplierRegistry.register(adapter)`. Nothing else changes.
- **Extension ↔ web app auth bridge:**
  1. User logs into dashboard → `DashboardLayout` fires `window.postMessage({ type: 'REFRESH_EXTENSION_TOKEN' })`
  2. `auth_sync.js` content script reads localStorage, forwards token via `chrome.runtime.sendMessage`
  3. Background stores token in `chrome.storage.local`, verifies it against the `auth-status` Edge Function
  4. Token is never trusted until the server returns 200.
- **Amazon has two scrapers:** v2 (`SsAmazonScraperV2`, data-first) runs first; v1
  (`SsAmazonVariantScraper`, click-based) is the fallback. **CAPTCHA errors always propagate — never
  silently retry v1 on CAPTCHA.**

---

## 6. Backend (Supabase Edge Functions)

All backend logic is in `supabase/functions/`, each a Deno module (most require JWT verification).
Important ones:

- `extension-bootstrap`, `extension-auth-config` — extension startup
- `extension-pairing-start` / `-approve`, `extension-token-redeem` — QR-code pairing flow
- `create-listing`, `sync-listing` — eBay listing create/update from extension data
- `generate-description`, `generate-titles` — AI content generation
- `create-checkout`, `customer-portal`, `stripe-webhook` — Stripe billing
- `check-subscription`, `check-subscription-v2` — plan gating
- `ensure-profile` — creates user profile on first login
- `queue-worker` — background job processing
- Shared code in `supabase/functions/_shared/`

---

## 7. Billing model

- Dynamic pricing (plans configured in DB, not hardcoded): **Trial $1, Starter, Pro**.
- Canonical plan numbers live in the DB (e.g. Pro = 5000 credits, Starter = 250 orders,
  Pro = 2 eBay accounts).
- Credits are deducted atomically via a DB RPC (`deduct_credits_atomic`).
- Billing detail is documented in `docs/BILLING.md`.

---

## 8. Important conventions & landmines (READ before editing)

- **Dual-copy problem:** `apps/extension/` is the source of truth. `apps/web/public/chrome_extension/`
  is a generated copy (via `prepare:dev` / `prepare:prod`). **Only edit `apps/extension/`; never edit
  the `public/chrome_extension/` copies directly.**
- **Manifest variants:** `manifest.json` = dev, `manifest.prod.json` = production. Prepare scripts swap
  them.
- **Config files:** extension has `common/config.js` (dev) and `common/config.prod.js` (prod).
- **eBay title limit = 80 chars.** `_enforceEbayTitle()` in `common/ebay-listing-api.js` truncates at
  word boundaries.
- **Two description generators exist:** `generate-description` v1 (used by injectors) and v2 (used by
  the side panel) — both are still wired. The live description config is the `description_config`
  table (edited via AdminDescriptionConfig). Titles use `admin_settings` keys `ext_title_prompt` /
  `ext_title_count` (via `generate-titles`).
- **Admin app is a Vite SPA (not Next.js).** RBAC is enforced **server-side** (Edge Functions / RLS),
  and the model was collapsed from `super_admin` down to a single `admin` role.

---

## 9. Commands

**Root (all workspaces):**
```bash
npm run dev            # start web dev server (port 3001)
npm run dev:admin      # start admin app
npm run build          # build marketing + web + admin
npm run typecheck      # tsc --noEmit for all apps
npm run lint           # eslint
npm run check:local    # env check + security scan + typecheck + lint + build (pre-release gate)
```

**Extension (from `apps/extension/`):**
```bash
npm test                    # all tests (node:test)
node --test tests/<file>    # single test file
npm run build               # build all bundles
npm run prepare:dev         # build + copy to dist/extension-dev/
npm run prepare:prod        # build + copy to dist/extension-prod/ (prod manifest)
npm run verify:prod         # Chrome Web Store sanity checks
```

**Env setup** — create `.env` / `.env.local` in the **repo root**:
```env
VITE_SUPABASE_URL=https://ojxzssooylmydystjvdo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

---

## 10. Current status (as of 2026-07)

- Extension is publish-ready.
- Billing runs on a **single path**: the Stripe webhook has historically been unreliable in prod, so
  subscription state self-heals on login via `check-subscription-v2`.
- Codebase is considered launch-grade; remaining gaps are mostly ops/deploy (setting prod secrets,
  redeploying certain edge functions) rather than code.

---

## 11. How to prompt an AI about this project (tips)

When you ask an AI for help, give it:
1. **This file** (once, at the start).
2. **Which part** you're touching: web app / extension / admin / marketing / edge function / DB migration.
3. **The exact file path** (e.g. `apps/extension/common/ebay-listing-api.js`).
4. **What you want:** a bug fix, a new feature, a review, a refactor, etc.
5. **Constraints** it must respect (e.g. "eBay-only, don't touch Shopify", "don't edit the
   public/chrome_extension copy", "keep the 80-char title limit").

**Good prompt template:**
> "In the SellerSuit **[web app / extension / admin / edge function]**, file **[path]**, I want to
> **[goal]**. Constraints: **[e.g. eBay-only scope, edit only apps/extension, keep tests passing]**.
> Show me the change and explain why."

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

SellerSuit is an eBay dropshipping toolkit with two main pieces:
1. **Web app** (`apps/web`) — React/TypeScript SPA: marketing site + authenticated dashboard for managing eBay listings, orders, billing, and integrations.
2. **Chrome extension** (`apps/extension`) — Manifest V3 extension that scrapes Amazon/Walmart product pages and auto-lists to eBay via the web app's Supabase backend.

The web app is deployed to Vercel (`vercel.json` at root). The extension is distributed via the Chrome Web Store. Both share the same Supabase project (`ojxzssooylmydystjvdo`).

---

## Monorepo Structure

```
apps/
  web/        — @sellersuit/web    (React SPA, port 3001)
  extension/  — @sellersuit/extension  (Chrome extension, vanilla JS)
  admin/      — @sellersuit/admin  (separate admin panel)
  marketing/  — @sellersuit/marketing

packages/
  auth/            — AuthProvider, useAuth hook, ProtectedRoute
  api-client/      — Supabase client singleton (reads VITE_SUPABASE_* env vars)
  ui/              — shadcn/ui component library
  types/           — shared TypeScript types + generated Supabase Database types
  marketplace-core/ — shared listing/product logic
  config/          — shared config
  utils/           — shared utilities

supabase/
  functions/  — ~50 Edge Functions (Deno)
  migrations/ — sequential SQL migrations
```

Packages are aliased in Vite as `@repo/<name>` (e.g. `@repo/auth`, `@repo/ui`, `@repo/api-client`).

---

## Commands

### Root (runs across all workspaces)
```bash
npm run dev            # starts apps/web dev server (port 3001)
npm run dev:web        # same
npm run dev:admin      # starts admin app
npm run build          # builds marketing + web + admin
npm run typecheck      # tsc --noEmit for all apps
npm run lint           # eslint across workspace
npm run check:local    # env check + security scan + typecheck + lint + build (pre-release gate)
```

### Web app only
```bash
npm --workspace @sellersuit/web run dev
npm --workspace @sellersuit/web run build
npm --workspace @sellersuit/web run typecheck
```

### Chrome extension
```bash
# From apps/extension/
npm test                           # run all tests (Node built-in test runner)
npm run test:watch                 # watch mode
node --test tests/pricing-engine.test.js   # run a single test file

npm run build                      # build all three bundles (main + amazon + walmart)
npm run prepare:dev                # build then copy to dist/extension-dev/
npm run prepare:prod               # build then copy to dist/extension-prod/ (prod manifest)
npm run verify:prod                # post-build sanity checks for Chrome Web Store
```

### Environment setup
Create `.env` (or `.env.local`) in the **repo root** (web app reads from `../../` via `envDir`):
```env
VITE_SUPABASE_URL=https://ojxzssooylmydystjvdo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

---

## Architecture: Web App

The web app is a pure SPA. All routes are defined in [`apps/web/src/App.tsx`](apps/web/src/App.tsx).

**Route structure:**
- `/` — marketing landing page
- `/auth`, `/register`, `/verify-email` — unauthenticated auth flows
- `/dashboard/*` — main protected dashboard (wrapped in `DashboardLayout`)
- `/dashboard/ebay/*` — eBay-specific sub-routes (`EbayRoutes`)
- `/dashboard/shopify/*` — Shopify integration sub-routes (`ShopifyRoutes`)
- `/admin/*` — redirects externally to `VITE_ADMIN_URL`

**Auth flow:** `AuthProvider` (in `@repo/auth`) wraps the whole app. It calls the `ensure-profile` Edge Function on first login to create/hydrate the user profile. `ProtectedRoute` gates all dashboard routes — unauthenticated users are redirected to `/auth`.

The Supabase client is a singleton at `@repo/api-client/supabase/client`. In dev mode it reads `SB_URL_OVERRIDE`/`SB_KEY_OVERRIDE` from localStorage as escape hatches.

---

## Architecture: Chrome Extension

The extension is Manifest V3. Its code is **vanilla JS** (no bundler for most files; three small Vite bundles handle the supplier adapters and content-script injectors).

**Key roles:**
- `background/index.js` — service worker; registers alarm handlers and the message router
- `background/message-router.js` — single `chrome.runtime.onMessage` listener; routes all inter-component messages
- `background/listing-runner.js` — orchestrates the eBay listing upload flow
- `sidepanel/panel-main.js` — side-panel UI logic (single/all-variant import, advanced edit)
- `common/ebay-listing-api.js` — `EbayListingApiHelper` + `SellerSuitUploader`; product→eBay payload conversion, API calls to eBay
- `common/panel-extended.js` — supplier-agnostic rendering helpers for the panel (reads from `chrome.storage.local`)
- `suppliers/core/registry.js` — `SSSupplierRegistry`; maps URLs to adapters; **the plugin seam for adding new suppliers**
- `suppliers/amazon/adapter.js` — Amazon adapter: tries v2 scraper first, falls back to v1
- `suppliers/walmart/adapter.js` — Walmart adapter

**Supplier adapter contract** (defined in `suppliers/global.d.ts`):
- `supplierId: string`
- `matchUrl(url): boolean`
- `scrapeProduct(opts): Promise<RawProduct>`
- `scrapeVariants(opts): Promise<RawProduct>`
- `normalize(raw): UniversalProduct`

Adding a new supplier = implement this contract and call `SSSupplierRegistry.register(adapter)`. Nothing else changes.

**Extension ↔ web app auth bridge:**
1. User logs into web dashboard (`DashboardLayout` fires `window.postMessage({ type: 'REFRESH_EXTENSION_TOKEN' })`)
2. `auth_sync.js` content script (running in dashboard page context) reads `localStorage` and forwards token via `chrome.runtime.sendMessage`
3. Background service worker stores token in `chrome.storage.local`, then verifies it against the `auth-status` Edge Function
4. Token is never trusted until the server returns 200

**Extension build outputs:**
- `dist/extension-dev/` — dev build (points to `https://sellersuit.com` but includes `localhost` permissions)
- `dist/extension-prod/` — production build (only prod manifest, no localhost)
- The built extension is also copied to `apps/web/public/chrome_extension/` so the web app can serve it for the "Extension Viewer" page

---

## Architecture: Supabase Edge Functions

All backend logic lives in `supabase/functions/`. Each function is a Deno module. Most require JWT verification (configured in `supabase/config.toml`).

Key functions:
- `extension-bootstrap` / `extension-auth-config` — called by extension on startup
- `extension-pairing-start` / `extension-pairing-approve` / `extension-token-redeem` — QR-code pairing flow
- `create-listing` / `sync-listing` — eBay listing create/update from extension data
- `generate-description` / `generate-titles` — AI content generation
- `create-checkout` / `customer-portal` / `stripe-webhook` — Stripe billing
- `check-subscription` / `check-subscription-v2` — plan gating
- `ensure-profile` — creates user profile on first login
- `queue-worker` — background job processing
- Shared code lives in `supabase/functions/_shared/`

---

## Extension Tests

Tests use Node's built-in `node:test` runner (no Jest/Vitest). Test files import browser globals via `tests/helpers/load-global.js` which creates a synthetic `window` and loads extension scripts into it with `loadInto(win, 'path/to/file.js')`.

Run a single test:
```bash
cd apps/extension
node --test tests/pricing-engine.test.js
```

---

## Engineering Skills (Auto-Applied)

Skills from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) are installed in `.claude/skills/agent-skills/`. Apply them based on the task at hand:

| Task context | Skill to apply |
|---|---|
| Defining something new | `spec-driven-development` |
| Breaking work into tasks | `planning-and-task-breakdown` |
| Implementing a feature | `incremental-implementation` + `test-driven-development` |
| Working on panel UI or React components | `frontend-ui-engineering` |
| Adding/changing a Supabase Edge Function or API | `api-and-interface-design` |
| Debugging a failure | `debugging-and-error-recovery` |
| Before any merge | `code-review-and-quality` |
| Simplifying overly complex code | `code-simplification` |
| Security review | `security-and-hardening` |
| Performance investigation | `performance-optimization` |
| Shipping / release prep | `shipping-and-launch` |
| CI/CD changes | `ci-cd-and-automation` |
| Removing or migrating old code | `deprecation-and-migration` |

**Slash commands** (invoke a skill directly):
- `/spec` — write a spec before coding
- `/plan` — break work into ordered tasks
- `/build` — implement + test incrementally
- `/test` — write or fix tests
- `/review` — five-axis code review
- `/code-simplify` — cut unnecessary complexity
- `/ship` — pre-release checklist

---

## Key Conventions

- **Dual-copy problem:** `apps/extension/` is the source of truth. `apps/web/public/chrome_extension/` is a copy generated by `prepare:dev`/`prepare:prod`. Edit only in `apps/extension/`; never edit the `public/chrome_extension/` copies directly.
- **Manifest variants:** `manifest.json` = dev, `manifest.prod.json` = production. The prepare scripts swap these during build.
- **Config files:** Extension has `common/config.js` (dev) and `common/config.prod.js` (prod). The prepare scripts handle switching.
- **eBay title limit:** 80 characters. `_enforceEbayTitle()` in `common/ebay-listing-api.js` truncates at word boundaries.
- **Scraper v1/v2:** Amazon has two scrapers. v2 (`SsAmazonScraperV2`) is data-first and runs first; v1 (`SsAmazonVariantScraper`) is the click-based fallback. CAPTCHA errors always propagate — never silently retry v1 on CAPTCHA.

# SellerSuit Project Workflow Context

Use this document as the handoff context for ChatGPT or any other coding agent before answering questions, writing prompts, planning work, or editing code in this repository.

## First Rule: eBay Only

SellerSuit is currently an eBay-only SaaS.

Active scope:
- eBay listing creation and sync
- eBay orders and order sync
- eBay SKU, variation, pricing, item specifics, images, and listing templates
- Chrome extension for supplier product import
- Supplier import from Amazon, Walmart, AliExpress, and compatible supplier adapters into normalized product data for eBay listing workflows
- User dashboard for eBay workflows
- Admin panel for users, plans, credits, limits, and eBay-related operations
- Billing, subscriptions, credits, limits, and plan gating
- Supabase backend, database, Edge Functions, queues, and worker jobs supporting the eBay workflow

Shopify exists in the repository but is intentionally disabled and is future scope only.

Do not plan Shopify improvements, expose Shopify UI, write Shopify roadmap items, or treat Shopify as active. Do not delete Shopify code, tables, or migrations. Only touch Shopify code if it breaks the active eBay build or runtime, and then make the smallest possible fix.

## What This Product Does

SellerSuit helps eBay dropshippers import supplier products, calculate pricing, generate listing content, publish listings to eBay, monitor listings/orders, and manage subscription-based access.

The main user flow is:

1. User signs up or logs in to the SellerSuit web app.
2. User connects or authenticates the Chrome extension.
3. User visits a supplier page such as Amazon, Walmart, or AliExpress.
4. Extension scrapes product data and variants.
5. Extension normalizes supplier data into SellerSuit's universal product/listing shape.
6. User edits title, description, images, price, quantity, SKU, specifics, and variation data.
7. Pricing logic applies supplier-specific rules and eBay profitability constraints.
8. Extension or web app sends listing data to Supabase Edge Functions.
9. Backend validates auth, plan limits, credits, and eBay payload rules.
10. Backend creates or syncs the eBay listing.
11. Dashboard shows listings, orders, billing status, alerts, and settings.

## Repository Layout

Root workspace: `D:\eBay Software\2026sellersuit\sb1`

Main apps:
- `apps/web` - React/TypeScript SPA for auth, dashboard, billing, eBay workflows, and extension viewer.
- `apps/extension` - Manifest V3 Chrome extension. This is the source of truth for extension code.
- `apps/admin` - Admin panel for operational controls.
- `apps/marketing` - Marketing site.

Shared packages:
- `packages/api-client` - Supabase client singleton and API access helpers.
- `packages/auth` - AuthProvider, useAuth, ProtectedRoute, profile hydration.
- `packages/config` - Shared config, including marketplace scope flags.
- `packages/marketplace-core` - Shared listing/product/pricing marketplace logic.
- `packages/types` - Shared TypeScript and generated database types.
- `packages/ui` - Shared shadcn/Radix UI components and feedback components.
- `packages/utils` - Shared utilities.

Backend:
- `supabase/functions` - Deno Edge Functions.
- `supabase/functions/_shared` - Shared backend helpers.
- `supabase/migrations` - Sequential SQL migrations.
- `supabase/config.toml` - Function auth/JWT behavior and project config.

Important docs:
- `AI_AGENT_SCOPE_EBAY_ONLY.md` - highest-priority product scope.
- `AGENTS.md` - coding-agent rules for this repo.
- `CLAUDE.md` - architecture, commands, and development conventions.

## Web App Workflow

Primary route file:
- `apps/web/src/App.tsx`

The active user workspace is:
- `/dashboard/ebay/*`

Important eBay dashboard routes:
- `/dashboard/ebay` and `/dashboard/ebay/overview` - dashboard overview
- `/dashboard/ebay/listings` - listing management
- `/dashboard/ebay/listings/new` - create listing
- `/dashboard/ebay/bulk-lister` - bulk listing workflow
- `/dashboard/ebay/orders` - eBay orders
- `/dashboard/ebay/auto-orders` - automatic order workflow
- `/dashboard/ebay/product-research` - eBay product research
- `/dashboard/ebay/must-sell` - must-sell products
- `/dashboard/ebay/profitable-products` - profitable products
- `/dashboard/ebay/calculator` - eBay profit calculator
- `/dashboard/ebay/supplier-pricing` - supplier-wise pricing rules
- `/dashboard/ebay/extension` - extension connection page
- `/dashboard/ebay/alerts` - alerts
- `/dashboard/ebay/subscription` and `/dashboard/ebay/billing` - subscription/billing
- `/dashboard/ebay/settings` - settings
- `/dashboard/ebay/templates` - listing templates

Legacy generic dashboard routes redirect into `/dashboard/ebay/*` to avoid split dashboard behavior.

Auth routes:
- `/auth`
- `/auth/callback`
- `/signup`
- `/verify-email`

Billing routes:
- `/checkout`
- `/choose-plan`
- `/payment-success`
- `/payment-cancelled`

Admin route:
- `/admin/*` redirects to `VITE_ADMIN_URL` or `https://admin.sellersuit.com`.

Marketing pages generally redirect to `VITE_MARKETING_URL` or `https://sellersuit.com`.

Shopify routes are imported but gated by `SHOPIFY_ENABLED`. When disabled, Shopify routes redirect to `/dashboard/ebay`.

## Chrome Extension Workflow

Extension source of truth:
- `apps/extension`

Do not edit generated extension copies under:
- `apps/web/public/chrome_extension`

Important extension areas:
- `background/index.js` - service worker entry.
- `background/message-router.js` - central message router.
- `background/listing-runner.js` - orchestrates listing upload flow.
- `sidepanel/panel-main.js` - side panel UI workflow.
- `common/ebay-listing-api.js` - eBay listing payload conversion and upload helpers.
- `common/panel-extended.js` - supplier-agnostic panel rendering helpers.
- `suppliers/core/registry.js` - supplier adapter registry.
- `suppliers/amazon/adapter.js` - Amazon adapter.
- `suppliers/walmart/adapter.js` - Walmart adapter.
- `suppliers/aliexpress` or related AliExpress files - AliExpress adapter and manifest/domain support.
- `tests` - Node built-in test runner tests.

Supplier adapter contract:
- `supplierId`
- `matchUrl(url)`
- `scrapeProduct(opts)`
- `scrapeVariants(opts)`
- `normalize(raw)`

Extension auth bridge:
1. User logs into dashboard.
2. Dashboard sends token refresh message to the page.
3. `auth_sync.js` content script reads web auth state and forwards it to the extension.
4. Background service worker stores token in `chrome.storage.local`.
5. Extension verifies auth with the `auth-status` Edge Function.
6. Listing actions use extension-compatible backend endpoints and custom token flows.

Extension build outputs:
- `dist/extension-dev` - local/dev build.
- `dist/extension-prod` - production Chrome Web Store build.

## Backend And Supabase Workflow

Supabase project id:
- `ojxzssooylmydystjvdo`

Function groups:
- Auth/profile: `ensure-profile`, `auth-status`, `auth-otp`
- Extension auth/config/pairing: `extension-bootstrap`, `extension-auth-config`, `extension-config`, `extension-pairing-start`, `extension-pairing-approve`, `extension-pairing-status`, `extension-token-redeem`, `extension-token-refresh`, `extension-logout`, `extension-activity`, `extension-device-revoke`
- Listing: `create-listing`, `sync-listing`, `get-listings`, `match-listing`
- Orders: `ebay-orders`, `sync-ebay-orders`, `orders-dashboard`, `create-auto-order`
- AI: `generate-titles`, `generate-description`, `generate-description-v2`, `ai-image-edit`, `ai-product-research`
- Pricing: `pricing-settings`, `pricing-rules-sync`, `pricing-preview`, `pricing-verify`, `get-calculator-settings`
- Billing: `create-checkout`, `customer-portal`, `stripe-webhook`, `check-subscription-v2`, `validate-coupon`, `reconcile-subscriptions`
- Admin: `admin-adjust-credits`, `admin-plan-config`, `admin-sync-stripe-plans`, user/admin functions
- Worker/notifications: `queue-worker`, `send-inventory-notification`, `amazon-inventory-sync`

JWT behavior:
- Browser/user JWT endpoints usually have `verify_jwt = true`.
- Stripe webhook has `verify_jwt = false` because Stripe signs requests.
- Internal worker/cron endpoints have `verify_jwt = false` but must enforce secrets or service-role checks in handlers.
- Extension custom-token endpoints often have `verify_jwt = false` because Supabase platform JWT verification would reject extension session tokens; handlers must verify extension auth themselves.

## Billing And Limits

Billing is Stripe-backed.

Relevant functions:
- `create-checkout`
- `customer-portal`
- `stripe-webhook`
- `check-subscription-v2`
- `validate-coupon`
- `admin-plan-config`
- `admin-sync-stripe-plans`
- `reconcile-subscriptions`

When changing billing, always consider:
- plan entitlement checks
- credit/limit accounting
- idempotent webhook handling
- user profile/subscription synchronization
- admin controls
- local verification before production work

## Marketplace Scope Flag

Single source of truth:
- `packages/config/src/marketplaceScope.ts`

Current flags:
- eBay enabled: true
- Shopify enabled: false

Use feature flags/gates rather than deleting dormant marketplace code.

## Local Development Commands

Root commands:

```bash
npm run dev
npm run dev:web
npm run dev:admin
npm run dev:extension
npm run dev:local
npm run typecheck
npm run lint
npm run build
npm run check:local
npm run qa:local
```

Extension commands:

```bash
cd apps/extension
npm test
npm run build
npm run prepare:dev
npm run prepare:prod
npm run verify:prod
```

Release-related commands:

```bash
npm run qa:local
npm run prepare:extension:dev
npm run prepare:extension:prod
npm run release:extension
npm run release:ready
```

Important gate:
- Local/dev verification must pass before preparing production artifacts.
- For extension work, build and load `apps/extension/dist/extension-dev` first.

## Testing And Verification Expectations

Before finishing code changes:
- Run `npm run typecheck`.
- Run relevant tests for touched code.
- For extension changes, run from `apps/extension`: `npm test`, `npm run build`, and relevant verify scripts.
- For release prep, run `npm run qa:local`.
- For web UI changes, preview locally and verify with browser tooling rather than asking the user to manually check.

If tests fail, report the exact failing command and the important output.

## Common Work Categories And Best Agent To Use

Use these when asking ChatGPT to generate prompts for other agents:

- Product scoping or prioritization: Product Manager, Sprint Prioritizer
- Codebase exploration: Codebase Onboarding Engineer
- Architecture changes: Software Architect, Backend Architect
- Supabase, Edge Functions, database, RLS, migrations: Backend Architect, Database Optimizer, Security Architect
- React dashboard UI: Frontend Developer, UI Designer, UX Architect, Accessibility Auditor
- Chrome extension: Minimal Change Engineer, Frontend Developer, API Tester
- Pricing logic: Pricing Analyst, Backend Architect, API Tester
- Supplier scraping/import: Supply Chain Strategist, Data Engineer, API Tester
- Billing/Stripe: Backend Architect, Compliance Auditor, Application Security Engineer
- Security review: Application Security Engineer, Security Architect, Data Privacy Officer
- Test planning and verification: API Tester, Evidence Collector, Reality Checker, Test Results Analyzer
- Deployment and release: DevOps Automator, SRE, Reality Checker
- Documentation: Technical Writer
- Marketing site/content/SEO: SEO Specialist, Content Creator, Brand Guardian

## Prompt Template For Another Agent

Use this template when asking ChatGPT to create a task prompt:

```text
You are working in the SellerSuit repository at D:\eBay Software\2026sellersuit\sb1.

Read and obey:
- AI_AGENT_SCOPE_EBAY_ONLY.md
- AGENTS.md
- CLAUDE.md
- CHATGPT_PROJECT_WORKFLOW.md

Product scope:
- SellerSuit is currently eBay-only.
- Shopify exists in the repository but is intentionally disabled and future scope only.
- Do not plan, improve, expose, or modify Shopify unless required to fix an active eBay build/runtime issue.

Task:
[Describe the task here.]

Relevant area:
[apps/web, apps/extension, apps/admin, packages/*, supabase/functions, supabase/migrations, etc.]

Expected output:
[Code change, analysis, test plan, review findings, implementation plan, etc.]

Verification:
- Prefer local/dev verification.
- Run relevant tests for touched code.
- For extension changes, edit apps/extension only and build dist/extension-dev first.
- Report any skipped or failing checks.
```

## Prompt Template For Code Review

```text
Review this SellerSuit change as an eBay-only SaaS code review.

Prioritize:
1. Bugs or behavior regressions.
2. Security/auth/data-access risks.
3. Billing, credits, plan-limit, or entitlement mistakes.
4. Extension-to-backend contract breaks.
5. Missing tests or weak verification.

Rules:
- Keep Shopify out of active scope.
- Do not suggest deleting Shopify code or migrations.
- Reference exact files/lines when possible.
- Findings first, ordered by severity.
```

## Prompt Template For Implementation

```text
Implement this SellerSuit task with a minimal, repo-consistent diff:

[Task details]

Constraints:
- eBay-only active product scope.
- Do not edit generated extension copy under apps/web/public/chrome_extension.
- Match existing code patterns.
- Keep changes local-first and verifiable.
- Add or update focused tests when behavior changes.

After implementation:
- Run the smallest relevant verification command.
- If broad impact, also run npm run typecheck and relevant build/test commands.
```

## High-Risk Areas

Be extra careful around:
- Auth token exchange between web app, extension, and Supabase functions.
- Any endpoint with `verify_jwt = false`.
- Stripe webhooks and subscription/credit updates.
- eBay listing payload conversion, especially variations, SKUs, prices, images, and item specifics.
- Supplier scraping selectors and normalization.
- Generated extension copies.
- Marketplace scope flags and Shopify hiding behavior.
- Migrations and RLS policies.
- Admin functions and role checks.

## Short Mental Model

SellerSuit is an eBay-focused dropshipping workflow:

Supplier page -> Chrome extension scrape -> normalized product -> pricing/title/description/images -> Supabase validation and entitlement checks -> eBay listing/order APIs -> dashboard/admin/billing visibility.

Every answer, plan, prompt, or code change should preserve that eBay-only model unless the owner explicitly says: "Enable Shopify now."

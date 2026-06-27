# PRODUCT_MODEL.md — SellerSuit, end to end

> Built by reading the real code: `apps/web` routes, `apps/extension`, all ~59 Edge Functions, ~85 migrations, and the generated `Database` types (`packages/types/src/supabase.ts`). Stack reported as found, nothing assumed. This supersedes an earlier lighter draft — it corrects a few assumptions (e.g. workspaces are *not* live multi-tenant) and adds the operational realities the rebuild hinges on.
> Date: 2026-06-17.

---

## 1. What the product actually is

**SellerSuit is an eBay dropshipping automation toolkit.** A seller lists products sourced from **Amazon/Walmart** onto **eBay**, and the system keeps price/stock in sync and tracks orders. The differentiator is a **Manifest V3 Chrome extension** that drives eBay through the seller's own logged-in browser session (scrapes Seller Hub, posts listings *as the user*) instead of the official eBay API — so "eBay integration" is really **browser automation on the user's machine**, not a server-to-server API. This shapes everything: reliability depends on the user's live cookies/CSRF, and the most common failure class is a stale eBay session.

Surfaces, one Supabase backend (`ojxzssooylmydystjvdo`):
- **Web app** (`apps/web`, React SPA) — auth + seller dashboard.
- **Chrome extension** (`apps/extension`, vanilla JS) — scrapes suppliers, lists to eBay, syncs orders.
- **Admin** (`apps/admin`) + **Marketing** (`apps/marketing`) siblings. **Shopify is future scope**, gated off by `SHOPIFY_ENABLED`.

---

## 2. Core user-facing workflows (`apps/web/src/App.tsx` → `EbayRoutes`)

| Workflow | Route | What it does | Backend |
|---|---|---|---|
| Dashboard / overview | `/dashboard/ebay` | KPIs: active listings, inventory value, orders, revenue, sync status | `dashboard-overview`, `get_ebay_user_dashboard_stats` |
| Listings | `/listings` | Manage the seller's eBay listings (price/stock/sync per row) | `get-listings`, `list_user_listings` |
| New Listing | `/listings/new` | Create one eBay listing from a supplier product | `create-listing`, `create_listing_with_variations` |
| Bulk Lister | `/bulk-lister` | Queue many products; extension drains the queue, reusing the single-item pipeline | `bulk_job_items` |
| Variations | (in listing) | Multi-variant listings | `listing_variations`, `create_listing_with_variations` |
| eBay Orders | `/orders` | Synced sold orders, financials, buyer/shipping | `ebay-orders`, `sync-ebay-orders`, `orders-dashboard` |
| Auto-Orders (auto-fulfillment) | `/auto-orders` | Auto-buy the Amazon/Walmart item for an eBay sale | `create-auto-order`, `auto_orders` — **DISABLED** (§6) |
| Product Research | `/product-research` | AI product discovery | `ai-product-research` |
| Curated content | `/best-selling`, `/must-sell`, `/profitable-products` | Operator-curated lists shown to users | `best_selling_items`, `must_sell_items`, `profitable_products` |
| Calculator | `/calculator` | Pricing/profit rules & defaults | `calculator_settings`, `get-calculator-settings` |
| Alerts | `/alerts` | Inventory/price alerts | `inventory_alerts`, `send-inventory-notification` |
| Extension Connect | `/extension` | Pair the extension (QR/code) | pairing functions |
| Subscription / Billing | `/subscription` | Plan, credits, Stripe portal | `check-subscription-v2`, `customer-portal` |
| Settings | `/settings` | Account, AI, Google Sheets, WhatsApp, developer/API | various |

**AI assists** throughout: `generate-titles`, `generate-description(-v2)`, `ai-image-edit`, `ai-product-research`. **Aux integrations:** Google Sheets export (`google_sheets_sync`), WhatsApp (`whatsapp-config`).

---

## 3. Domain model (entities, lifecycle, relationships)

~60 tables across bounded contexts. **★ = used by code but missing from generated `Database` types (schema drift → forces `(supabase as any)`).**

### 3.1 Identity, tenancy & billing
`profiles` (user record: credits, plan_id, is_active, account_status, subscription_status, customer_id, default_workspace_id, settings.goal — billing columns trigger-guarded) · `user_roles` (`user|admin|super_admin`; legacy `moderator/staff` treated admin-like) · `workspaces`/`workspace_members`/`seller_profiles` (**one default workspace per user today — multi-tenant is *latent*, `backfill_default_workspaces`, not a live feature**) · `plans`/`plan_prices`/`plan_features` (Trial $1 → Starter → Pro; reconciled to Stripe via `admin-sync-stripe-plans`) · `user_plans` (active instance: status, current_period_end, `admin_override_limits` JSON, credits_used) · `subscriptions` (Stripe mirror) · `checkout_sessions` · `coupons`/`coupon_usages` (`validate-coupon`) · `credit_transactions` (**append-only ledger; AFTER INSERT trigger recomputes `profiles.credits` — single source of truth**) · `feature_entitlements`/`feature_overrides`/`user_feature_overrides ★` · `usage_logs` · `stripe_events ★` (idempotency).

**Billing lifecycle:** signup → `/choose-plan` → `/checkout` (`create-checkout`) → Stripe → `stripe-webhook` (`checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_{succeeded,failed,paid}`) → `user_plans` + ledger grant. Nightly `reconcile-subscriptions` cron repairs drift. **Trial is a one-time $1 charge** (no Stripe subscription to cancel), so expiry is detected by `check-subscription-v2`, not profile flags alone.

### 3.2 Catalog & listings
`listings` (amazon/ebay price, stock, status, sync_error, has_variations, auto_order_enabled, pricing_rule JSON, `*_source` provenance) · `listing_variations` (per-variant SKU/price/stock/attributes) · `publishing_destinations` (marketplace seam) · `best_selling_items`/`must_sell_items`/`profitable_products`/`profitable_product_images` (operator-curated).

**Listing lifecycle:** supplier scrape (extension) → draft → `create-listing`/`create_listing_with_variations` (deducts credits via `create_listing_credit_deduction`) → extension posts to eBay → `ebay_item_id` set, status `active` → periodic checks update `inventory_status`/`price_*` → `sync_error` on failure.

### 3.3 Orders & fulfillment
`ebay_orders` (financials, buyer, shipping, line_items, `deleted_at` soft-delete — **known issue: ~3× duplicate import rows; revenue must dedup by `(ebay_order_id, total_amount)`; no `revenue` column, use `total_amount`**) · `order_enrichments`/`order_transactions` · `auto_orders` (asin, costs, profit, risk_score, status — **feature disabled**).

**Order lifecycle:** extension scrapes Seller Hub CSV → `sync-ebay-orders` upserts → (if enabled) `create-auto-order` places supplier purchase → `auto_orders` tracks.

### 3.4 Suppliers & sync
`amazon_settings` (**API keys in a DB row — see Risks**) · `ebay_connections` · `inventory_alerts`/`inventory_sync_logs`/`ebay_sync_logs ★` (sync history + error categories: `ebay_session`, `csrf_token`, `extension_dependency`, `csv_parser`, …).

### 3.5 Jobs & queues — **three parallel systems (fragmentation)**
`background_jobs ★` (generic server queue drained by `queue-worker`: claim/lock/attempts/run_after) · `extension_jobs` (work pushed to the extension) · `bulk_job_items` (bulk-lister rows). **No unified queue abstraction — three tables, three status vocabularies, no monitor.**

### 3.6 Extension auth & telemetry
`extension_devices`/`extension_sessions`/`extension_session_grants`/`extension_session_refresh_tokens`/`extension_pairing_codes` (device pairing + opaque `ssat_…` tokens, hashed at rest, server-verified, never trusted until 200) · `extension_activity_logs`/`extension_error_logs`/`extension_migrations`/`app_feature_flags` (telemetry + remote flags).

### 3.7 Ops, config & content
`admin_settings` (global KV: sync window, kill switches) · `admin_alerts ★`/`admin_audit_logs ★`/`audit_logs` (**immutable** — UPDATE/DELETE blocked by triggers in `admin_spine`) · `support_notes` (`add_admin_support_note`) · `notices`/`notification_logs`/`notification_settings` · `prompts`/`description_config`/`calculator_settings` (runtime-tuned) · `blog_posts`/`blog_generation_settings` (per-user affiliate blog *and* marketing CMS) · `function_rate_limits`/`auth_codes` · `store_designs`/`shopify_page_settings`/`vero_brands` (Shopify future scope + brand restrictions).

---

## 4. Integrations & external dependencies

| Dependency | How used | Notes |
|---|---|---|
| **eBay** | Browser automation via extension (scrape Seller Hub, post listings) — *not* the official API | Fragile: depends on user's live cookies/CSRF; failures categorized in `ebay_sync_logs`. |
| **Amazon / Walmart** | Supplier scraping (extension adapters); Amazon API config in `amazon_settings` | Walmart adapter exists; no Walmart admin surface. |
| **Stripe** | Checkout, subscriptions, customer portal, webhooks | `stripe-webhook` (idempotent via `stripe_events`), `reconcile-subscriptions` cron, `admin-sync-stripe-plans`. |
| **Supabase** | Postgres + Auth + ~59 Edge Functions (Deno) + Storage (listing/blog buckets) | One project for web + extension + admin. |
| **AI providers** (Lovable AI Gateway / OpenAI / Gemini) | Titles/descriptions/research/image edit | `test-api-key`, `test-ai-generation`. |
| **Google Sheets / WhatsApp / Cloudflare Turnstile / Vercel** | Export / notify / signup captcha / hosting | — |

---

## 5. Actors

| Actor | Identity | Powers |
|---|---|---|
| **End user (seller)** | auth user + `profiles`, role `user` | Web dashboard + extension on their browser. Cannot touch billing columns (trigger-guarded). |
| **The extension** | Device + `ssat_…` session token | Acts *as the user* on eBay/suppliers; server-verified, never trusted blind. |
| **System jobs** | `service_role` / `INTERNAL_FUNCTION_SECRET` | `queue-worker`, `sync-ebay-orders`, `reconcile-subscriptions` (cron), webhooks. |
| **Support / Admin** | role `admin` | Day-to-day support: user lookup, verify email, support notes, modest credits. |
| **Founder / Super-admin** | role `super_admin` | Dangerous ops: roles, plan/user deletion, kill switches, limit overrides. **Note: current admin RPCs gate on `has_role('admin')` only — not super_admin (Risk).** |

---

## 6. Where it breaks today / what's done by hand

1. **Auto-fulfillment is OFF.** `ebay_sync_enabled=false`, `ebay_sync_settings.enabled=false`, plus global `global_auto_fulfillment_enabled` kill switch (`seed_kill_switch`). Any admin "orders/fulfillment" tooling must reflect a dormant feature.
2. **Schema/type drift.** `background_jobs`, `ebay_sync_logs`, `user_feature_overrides`, `admin_audit_logs`, `admin_alerts`, `stripe_events` are used by code but **absent from generated types** → `(supabase as any)` everywhere, zero compile-time safety in admin.
3. **Three disjoint job systems** (`background_jobs`, `extension_jobs`, `bulk_job_items`) — no unified status model or monitor; stuck jobs diagnosed by hand in SQL.
4. **Duplicate order rows.** `ebay_orders` carries ~3× re-import duplicates; every revenue calc must dedup — a latent correctness trap.
5. **The admin RPC layer is already rich, but the UI under-uses it.** Migration phases 6–10 + `admin_spine` ship `search_ebay_users_admin`, `get_ebay_admin_stats`, `get_ebay_user_dashboard_stats_admin`, `adjust_user_credits_admin`, `update_user_plan_admin`, `extend_user_subscription_admin`, `update_user_limits_admin`, `get_ebay_feature_controls_admin`, `search_admin_audit_logs`, `add_admin_support_note`, sensitive-reveal, etc. **The gap is frontend** — surfaced inconsistently or via orphaned pages (`AdminCoupons/Credits/Payments`). **This rebuild is a frontend + scope problem, not a backend one.**
6. **Secrets in a DB row.** `amazon_settings` stores API credentials in a panel-readable table — should be Supabase secrets / reveal-gated.
7. **Stripe drift handled invisibly.** `reconcile-subscriptions` runs nightly; operators have no UI to inspect a failed webhook or trigger reconciliation.
8. **Faked admin identity.** Admin chrome hardcodes "Admin User / Super Admin", no Sign Out — operators can't see who's acting (audit attribution still works via `auth.uid()`).
9. **Workspaces are vestigial in the UI.** A default workspace exists per user; the admin "Workspaces" manager is pure mock for a feature that isn't live.

---

## 7. One-paragraph mental model

> A seller pairs a **Chrome extension** that automates their eBay account; they **source from Amazon/Walmart**, create **listings** (with **variations**) the extension posts to eBay, and the system **syncs stock/price** and **orders** back. Billing is **Stripe** (Trial→Starter→Pro) reconciled into a **credit ledger** and **user_plans**. Work flows through **three job queues** and ~59 **edge functions**. A **fairly complete admin RPC layer already exists** in Postgres (immutable audit, user search, credit/plan/limit mutations, feature kill-switches) — but the **admin UI is half-wired**, so operators still drop to SQL.

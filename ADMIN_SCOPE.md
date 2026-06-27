# ADMIN_SCOPE.md — What the SellerSuit admin panel is (and isn't) for

> Companion to [`PRODUCT_MODEL.md`](PRODUCT_MODEL.md) and the structural audit in [`ADMIN_AUDIT.md`](ADMIN_AUDIT.md). This is an **opinionated decision doc**: what belongs in the operator console, what doesn't, the right config mechanism for each thing, and the guardrails. Decisions are mine to defend. (Supersedes an earlier lighter draft.)

## Governing principle

> **The admin panel is an *operator console*, not a second product.** Its job is to let a small team **support users, control billing, observe the system, and pull emergency levers** — fast, safely, and with an audit trail. It is **not** a place to re-implement the seller's own workflows. Wherever we'd duplicate a user-facing feature in admin, the answer is **impersonate / link out**, not rebuild.

Three facts from the code drive every call below:
1. **The backend is ahead of the frontend.** A rich admin RPC layer already exists (`search_ebay_users_admin`, `get_ebay_user_dashboard_stats_admin`, credit/plan/limit mutations, immutable audit, feature kill-switches). Scope work is mostly *surfacing it well* — not building new capability.
2. **eBay is browser automation, not an API.** Admin can't write to eBay server-side. So listing/order *management* genuinely lives with the user + extension; admin's role is **observe + support + flag**.
3. **Auto-fulfillment is off and workspaces aren't a real feature.** Don't build operator tooling for dormant/latent capabilities.

---

## Part A — IN scope (with the exact capabilities warranted)

Capabilities use a deliberate verb set: **View · Edit · Override · Impersonate · Comp/Refund · Retry · Re-scrape · Flag · Suspend · Delete**. Each entity gets *only* the verbs it earns.

### 1. User 360 / support console — **the heart of the panel**
*Why:* every ticket starts with "look up this user." The RPCs already exist (`search_ebay_users_admin`, `get_ebay_user_dashboard_stats_admin`, `get_ebay_user_admin_summary`, `add_admin_support_note`).
- **View** full profile on one screen: plan, credits (+ledger), subscription/Stripe status, listings count, orders/revenue, sync health, devices, recent audit.
- **Impersonate (read-only "view as user")** — reproduce the user's dashboard via the stats RPC. *Not* a full session takeover. Gated + audited.
- **Edit (limited):** verify email, edit display name. **Override:** plan limits (`update_user_limits_admin`), per-user feature flags (`user_feature_overrides`).
- **Comp:** adjust credits (`adjust_user_credits_admin`, reason mandatory), extend subscription (`extend_user_subscription_admin`), change plan (`update_user_plan_admin`).
- **Suspend / reactivate** (`toggle_user_status_admin`); **Delete** user (`admin-delete-user`) — **super-admin only**.
- **Support notes** timeline (`support_notes`).
- ❌ Not in: editing the user's listings/orders directly → **Impersonate** instead.

### 2. Billing & revenue controls — **reconcile with Stripe, don't become Stripe**
- **Plans / Prices / Features** — **View + Edit** as runtime config; price-of-record stays Stripe; edits round-trip via `admin-sync-stripe-plans` (editing without sync is a footgun → sync is part of the flow). Full create allowed *because the sync makes it safe* — this is more than the prior draft's "params only."
- **Subscriptions** — **View** real `subscriptions`/`user_plans`; **Override** via the user-360 comp/extend actions; **Reconcile** button to trigger `reconcile-subscriptions` for one user and show the result.
- **Checkout sessions** — **View** (debug "why didn't this user get access").
- **Coupons** — **full CRUD** (operator-owned config; the orphaned `AdminCoupons` page is real → wire it in).
- **Refunds** — **link out to Stripe** + record an internal credit/audit note. ❌ No refund engine / payments ledger UI; Stripe is system of record.
- **Webhook/event inspector** — **View** recent `stripe_events` + failures.

### 3. Operational tooling — **the part most missing today**
- **Unified Job/Queue monitor** over the **three** queues (`background_jobs`, `extension_jobs`, `bulk_job_items`): status, attempts, age, error. Actions: **Retry**, **Cancel**, **View payload**. (Normalize to a common shape in a read view; don't merge the tables.)
- **Sync health** — `ebay_sync_logs` error categories, stale-sync users, latest run; plus **clear sync error / trigger manual resync** per user.
- **Extension device control** — **View** devices/sessions, **Revoke** (`extension-device-revoke`), inspect `extension_error_logs`. This is the real lever for the #1 failure (stale eBay session).
- **System health** — edge error rates, rate-limit hits (`function_rate_limits`), queue depth, last cron run. A *small real* dashboard.
- **Audit log viewer** — `admin_audit_logs`/`audit_logs` (immutable), searchable (`search_admin_audit_logs`), per-record detail.

### 4. Emergency levers / feature control
- **Kill switches** — `global_auto_fulfillment_enabled`, `ebay_sync_enabled` (admin_settings). Runtime toggle, **super-admin**, audited.
- **Feature flags** — `app_feature_flags` (extension) + `feature_overrides`/`user_feature_overrides`. View + toggle, per-cohort/per-user.

### 5. Runtime content & config (changes weekly, shouldn't need a deploy)
- **Notices** — CRUD. **Curated catalogs** (`best_selling_items`/`must_sell_items`/`profitable_products`) — CRUD. **AI prompts** + **description config** + **calculator defaults** — Edit. **Marketing blog CMS** — *keep* (it exists, it's legit operator content) but deprioritize. *(I disagree with the prior draft's "deprecate the blog" — it's working operator-owned content; ripping it out to adopt Contentful is scope creep, not simplification.)*

---

## Part B — OUT of scope (cut, or never build) — with rationale

| Thing | Verdict | Why |
|---|---|---|
| **Listings/variations editor in admin** | **Don't build** | eBay writes happen in the user's browser via the extension; a server-side admin editor *can't* push to eBay and rebuilding doubles surface. Admin gets **read-only listing view + "force re-scrape/disable" flag**; real edits = **impersonate**. |
| **Order management / fulfillment console** | **Read-only monitor only** | Auto-fulfillment is **off**. Build a monitor, not a control panel, until it's live. No order edit/refund in admin. |
| **Workspaces / multi-tenant manager** | **Cut (mock today)** | One default workspace per user; multi-tenant is latent. Current "Workspaces" is fabricated data linking to a 404. Delete until tenancy is real. (Prior draft kept a read-only list — I'd cut it entirely; a read-only list of a non-feature is still noise.) |
| **Reports / Analytics / BI dashboards** | **Cut the vanity version** | Today: hardcoded sparklines, fake `14.3%` trends. Keep ~6 *real* metrics on Overview; don't build a half-BI tool. |
| **Shopify admin** | **Out (future scope)** | `SHOPIFY_ENABLED` off. Keep the seam; build no Shopify operator screens now. |
| **Topbar provider filter / Amazon tab / workspace select / date-range / fake badges** | **Cut** | Inert decoration; dead controls erode trust. |
| **Second "user dashboard" components** (`components/dashboard/*`) | **Delete** | Vendored from `apps/web`; only `EbaySyncSettings` used. |
| **Custom refund/payments ledger UI** | **Don't build** | Stripe is system of record; link out + audit note. |
| **Bespoke RBAC/permissions matrix** | **Don't over-build** | Three roles cover a <10-operator team; a permissions UI is classic admin over-engineering. |
| **In-app email/marketing campaign tooling** | **Out** | Belongs in the marketing app / an ESP. |

**Commonly over-built, explicitly rejected:** multi-tenant org management, permissions matrix, BI dashboards, refunds engine, duplicate content/listing editors.

---

## Part C — Configuration mechanisms (what lives where, and why)

The right mechanism depends on *who changes it, how often, how dangerous, and whether it's secret.*

| Config | Mechanism | Rationale |
|---|---|---|
| **Kill switches** (auto-fulfillment, sync) | **`admin_settings` (DB) + toggle UI** | Must flip **instantly during an incident**, no deploy; runtime-read by jobs. Already seeded. |
| **Feature flags** (extension + per-user) | **`app_feature_flags` / `user_feature_overrides` (DB) + UI** | Per-cohort/per-user rollout & emergency disable without redeploy. |
| **AI provider toggle** (Lovable Gateway ↔ OpenAI/Gemini) | **`admin_settings` (DB) + UI** | Operators must switch providers during an outage without a deploy. |
| **Plans / prices / features** | **DB (`plans*`) as display config, *synced to Stripe*** | Stripe is price-of-record; DB drives UI; edits must round-trip via `admin-sync-stripe-plans` or silently diverge. |
| **AI prompts / description config / calculator defaults** | **DB settings tables + config UI** | Tuned often by founder; behavioral not secret; needs audit + versioning, not a deploy. |
| **Sync window** (`daysToSync`) | **`admin_settings` (DB) + UI** | Operational knob, runtime. |
| **Notices / curated catalogs** | **DB + CRUD UI** | Operator-owned content, changes constantly. |
| **Secrets** (Stripe keys, `INTERNAL_FUNCTION_SECRET`, Turnstile, AI keys, **Amazon API creds**) | **Supabase secrets / env — NEVER a settings table or UI** | Secrets must not sit in a panel-readable DB row. **`amazon_settings` currently violates this** → migrate to secrets, or encrypt + put behind the sensitive-reveal gate. |
| **Site name / support emails / branding** | **`apps/marketing` config (code-tracked)** | Static, rarely changes, not an operator concern. |
| **Roles** | **`user_roles` (DB) + UI, super-admin only** | Authz; rare, dangerous, audited. |

Encoded rule: **runtime + non-secret + operator-owned → DB + UI; secret → env; price-of-record → Stripe; branding → marketing config.**

---

## Part D — Guardrails

1. **Two-tier roles, enforced uniformly.**
   - **`admin`** (support): view, impersonate (read-only), verify email, support notes, **small** credit comps, extend subscription.
   - **`super_admin`** (founder/lead): everything dangerous — role changes, user/plan **delete**, **kill switches**, limit overrides, **large** credit grants.
   - *Today the admin RPCs only check `has_role('admin')`.* **Tighten the dangerous ones to `super_admin`** in the DB and gate them in the UI (`RequireRole`). UI gating is convenience; the DB check is the boundary.
2. **Dangerous actions: confirm + mandatory reason.** RPCs already require `p_reason`; the UI must enforce a `ConfirmDialog` with a typed reason and echo the human impact ("This grants 500 credits to alice@…").
3. **Audit everything.** `admin_audit_logs`/`audit_logs` are **immutable** (triggers block UPDATE/DELETE). Every mutation — RPC *and* direct table write (coupons, plans, notices) — writes an audit row attributing `auth.uid()`, action, before/after, reason. No silent writes.
4. **Real operator identity + Sign Out** in the chrome — obvious who is acting.
5. **Least-privilege reads.** PII (buyer emails/addresses, supplier creds) behind the **sensitive-reveal** gate; reveals are themselves audited (`sensitive_data_revealed`).

---

## Scope scorecard (target)

| 100/100 criterion | How this scope hits it |
|---|---|
| Deliberate scope — everything manageable is, nothing bloating | Part A/B draw the line explicitly and cut ~10 over-builds |
| Single source of truth per data type | Stripe=billing, ledger=credits, DB-flags=features; admin never forks these |
| Every mutation audited | Part D #3 — immutable audit on RPC *and* table writes |
| Uniform auth + dangerous-action gating | Part D #1–2 — two tiers, confirm+reason |
| Config without redeploy where sensible | Part C — kill switches/flags/prompts/notices runtime DB+UI; secrets in env |

---

## Questions for me (decide before Phase B build)

1. **Impersonation depth:** read-only "view as" (my recommendation) vs. true session assumption? The latter is a security/audit liability — I'd avoid it.
2. **Orphans:** confirm Coupons wires back as CRUD, Credits folds into User-360, and Payments collapses to a Stripe-linked *read* view (not a rebuilt ledger).
3. **Super-admin tightening:** OK to move dangerous RPCs from `has_role('admin')` to `super_admin` (migration; may lock out current admins until roles are assigned)?
4. **Secrets migration:** can `amazon_settings` credentials move to Supabase secrets now, or is something reading them from the DB at runtime that needs a transition?
5. **Blog CMS:** keep in admin (my call) or split to marketing app?
6. **Workspaces:** confirm we cut the mock entirely now and revisit only if multi-tenant becomes a real product line.

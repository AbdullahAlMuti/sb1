# ADMIN_IMPLEMENTATION.md — Build-ready execution plan

> The actionable, PR-by-PR build guide derived from [`ADMIN_PLAN.md`](ADMIN_PLAN.md) (architecture), [`ADMIN_SCOPE.md`](ADMIN_SCOPE.md) (what's in/out), and [`PRODUCT_MODEL.md`](PRODUCT_MODEL.md). Every task is sized to a single reviewable PR, with exact files, a skeleton where it removes ambiguity, and a binary acceptance check.
> Scope of work: `apps/admin` + `@repo/types`. Stack: React + TS + Vite + React Router v6 + `@tanstack/react-query` + shadcn (`@repo/ui`) + Supabase (`@repo/api-client`).
> **Backend reality:** the admin RPC spine already exists — this is overwhelmingly a frontend job. Do **not** write new RPCs except the two flagged migrations (P3, P4).

---

## 0. Conventions for every PR
- **Branch:** `admin/<area>-<short>` off `main`.
- **Done = green:** `npm run typecheck` + `npm run lint` clean; no new `(supabase as any)` outside `core/data`; manual smoke of the touched route in 4 states (loading/empty/error/success).
- **No scope creep:** a PR migrates *or* builds, never both. Deletions ride with the PR that supersedes the file.
- **Audit invariant:** any PR that adds a mutation must show the resulting `admin_audit_logs` row in its description.

---

## Milestone 1 — Foundation (PRs 1–8, mostly serial)

### PR 1 — Route registry + single mount  `[BLOCKING]`
**Why first:** everything else hangs off canonical routes; kills the `/`+`/admin` duplicate and alias sprawl.
- **New** `apps/admin/src/app/routes.ts` — export `adminRoutes: AdminRoute[]` (path, element, label?, icon?, group?, access, redirectFrom?).
- **New** `apps/admin/src/app/router.tsx` — map `adminRoutes` → `<Route>`s under one `ProtectedRoute requireAdmin` parent; emit `redirectFrom` as `<Navigate replace>`.
- **Modify** `apps/admin/src/App.tsx` — replace the duplicated `AdminRouteChildren()` (mounted under `/` and `/admin`) with `<AdminRouter/>`; keep `/login|/auth|/admin/login`.
- **Acceptance:** every route currently reachable still resolves; visiting an old alias (`/ai-settings`, `/audit`, `/notifications`) 301s to canonical; `/admin/*` no longer double-mounts.

### PR 2 — Configured QueryClient  `[BLOCKING]`
- **New** `apps/admin/src/app/queryClient.ts` — `new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } })`.
- **Modify** `App.tsx` to import it (remove the bare `new QueryClient()`).
- **Acceptance:** navigating away and back within 30s does not refetch.

### PR 3 — `core/data` layer  `[BLOCKING]`
- **New** `core/data/keys.ts` — namespaced factories: `keys.users.list(p)`, `keys.users.detail(id)`, … one per entity.
- **New** `core/data/resource.ts` — typed `list/get/insert/update/remove` over PostgREST + an `rpc<T>()` wrapper.
- **New** `core/data/mutate.ts` — `useAdminMutation(fn, { invalidate, audit })`: runs `fn`, invalidates keys, toasts; in dev, asserts an audit row when `audit:true`.
- **New** `core/data/errors.ts` — `toMessage(error)` + `toastError(error)` (wrap `getFunctionErrorMessage`).
- **Acceptance:** a throwaway call reads via `resource.list` and a mutation invalidates + toasts; unit test on `toMessage`.

### PR 4 — `core/ui` primitives  `[P after PR2]`
Promote existing `StatusBadge`/`MetricCard`/`Sparkline` into `core/ui`; build the rest.
- **New** `core/ui/StateLayout.tsx` — props `{ isLoading, isError, isEmpty, onRetry, empty?, children }`.
- **New** `core/ui/DataTable.tsx` — generic `<DataTable<T>>`: `columns`, server `sort`/`pagination` (controlled), `rowSelection`+bulk bar, column-visibility, sticky header, mobile card fallback, embeds `StateLayout`.
- **New** `core/ui/ConfirmDialog.tsx` — shadcn `AlertDialog`; `reasonRequired` blocks confirm until ≥5 chars; `impact` line; async spinner.
- **New** `core/ui/FormLayout.tsx`, `core/ui/PageHeader.tsx`, `core/ui/AuditTrailList.tsx` (renders `admin_audit_logs` for an `entity_id`).
- **Acceptance:** a demo route renders `DataTable` in all 4 states; `ConfirmDialog` submit disabled until reason filled.

### PR 5 — `core/auth`  `[P]`
- **New** `core/auth/RequireRole.tsx` — `<RequireRole role>` using `useAuth().isAdmin/isSuperAdmin`; redirect/disable on fail.
- **New** `core/auth/useAdminIdentity.ts` — real `{ name, email, role, avatar, signOut }`.
- **Acceptance:** wrapping a node in `RequireRole role="super_admin"` hides it for an `admin`.

### PR 6 — `defineEntityModule` engine  `[BLOCKING, after PR3+PR4]`
- **New** `core/entity/defineEntityModule.ts` (descriptor type + factory), `EntityListPage.tsx`, `EntityDetailPage.tsx`, `EntityFormDialog.tsx`, `useEntity.ts`.
- **Acceptance:** a **demo descriptor** (e.g. `notices`) yields working list + detail + create + edit + delete + `AuditTrailList`, with **zero bespoke fetch code** in the module file.

### PR 7 — Regenerate types + de-`any`  `[P after PR3]`
- **Modify** `@repo/types/src/supabase.ts` — regenerate including drift tables: `background_jobs`, `ebay_sync_logs`, `user_feature_overrides`, `admin_audit_logs`, `admin_alerts`, `stripe_events` (+ admin RPC signatures).
- Remove `(supabase as any)` inside `core/data`.
- **Acceptance:** `npm run typecheck` passes; `grep "as any" core/` is empty.

### PR 8 — Layout from registry + real identity  `[after PR1+PR5]`
- **Modify** `layout/AdminSidebar.tsx` — render groups from `adminRoutes` (filter by `access`); drop hardcoded badge `12`.
- **Modify** `layout/AdminTopbar.tsx` — real identity + **Sign Out**; **delete** provider filter, workspace select, date range, fake notification dot.
- **Acceptance:** sidebar matches the registry; topbar shows the logged-in admin and signs out; no inert controls remain.

---

## Milestone 2 — Fix broken / delete dead (PRs 9–13, parallel after M1)

### PR 9 — Remove mock module pages  `[P]`
Delete `pages/AdminModulePage.tsx`; remove `/workspaces*` and `/reports` from `routes.ts` (scope cut). 
**Acceptance:** no route renders fabricated rows; `/integrations/:index` 404 path gone.

### PR 10 — Delete dead code  `[P]`
Delete `pages/AdminUsers_diff_backup.patch`; delete unused `components/dashboard/*` **except** relocate `EbaySyncSettings` → `modules/settings/`. 
**Acceptance:** build/typecheck clean; no dangling imports.

### PR 11 — URL-driven eBay tabs  `[P]`
**Modify** `platforms/components/PlatformDashboardLayout.tsx` + route to `/ebay-app/:tab`; `activeTab` derives from `useParams`. 
**Acceptance:** deep-link, refresh, and back/forward select the correct tab.

### PR 12 — Kill fabricated metrics  `[P]`
**Modify** `AdminDashboard` + `MetricCard` usage: remove fake trends/sparklines and "7 payment failures"; `MetricCard` requires real data or `placeholder` flag. 
**Acceptance:** no hardcoded analytics render.

### PR 13 — Overview = real ops metrics  `[P]`
**Modify** `modules/overview/*` — ~6 real numbers (total/active users, MRR-ish from subscriptions, queue depth, sync errors 24h, open alerts) via RPC/queries. 
**Acceptance:** every number traces to a query; empty/error states present.

---

## Milestone 3 — Migrate pages to the pattern (PRs 14–22)

> Each: convert to `EntityModule` (or `EntityListPage` primitives); delete the old page; uses `core/data` hooks, `DataTable`, `StateLayout`(4 states), `ConfirmDialog`(reason), `AuditTrailList`; no `(supabase as any)`.

### PR 14 — **User-360 console**  `[BLOCKING long-pole — start at PR6]`
Decompose the 1561-line `AdminUsers.tsx` into `modules/users/`:
- `useUsers.ts` (server-side list: search+filter+sort+paginate via `search_ebay_users_admin`) — **fixes the pagination/`activePercentage` integrity bug**.
- `UsersListPage.tsx` (`DataTable`), `UserDetailPage.tsx` (`/users/:id`, via `get_ebay_user_dashboard_stats_admin` + `get_ebay_user_admin_summary`).
- Actions as discrete components, each `ConfirmDialog`+reason: role, plan (`update_user_plan_admin`), credits (`adjust_user_credits_admin`), extend (`extend_user_subscription_admin`), limits (`update_user_limits_admin`), status (`toggle_user_status_admin`), verify email, **impersonate-read**, delete (super-admin).
- Merge `platforms/ebay/AdminEbayUsers.tsx` into this; wire `AdminEbayUserDetail.tsx`.
- **Acceptance:** `/users` list paginates/filters consistently with correct counts; `/users/:id` deep-links; every action audits + confirms; old `AdminUsers.tsx` deleted; module files each <300 lines.

### PR 15 — Billing: Plans/Prices/Features  `[P]`
`modules/billing/{plans,prices,features}` as descriptors; **edit round-trips through `admin-sync-stripe-plans`**. Delete `AdminPlans/PlanPrices/PlanFeatures`. 
**Acceptance:** edit a plan → Stripe sync invoked; audit row written.

### PR 16 — Billing: Subscriptions + Checkout-sessions  `[P]`
`modules/billing/{subscriptions,checkout-sessions}` (read) + per-user **Reconcile** button (`reconcile-subscriptions`). 
**Acceptance:** reconcile shows a result; both lists have 4 states.

### PR 17 — Billing: Coupons (CRUD) + Payments (read)  `[P]`
Wire orphan `AdminCoupons` as a CRUD descriptor; collapse `AdminPayments` to a Stripe-linked **read** view; fold `AdminCredits` into User-360. 
**Acceptance:** Coupons reachable from nav with full CRUD+audit; no rebuilt payments ledger.

### PR 18 — Content: Notices/Prompts/Description-config/Calculator  `[P]`
Four descriptors in `modules/content/`. 
**Acceptance:** each CRUD/Edit works with audit + 4 states.

### PR 19 — Content: Curated catalogs  `[P]`
One descriptor reused ×3 for `best_selling_items`/`must_sell_items`/`profitable_products`; delete `AdminBestSelling/MustSell/ProfitableProducts`. 
**Acceptance:** all three render from a single descriptor definition (proves the <1h claim).

### PR 20 — Settings: General/AI-provider/Suppliers  `[P]`
`modules/settings/*`; suppliers (Amazon) behind reveal gate. 
**Acceptance:** AI provider toggle persists to `admin_settings`; secret fields reveal-gated.

### PR 21 — Audit viewer  `[P]`
`modules/ops/audit/*` over `admin_audit_logs`+`audit_logs` via `search_admin_audit_logs`; reuse `AuditTrailList`. 
**Acceptance:** search by target email / admin / action; detail view.

### PR 22 — eBay platform tabs → primitives  `[P]`
Align `platforms/ebay/*` tab components to `DataTable`/`StateLayout`. 
**Acceptance:** consistent tables/states across tabs.

---

## Milestone 4 — Missing operator tooling (PRs 23–27, parallel after PR6)

### PR 23 — **Unified Queue monitor**  `[P]`
`modules/ops/queues/*` — a read view normalizing `background_jobs` + `extension_jobs` + `bulk_job_items` into `{ id, source, type, status, attempts, age, error }`; actions Retry / Cancel / View payload; filter by source. 
**Acceptance:** all three queues visible in one table; retry/cancel audited.

### PR 24 — Sync health + per-user resync  `[P]`
Generalize `AdminEbaySyncHealth` into `modules/ops/sync-health/`; add clear-error / trigger-resync per user. 
**Acceptance:** error categories + stale users; resync action audited.

### PR 25 — System health  `[P]`
`modules/ops/system-health/*` — edge error rates, `function_rate_limits` hits, queue depth, last cron run. 
**Acceptance:** ~6 real metrics; no vanity charts.

### PR 26 — Extension device control  `[P]`
`modules/extension/devices/*` — list devices/sessions, **Revoke** (`extension-device-revoke`), view `extension_error_logs`. 
**Acceptance:** revoke a device → session invalidated + audited.

### PR 27 — Feature flags / kill switches + Stripe event inspector  `[P]`
`modules/extension/flags/*` (`app_feature_flags`, `admin_settings` switches incl. `global_auto_fulfillment_enabled`, `user_feature_overrides`) + `modules/billing` `stripe_events` inspector. 
**Acceptance:** toggle a kill switch (super-admin, audited); view recent Stripe events/failures.

---

## Milestone 5 — Hardening & polish (PRs 28–32)

### PR 28 — Super-admin tightening  `[BLOCKING, DB migration]`
New migration: change dangerous RPCs (`update_user_plan_admin`, `update_user_limits_admin`, delete-user, kill-switch writes, large credit grants) from `has_role('admin')` → `'super_admin'`; gate the same in UI via `RequireRole`. 
**Acceptance:** an `admin` (non-super) is blocked at the DB *and* the control is hidden. *(Coordinate role assignment first to avoid lockout.)*

### PR 29 — Secrets migration  `[BLOCKING, DB/secret]`
Move `amazon_settings` credentials to Supabase secrets (or encrypt + reveal-gate); update `AmazonAPISettings` + `amazon-inventory-sync`. 
**Acceptance:** no secret readable as a plain panel row.

### PR 30 — PII reveal everywhere  `[P]`
Apply the reveal gate (reason + `sensitive_data_revealed` audit) to buyer emails/addresses + supplier creds. 
**Acceptance:** sensitive fields masked by default; reveals logged.

### PR 31 — 4-state + visual consistency sweep  `[P]`
Audit every route for loading/empty/error/success; normalize on `PageHeader`/tokens. 
**Acceptance:** checklist passes per route.

### PR 32 — a11y + tests  `[P]`
Table semantics, dialog focus traps, labels/contrast; tests for `defineEntityModule`, `DataTable` paginate/sort, `mutate` invalidation. 
**Acceptance:** axe clean on key pages; CI green.

---

## Dependency graph (critical path)
```
PR1 → PR2 → PR3 ─┬─→ PR6 → PR14 (User-360, long pole) ─┐
                 ├─→ PR4 ┘                              ├─→ M3/M4 fan-out (PR15–27) → M5 (PR28–32)
PR1 → PR8        └─→ PR7                                ┘
PR1 → PR9/10/11/12/13 (parallel, anytime after M1)
```
**Sequence rules:** PR1→PR2→PR3 serial. PR4/PR5/PR7 parallel. PR6 needs PR3+PR4. **Start PR14 the moment PR6 lands** (longest task). PR15–PR27 are independent — parallelize by developer. PR28/PR29 are scheduled migrations (do after role assignment / secret transition). PR30–PR32 last.

## Suggested first cut (1-week foundation slice)
PR1 → PR2 → PR3 → PR4 → PR6, then PR14 in flight. That alone makes the codebase *addable-to* and proves the pattern; the rest is mechanical migration that parallelizes across the team.

## Pre-build gate (from ADMIN_SCOPE "Questions for me")
Decide before PR14/PR28/PR29: (1) impersonation = read-only vs. full takeover; (2) Coupons-CRUD / Payments-read / Credits-into-360 confirmed; (3) super-admin tightening approved + roles assigned; (4) `amazon_settings` secrets migration path. These change PR14, PR28, PR29.

# ADMIN_PLAN.md — Target architecture + implementation plan (SellerSuit admin)

> Phases 3–4 of the rethink. Driven by the decisions in [`ADMIN_SCOPE.md`](ADMIN_SCOPE.md), grounded in [`PRODUCT_MODEL.md`](PRODUCT_MODEL.md), fixing the structural problems in [`ADMIN_AUDIT.md`](ADMIN_AUDIT.md).
> Stack stays as-is: React + TS + Vite + React Router v6 + `@tanstack/react-query` + shadcn (`@repo/ui`) + Supabase (`@repo/api-client`). **No code changes in this run.**
> Key framing: **the backend admin RPC spine already exists** (user search, credit/plan/limit mutations, immutable audit, feature controls). This plan is mostly *frontend consolidation + surfacing + a few new operator views* — not new backend capability.

---

## Phase 3 — Target architecture

### 3.1 Principles
1. **One way to do everything** — one fetch pattern (react-query hooks), one `DataTable`, one form shell, one `ConfirmDialog`, one `StateLayout` (loading/empty/error/success), one `AuditTrailList`.
2. **Entities are config, not bespoke pages** — a new managed section = an `EntityModule` descriptor; route + nav + table + CRUD + audit + access derive from it. Target: **new section in <1 hour**.
3. **Single source of truth per data type** — one query-key namespace + hooks per type; mutations invalidate it. Admin never forks billing (Stripe), credits (ledger), or flags (DB).
4. **Every mutation is audited + gated** — RPC or table write, it writes `admin_audit_logs`; dangerous actions require `super_admin` + confirm + reason.
5. **Canonical paths only** — single mount (no `/`+`/admin` duplication), aliases redirect once, sidebar generated from the route registry.

### 3.2 Canonical folder / route structure

```
apps/admin/src/
  app/
    App.tsx                 # providers + router
    routes.ts               # SINGLE source of truth: path, element, label, icon, group, access, redirectFrom
    router.tsx              # builds <Routes> from routes.ts
    queryClient.ts          # configured QueryClient (staleTime 30s, retry 1, no refetchOnFocus)

  core/
    entity/
      defineEntityModule.ts # EntityModule<T> descriptor + factory
      EntityListPage.tsx    # DataTable + toolbar + bulk + StateLayout
      EntityDetailPage.tsx  # detail + AuditTrailList
      EntityFormDialog.tsx  # zod-schema create/edit
      useEntity.ts          # list/detail/mutation hooks from descriptor
    data/
      keys.ts               # query-key registry (one namespace per type)
      resource.ts           # typed list/get/insert/update/delete helpers
      mutate.ts             # mutation helper: invalidate + toast + (audit assertion)
      errors.ts             # one error→message/toast path
    ui/
      DataTable.tsx         # sort, server-paginate, row-select + bulk bar, column toggle, StateLayout slots
      StateLayout.tsx       # loading / empty / error / success wrapper
      ConfirmDialog.tsx     # AlertDialog + mandatory reason (blocks submit) + impact echo
      FormLayout.tsx
      PageHeader.tsx        # icon, title, description, primary action
      StatusBadge.tsx       # active→green, suspended/error→red, warning→amber, pending→blue
      AuditTrailList.tsx    # renders admin_audit_logs for an entity_id
      MetricCard.tsx        # real series or explicit placeholder flag (no fake trends)
    auth/
      RequireRole.tsx       # <RequireRole role="admin"|"super_admin">
      useAdminIdentity.ts   # real profile/role + sign-out

  layout/
    AdminLayout.tsx · AdminSidebar.tsx (from routes.ts) · AdminTopbar.tsx (real identity, dead controls removed)

  modules/                  # one folder per managed area (descriptor-first)
    overview/               # ~6 real operational metrics + Action Center
    users/                  # User-360 console (the heart): list + detail + impersonate + actions
    billing/                # plans/ prices/ features/ subscriptions/ checkout-sessions/ coupons/ payments(read)
    ops/                    # queues/ (unified) · sync-health/ · system-health/ · audit/
    extension/              # devices/ (revoke) · logs/ · flags(kill-switches)/
    content/                # notices/ prompts/ description-config/ calculator/ catalogs(best/must/profitable)/ blog/
    settings/               # general/ ai-provider/ suppliers(reveal-gated)/

  platforms/                # KEEP the marketplace seam; align eBay tabs to URL (/ebay-app/:tab)
    platformRegistry.ts · ebay/ · components/PlatformDashboardLayout.tsx
```

**Route registry shape** (`app/routes.ts`) — routing + nav + access from one place:
```ts
type AdminRoute = {
  path: string;                 // canonical, no alias
  element: ReactNode;
  label?: string;               // present => sidebar item
  icon?: LucideIcon;
  group?: 'Overview'|'Customers'|'Billing'|'Operations'|'Extension'|'Content'|'System';
  access: 'admin' | 'super_admin';
  redirectFrom?: string[];      // old aliases → Navigate(replace)
};
```

### 3.3 The reusable "manage entity X" pattern

```ts
export const couponsModule = defineEntityModule({
  key: 'coupons',                         // query-key namespace + route base
  label: 'Coupons', icon: Tags, group: 'Billing', access: 'admin',
  resource: { table: 'coupons', orderBy: 'created_at desc' }, // or { rpc } / { edgeFn }
  columns: [...],
  form: couponZodSchema,                  // create/edit via EntityFormDialog
  rowActions: ['edit', { id: 'delete', danger: true, reason: true }],
  bulkActions: ['export'],
  audit: true,                            // writes admin_audit_logs on every mutation
});
```
Registering it auto-provides: list route `/coupons`, detail `/coupons/:id`, create/edit dialog, server-side paginate/sort/filter, the 4 states, sidebar entry, role gating, and audit. **New section = one descriptor.** Pages needing custom UI drop to `EntityListPage`/primitives without re-writing fetch/state code.

### 3.4 One data-fetching/caching pattern
- **Reads** via `useEntityList`/`useEntityDetail` (react-query) — configured `QueryClient` (staleTime 30s, retry 1, `refetchOnWindowFocus:false`).
- **Writes** via `core/data/mutate.ts` → invalidate `keys.<entity>` → toast via `errors.ts`. No page-local `setState` copies of server data (kills the cross-page drift in users/credits/roles).
- **Query keys** centralized in `keys.ts` (`keys.users.list(params)`, `keys.users.detail(id)`).
- **Server-side list semantics** (filter/sort/paginate as params via RPC/PostgREST) — fixes the `AdminUsers` pagination-vs-filter integrity bug and the wrong `activePercentage`.
- `useRealtimeSync` becomes an opt-in descriptor field that invalidates keys.

### 3.5 Shared primitives — definition of done
| Primitive | Responsibilities |
|---|---|
| `DataTable` | columns, server sort + pagination, row-select + bulk bar, column toggle, sticky header, responsive card fallback, `StateLayout` slots |
| `StateLayout` | loading (Skeleton) / empty (icon+message+CTA) / error (message+retry) / success |
| `ConfirmDialog` | AlertDialog + mandatory reason (blocks submit), destructive variant, async spinner, **echoes human impact** |
| `FormLayout`/`EntityFormDialog` | zod-driven fields, pending state, error surfacing |
| `PageHeader` | replaces the 4 header variants |
| `StatusBadge` | standardized status→color map |
| `AuditTrailList` | per-entity immutable audit feed (reused in every detail view) |

### 3.6 Uniform access + audit
- `RequireRole` wraps elements; `access` comes from `routes.ts`. Dangerous actions require `super_admin` (UI) **and** the RPC enforces it (DB) — UI gating is convenience, DB is the boundary.
- Audit is non-optional: descriptor `audit:true` + `mutate.ts` asserts an audit row was written (RPCs already log; table writes get an explicit `log_admin_action`). Sensitive reads go through the reveal gate, themselves audited.

### 3.7 Canonical route map (post-migration)
```
/overview
/users  /users/:id                       # User-360 (+ impersonate, actions)
/billing/plans /plans/:id/prices /plans/:id/features
/billing/subscriptions  /billing/checkout-sessions  /billing/coupons  /billing/payments(read)
/ops/queues  /ops/sync-health  /ops/system-health  /ops/audit
/extension/devices  /extension/logs  /extension/flags
/content/notices /content/prompts /content/description-config /content/calculator
/content/catalogs/{best-selling,must-sell,profitable}  /content/blog
/settings/general  /settings/ai-provider  /settings/suppliers
/ebay-app/:tab                           # tab from URL
# REMOVED: duplicate /admin mount, /workspaces*, /reports, all alias paths (redirect once)
```

---

## Phase 4 — Implementation plan

Legend: **[P]** parallelizable · **[B]** blocking. Each task = scope · files · acceptance.

### Foundation (mostly blocking — do first)
| # | Task | Scope · Files | Acceptance | Dep |
|---|---|---|---|---|
| F0 **[B]** | Lock scope answers (ADMIN_SCOPE "Questions for me") | — | 6 decisions recorded | — |
| F1 **[B]** | Single route registry + router; remove `/admin` duplicate; alias `redirectFrom` | `app/routes.ts`,`router.tsx`,`App.tsx` | tree mounted once; every current page reachable; aliases 301 once | F0 |
| F2 **[B]** | Configured `QueryClient` | `app/queryClient.ts` | global defaults applied | — |
| F3 **[B]** | `core/data` (`keys`,`resource`,`mutate`,`errors`) | new | one typed read/write + one error path; unit-tested | F2 |
| F4 **[P]** | `core/ui` primitives (`DataTable`,`StateLayout`,`ConfirmDialog`,`FormLayout`,`PageHeader`,`StatusBadge`,`AuditTrailList`) | new | demo renders all 4 states; ConfirmDialog blocks submit until reason filled | F2 |
| F5 **[P]** | `core/auth` (`RequireRole`,`useAdminIdentity`) | new | super-admin tier enforceable; real identity + sign-out | — |
| F6 **[B]** | `defineEntityModule` + Entity pages + `useEntity` | `core/entity/*` | a demo module gives list+detail+create+edit+delete+audit, zero bespoke fetch | F3,F4 |
| F7 **[P]** | Regenerate Supabase `Database` types incl. drift tables (`background_jobs`,`ebay_sync_logs`,`user_feature_overrides`,`admin_audit_logs`,`admin_alerts`,`stripe_events`); strip `(supabase as any)` in `core` | `@repo/types`, admin hooks | `typecheck` passes; no `as any` in `core/data` | F3 |
| F8 **[P]** | Sidebar/topbar from registry; real identity + sign-out; delete dead topbar controls (provider/workspace/date/badges) | `layout/*` | nav generated; no hardcoded identity/decoration | F1,F5 |

### Fix broken / remove dead (after F1–F6; independent of each other)
| # | Task | Acceptance | Dep |
|---|---|---|---|
| X1 **[P]** | Delete mock `AdminModulePage`; remove `/workspaces*` + `/reports` from nav/routes (per scope cut); kill `/integrations/:index` 404 path | no fabricated rows ship | F1 |
| X2 **[P]** | Delete `pages/AdminUsers_diff_backup.patch` + unused `components/dashboard/*` (keep/relocate `EbaySyncSettings`) | build/typecheck clean | F1 |
| X3 **[P]** | URL-driven eBay platform tabs (`/ebay-app/:tab`) | deep-link/refresh/back select correct tab | F1 |
| X4 **[P]** | Fix `AdminUsers` pagination/filter/`activePercentage` via server-side list (rolls into C-users) | counts/pages/filters consistent | F3,F6 |
| X5 **[P]** | Remove hardcoded counts/trends (sidebar badge 12, "7 failures", fake sparklines) | bound to data or removed | F4,F8 |

### Migrate pages to the pattern (independent per module — parallelize freely)
*All acceptance: uses `core/data` hooks + `DataTable` + `StateLayout` (4 states) + `ConfirmDialog`(reason) + `AuditTrailList`; no `(supabase as any)`; one query-key namespace.*
| # | Module | Files | [P]/[B] |
|---|---|---|---|
| C1 | **User-360** (decompose 1561-line `AdminUsers`; merge `AdminEbayUsers`; add impersonate-read + actions) | `modules/users/*` | **[B]** (long pole — start at F6) |
| C2 | Billing: Plans/Prices/Features (+Stripe sync in edit flow) | `modules/billing/*` | [P] |
| C3 | Billing: Subscriptions/Checkout-sessions (+per-user reconcile button) | `modules/billing/*` | [P] |
| C4 | Billing: Coupons (CRUD, wire orphan), Payments→read view | `modules/billing/*` | [P] |
| C5 | Content: Notices/Prompts/Description-config/Calculator | `modules/content/*` | [P] |
| C6 | Content: Curated catalogs (best/must/profitable — one descriptor ×3) | `modules/content/catalogs/*` | [P] |
| C7 | Settings: General/AI-provider/Suppliers (reveal-gated; plan secrets migration) | `modules/settings/*` | [P] |
| C8 | eBay platform tabs → align to primitives | `platforms/ebay/*` | [P] |

### Build missing operator tooling (the real gap — after F6)
| # | Task | Scope · Files | Acceptance | [P]/[B] |
|---|---|---|---|---|
| O1 | **Unified Queue monitor** over `background_jobs`+`extension_jobs`+`bulk_job_items` | `modules/ops/queues/*` (read view normalizing 3 shapes) | status/attempts/age/error; Retry, Cancel, View payload; per-type filter | [P] |
| O2 | **Sync health** generalized (+clear error / manual resync per user) | `modules/ops/sync-health/*` (reuse `AdminEbaySyncHealth`) | error categories, stale users, per-user resync action | [P] |
| O3 | **System health** (edge errors, `function_rate_limits`, queue depth, last cron) | `modules/ops/system-health/*` | ~6 real metrics, no vanity charts | [P] |
| O4 | **Audit viewer** (`admin_audit_logs`+`audit_logs`, `search_admin_audit_logs`, detail) | `modules/ops/audit/*` | search by target email / admin / action; `AuditTrailList` reused | [P] |
| O5 | **Extension device control** (devices/sessions, revoke, error logs) | `modules/extension/*` (reuse `extension-admin/*`) | revoke device; view `extension_error_logs` | [P] |
| O6 | **Feature flags / kill switches** (`app_feature_flags`,`admin_settings` switches, `user_feature_overrides`) | `modules/extension/flags/*` | runtime toggle, super-admin, audited | [P] |
| O7 | **Stripe event inspector** (`stripe_events` + failures) | `modules/billing/*` | view recent events/failures for debugging | [P] |

### Polish / hardening (after C+O)
| # | Task | Acceptance | [P]/[B] |
|---|---|---|---|
| P1 | 4-state coverage audit across every route | each list/detail has loading/empty/error/success | [P] |
| P2 | Visual consistency (PageHeader, tokens, one design language) | no `motion`/`font-display` one-offs unless intentional | [P] |
| P3 | **Super-admin tightening**: move dangerous RPCs `has_role('admin')`→`super_admin`; UI `RequireRole` | non-super-admin can't see/trigger delete/kill-switch/override | [B] (DB migration) |
| P4 | **Secrets migration**: `amazon_settings` creds → Supabase secrets / reveal-gated | no secret readable as a plain panel row | [B] |
| P5 | PII reveal everywhere sensitive (reason + `sensitive_data_revealed` audit) | reveals gated + logged | [P] |
| P6 | a11y (table semantics, dialog focus, labels, contrast) + tests (`defineEntityModule`, DataTable, mutate-invalidation) | axe clean on key pages; CI green | [P] |

### Execution order & parallelism
1. **F0 → F1, F2, F3** (serial spine). 2. **F4, F5, F7 parallel**; **F6** after F3+F4; **F8** after F1+F5.
3. **X1–X5** and **O1–O7** fan out once F6 lands. **C1 (User-360)** is the long pole — start immediately at F6.
4. **C2–C8** parallel; each module pairs with deleting its old page.
5. **P3/P4** (DB migrations) scheduled deliberately; **P1/P2/P5/P6** parallel last.

---

## How this hits 100/100
| Criterion | Delivered by |
|---|---|
| Deliberate scope, nothing bloating | ADMIN_SCOPE cuts (X1, workspaces/reports/Shopify removed) + IN-scope modules only |
| One pattern; new section <1h | `defineEntityModule` (F6); proven by C2–C7 each being one descriptor |
| Single source of truth per type | `keys.ts` + `core/data` (F3); User-360 consolidation (C1) |
| Every mutation audited | `mutate.ts` audit assertion + RPC logging + `AuditTrailList` (F3,F4,O4) |
| Every page 4 states | `StateLayout`/`DataTable` enforced in C + P1 |
| Uniform auth; dangerous gated+confirmed | `RequireRole` (F5) + `ConfirmDialog` reason (F4) + super-admin tightening (P3) |
| Config without redeploy where sensible | kill switches/flags/prompts/notices = DB+UI (O6, C5); secrets stay in env (P4) |

> **Gate before C/O build:** the 6 ADMIN_SCOPE questions — especially impersonation depth (#1), super-admin tightening (#3), and secrets migration (#4) — they change P3/P4 and the User-360 design.

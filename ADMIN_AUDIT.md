# ADMIN_AUDIT.md — SellerSuit Admin Panel (Phases 1–2)

> Scope: `apps/admin` (the `@sellersuit/admin` SPA) plus the shared `@repo/auth` gate it relies on.
> Stack actually found (not assumed): React 18 + TypeScript, Vite, React Router v6 (`BrowserRouter`, `future` flags), `@tanstack/react-query` (configured but barely used), shadcn/ui via `@repo/ui`, Supabase JS via `@repo/api-client`, `lucide-react`, `framer-motion` (one page), `sonner` toasts, `recharts`/sparklines. No state library beyond React + a lightly-used QueryClient.
> Method: read of `App.tsx`, `AdminLayout/Sidebar/Topbar`, the platform registry, `ProtectedRoute`, `useAuth`, and every `pages/*` + `platforms/*` module, plus a full grep of data-access calls.
> Date: 2026-06-17. **No code was changed in this pass.**

---

## Phase 1 — Inventory

### 1. Route / page tree

All routes live in [`apps/admin/src/App.tsx`](apps/admin/src/App.tsx). The entire child tree is defined once in a `AdminRouteChildren()` function and **mounted twice** — under `/` and under `/admin` — both wrapped in `<ProtectedRoute requireAdmin><AdminLayout/></ProtectedRoute>`.

| Route (relative) | Renders | Purpose | Flag |
|---|---|---|---|
| `index` / `overview` | `AdminDashboard` | KPI overview (users count + hardcoded cards) | **dup alias** (2 paths → same page) |
| `users` | `AdminUsers` | Global user/customer list + role/plan/credit/limit dialogs | god-file (1561 lines) |
| `users/:userId` | `AdminUsers` | (intended) user detail | **dead param** — page never reads `:userId` |
| `workspaces` | `AdminModulePage` | "Workspaces" manager | **100% mock data** |
| `workspaces/:workspaceId` | `AdminModulePage` | Workspace detail | **mock + dead param** |
| `billing` | `Navigate → /overview` | — | **dead redirect** |
| `plans` | `AdminPlans` | Billing plans CRUD | not in sidebar |
| `plans/:id/features` | `AdminPlanFeatures` | Plan feature rows CRUD | not in sidebar |
| `plans/:id/prices` | `AdminPlanPrices` | Plan price rows CRUD | not in sidebar |
| `subscriptions` | `AdminSubscriptions` | user_plans list | not in sidebar |
| `checkout-sessions` | `AdminCheckoutSessions` | checkout_sessions list | not in sidebar |
| `payments` | `Navigate → /overview` | — | **dead redirect**; real page `AdminPayments.tsx` orphaned |
| `credits` | `Navigate → /overview` | — | **dead redirect**; real page `AdminCredits.tsx` orphaned |
| `coupons` | `Navigate → /overview` | — | **dead redirect**; real page `AdminCoupons.tsx` orphaned |
| `ai` / `ai-settings` | `AdminAISettings` | Global AI provider/key settings | **dup alias** |
| `description-config` | `AdminDescriptionConfig` | eBay description template config | — |
| `automation` / `prompts` | `AdminPrompts` | AI prompt library CRUD | **dup alias** |
| `extension` | `AdminExtension` | Extension setup / admin_settings | — |
| `extension-control` | `AdminExtensionControl` | Device list + feature flags | — |
| `notifications` / `notices` | `AdminNotices` | Notices CRUD | **dup alias** |
| `blog` / `blog/new` / `blog/:id/edit` | `AdminBlog` / `AdminBlogEditor` | Marketing blog CMS | — |
| `reports` | `AdminModulePage` | "Reports / Analytics" | **100% mock data** |
| `audit` / `audit-logs` | `AdminAudit` | Audit log viewer | **dup alias** |
| `roles` | `AdminRoles` | Admin/role management | not in sidebar |
| `settings` | `AdminSettings` | Global settings + Amazon API | — |
| `best-selling` | `AdminBestSelling` | Curated best-selling items CRUD | not in sidebar (reached via eBay tab/links) |
| `must-sell` | `AdminMustSell` | Curated must-sell items CRUD | not in sidebar |
| `profitable-products` / `product-intelligence` | `AdminProfitableProducts` | Curated profitable products CRUD | **dup alias**, not in sidebar |
| `ebay-app/*` | `PlatformDashboardLayout(ebay)` | eBay platform workspace (8 tabs) | splat `*` unused |
| `shopify-app/*` | `PlatformDashboardLayout(shopify)` | Shopify workspace | gated by `SHOPIFY_ENABLED` (off) |
| top-level `/login`, `/auth`, `/admin/login` | `AdminLogin` | Admin sign-in | 3 aliases |
| top-level `/dashboard` | `Navigate → /overview` | legacy redirect | — |
| `*` | `NotFound` | 404 | — |

**eBay platform sub-tabs** (`platforms/ebay/index.ts`, rendered by local `useState`, *not* URL): Overview, Users, Content Library, Sync & Orders Health, Feature Controls, Credits & Usage, Audit Logs, Settings.

#### Dead / orphan / duplicate summary
- **Dead redirects** (routes that exist only to bounce to `/overview`): `billing`, `payments`, `credits`, `coupons`.
- **Orphan page files** (exist, fully built, no route renders them): [`AdminPayments.tsx`](apps/admin/src/pages/AdminPayments.tsx), [`AdminCredits.tsx`](apps/admin/src/pages/AdminCredits.tsx), [`AdminCoupons.tsx`](apps/admin/src/pages/AdminCoupons.tsx), [`platforms/ebay/AdminEbayUserDetail.tsx`](apps/admin/src/platforms/ebay/AdminEbayUserDetail.tsx) (not in tabs, not routed).
- **Backup artifact checked into source**: [`AdminUsers_diff_backup.patch`](apps/admin/src/pages/AdminUsers_diff_backup.patch) sitting in `pages/`.
- **Duplicate route aliases** (same component, 2+ paths): `ai`/`ai-settings`, `automation`/`prompts`, `notifications`/`notices`, `audit`/`audit-logs`, `profitable-products`/`product-intelligence`, `index`/`overview`, and **the whole tree duplicated under `/` and `/admin`**.
- **Mock-only routes**: `workspaces`, `workspaces/:workspaceId`, `reports` (all `AdminModulePage`, which navigates to `/integrations/:index` — a route that does not exist → 404).
- **Hidden-but-real routes** (no nav entry, URL-only): `plans`, `subscriptions`, `checkout-sessions`, `roles`, `best-selling`, `must-sell`, `profitable-products`. The **entire billing admin surface is unreachable from the sidebar.**

---

### 2. Component map

**Shared / reused primitives**
- `@repo/ui` (shadcn) — Button, Card, Dialog, Table, Select, Badge, Checkbox, Input, Textarea, Tabs, Sheet, Skeleton, DropdownMenu, Tooltip, Toaster/Sonner. This is the only consistent layer.
- Admin-local shared: [`MetricCard`](apps/admin/src/components/admin-dashboard/MetricCard.tsx), [`StatusBadge`](apps/admin/src/components/admin-dashboard/StatusBadge.tsx), [`Sparkline`](apps/admin/src/components/admin-dashboard/Sparkline.tsx), [`ActionCenter`](apps/admin/src/components/admin-dashboard/ActionCenter.tsx) — used by `AdminDashboard` and `AdminModulePage`.
- Layout: `AdminLayout` → `AdminSidebar` + `AdminTopbar`.
- Platform framework: `PlatformDashboardLayout` + `platformRegistry` + `platforms/types.ts` — **the one genuinely good extension seam in the codebase** (drop-in tabs per marketplace).

**One-off / page-local (no reuse)**
- Every `pages/Admin*.tsx` re-implements its own table, toolbar, pagination, dialogs, loading + empty states inline. There is **no shared DataTable, FormLayout, ConfirmDialog, or PageHeader.**
- `AdminUsers` alone inlines 6 dialogs (role, details, plan, credits, extend, override).

**Copy-pasted near-duplicates (flag)**
- **User management exists twice**: global [`AdminUsers`](apps/admin/src/pages/AdminUsers.tsx) and eBay-scoped [`platforms/ebay/AdminEbayUsers.tsx`](apps/admin/src/platforms/ebay/AdminEbayUsers.tsx) — overlapping concerns, separate code.
- **Credit adjustment exists twice**: `AdminUsers` credits dialog + `AdminCredits.tsx` (orphan) + `platforms/ebay/CreditAdjustmentModal.tsx`.
- **Role management exists twice**: role dialog inside `AdminUsers` and the whole `AdminRoles` page.
- **Plan/price/feature CRUD pages** (`AdminPlans`, `AdminPlanPrices`, `AdminPlanFeatures`) are three structurally identical list+drawer pages with copy-pasted scaffolding.
- **CRUD content pages** (`AdminBestSelling`, `AdminMustSell`, `AdminProfitableProducts`) are three near-identical curated-item managers.
- **A whole second "user dashboard" shell is vendored into admin** under [`components/dashboard/*`](apps/admin/src/components/dashboard) (DashboardLayout, DashboardSidebar, DashboardHeader, UserProfileCard, PlanOverview, UsageSummaryCard, NoticesBanner, CreditsLowBanner, LimitExhaustedDialog, NotificationSettings, DeveloperSettings, GoogleSheetsSettings, UserAISettings, OrderDetailsDrawer + `order-details/*`). **Only `EbaySyncSettings` is actually imported** (by `platforms/ebay/components/EbaySettings.tsx`). `OrderDetailsDrawer` is referenced only by the orphan `AdminPayments`. The rest is dead weight copied from `apps/web`.

---

### 3. Data layer

**Client:** single Supabase singleton `@repo/api-client/supabase/client` (`supabase`, plus `getFunctionErrorMessage`). Good — one client.

**Three competing fetch patterns coexist:**
1. **react-query `useQuery`** — only in the eBay platform: [`useEbayAdminOverview`](apps/admin/src/platforms/ebay/hooks/useEbayAdminOverview.ts), `AdminEbaySyncHealth`, a few others. Ad-hoc string query keys; no shared `staleTime`/`gcTime` defaults (the `QueryClient` is constructed bare in `App.tsx`).
2. **Manual `useEffect` + `useState` + `supabase`** — the majority: `AdminUsers`, `AdminDashboard`, `AdminPlans`, `AdminNotices`, `AdminPrompts`, `AdminSettings`, `AdminAudit`, `AdminCoupons`, `AdminCredits`, `AdminPayments`, `AdminSubscriptions`, `AdminCheckoutSessions`, `AdminBestSelling`, etc. Each owns `isLoading`, error handling, refetch.
3. **`useRealtimeSync`** (from `@repo/api-client`) — used by `AdminUsers` only, to live-refresh on `profiles`/`user_roles` changes. Not applied anywhere else.

**Three competing mutation patterns:**
- Direct table writes: `supabase.from('plans'|'plan_prices'|'plan_features'|'notices'|'coupons'|'best_selling_items'|'admin_settings').insert/update/delete(...)` — RLS is the only guard.
- RPCs: `AdminUsers` uses `toggle_user_status_admin`, `update_user_plan_admin`, `adjust_user_credits_admin`, `extend_user_subscription_admin`, `update_user_limits_admin`.
- Edge functions: `admin-update-role`, `admin-verify-email`, `admin-adjust-credits`, `admin-get-users-verification`, `admin-update-user-details`, `admin-delete-user`, `extension-admin-feature-flags`, `generate-titles`, `generate-description`, `test-api-key`, `amazon-inventory-sync`.

So the same conceptual operation ("adjust credits") is done via RPC in one place and an edge function in another.

**Type safety:** pervasive `(supabase as any)` casts (e.g. `best_selling_items`, `must_sell_items`, `profitable_products`, `admin_settings`, `user_plans`, `ebay_sync_logs`, all RPCs). The generated `Database` types are stale/missing for admin-only tables, so the data layer is effectively untyped.

**Flags:** No central `api/` or `queries/` module; no shared query-key registry; no shared error→toast helper applied uniformly (each catch block hand-rolls `toast.error(error.message || '...')`).

---

### 4. State management

- **Local component state dominates.** Almost every page is a self-contained `useState` machine.
- **`QueryClient` exists but is under-used and unconfigured** — caching benefits are limited to the eBay tab.
- **Layout state**: `AdminLayout` holds `collapsed`, `mobileOpen`, and `provider` in local `useState`. `provider` is passed down via `<Outlet context={{ provider }}>` **but no page consumes it** — dead global filter.
- **Platform tab state**: `PlatformDashboardLayout` keeps `activeTab` in local `useState`, ignoring the route splat `*`. Result: tabs are **not URL-addressable**, browser back/forward and deep links don't work, refresh resets to first tab.
- **Duplicated source of truth**: user/credit/role data is read and locally mutated (optimistic `setUsers(...)`) in `AdminUsers`, *and* independently fetched in `AdminEbayUsers`, `AdminCredits`, `AdminRoles` — no shared cache, so they drift.

---

### 5. Auth & roles

- Gate is shared `@repo/auth` [`ProtectedRoute`](packages/auth/src/ProtectedRoute.tsx). The admin tree's two parent routes both use `requireAdmin`. `useAuth` exposes `isAdmin` / `isSuperAdmin` (roles: `user|admin|super_admin|moderator|staff`, with moderator/staff treated admin-like).
- **Every admin child route is behind `requireAdmin`** (good — no unprotected admin data route was found). `/login`, `/auth`, `/admin/login` are intentionally public.
- **Gating is binary.** No admin route or component uses `requireSuperAdmin`. Destructive/sensitive actions — promoting to `super_admin`, deleting plans, deleting users, adjusting credits, overriding limits — are **not gated in the UI by super-admin**; they rely entirely on server RPC/edge checks. There is no `requireSuperAdmin` wrapper, no per-action role check, no role-aware nav hiding.
- **Identity is faked in the chrome.** `AdminSidebar` and `AdminTopbar` hardcode `"Admin User" / "Super Admin"` and an "A" avatar instead of reading the real `profile`. The topbar dropdown items (Profile, Security settings, Help center) are non-functional, and there is **no Sign Out control** in the admin shell.
- Mounting the same tree under both `/` and `/admin` means the admin app owns the site root `/`, which is fragile (any future public admin marketing route collides).

---

### 6. eBay domain model — as the panel currently treats it

This is the most important finding for the stated goal ("control center for listings, variations, suppliers, pricing, orders, scraping pipeline"). **Most of that domain is not actually managed in the admin panel today.** What exists:

| Domain entity (as you described it) | Where managed today | Reality |
|---|---|---|
| **Listings** | — | **No listing CRUD anywhere.** Admin never lists/edits/removes a user's eBay listings. |
| **Variations** | — | **Not present at all.** |
| **Suppliers** (Amazon/Walmart) | `AmazonAPISettings` inside `AdminSettings` (`amazon_settings`) | Amazon API key/config only. **No Walmart, no supplier registry UI.** |
| **Pricing** | — | No product/repricing controls in admin (pricing engine lives in the extension). `plans`/`plan_prices` are *billing* pricing, a different thing. |
| **Orders** | `AdminEbaySyncHealth` (read-only health), orphan `OrderDetailsDrawer` | Read-only sync/error monitoring of `ebay_sync_logs`; no order management. |
| **Scraping pipeline** | `AdminExtension`, `AdminExtensionControl`, `extension-admin/*` | Extension config + device/feature-flag control. Closest thing to "pipeline ops". |
| **Curated content** | `best_selling_items`, `must_sell_items`, `profitable_products` + `EbayContentLibrary` | The actual product-data CRUD that exists. |
| **Users / sellers** | `AdminUsers` (global) + `AdminEbayUsers` (eBay tab) | Managed in two overlapping places. |
| **Billing** | `AdminPlans/PlanPrices/PlanFeatures/Subscriptions/CheckoutSessions` (+ orphan Credits/Coupons/Payments) | Fairly complete but half-hidden/orphaned. |
| **Settings / AI** | `AdminSettings`, `AdminAISettings`, `AdminDescriptionConfig`, `AdminPrompts` | KV-style `admin_settings` + prompt/AI config. |
| **Audit** | `AdminAudit`, eBay `AdminEbayAuditLogs` | Two audit viewers. |

**Takeaway:** the panel is today a **SaaS-operations console** (users, billing, content, extension, AI config) wearing eBay-platform framing — not a listings/variations/orders management tool. Any plan must decide whether to (a) build the missing eBay entity managers, or (b) re-scope the stated goal to what the product actually needs. → **Open question for you below.**

---

## Phase 2 — Diagnosis

Severity key: **Critical** (broken/integrity/security) · **High** (blocks maintainability or core function) · **Med** · **Low**.

### A. Structural mess & dead code

| # | Sev | Files | Why it hurts | Fix direction |
|---|---|---|---|---|
| A1 | **High** | `App.tsx` (whole tree mounted under `/` *and* `/admin`) | Doubles the route surface, ambiguous canonical URLs, breaks `isActivePath`/active-state logic, collides with site root | Pick **one** base (`/admin` or root) and redirect the other once. |
| A2 | **High** | `ai`/`ai-settings`, `automation`/`prompts`, `notifications`/`notices`, `audit`/`audit-logs`, `profitable-products`/`product-intelligence`, `index`/`overview` | 6 duplicate aliases → confusing, nav inconsistency, SEO/bookmarks split | One canonical path each; alias → `Navigate replace`. |
| A3 | **High** | `AdminPayments.tsx`, `AdminCredits.tsx`, `AdminCoupons.tsx`, `AdminEbayUserDetail.tsx` | Fully-built pages with **no route** (their routes redirect to `/overview`) — readers can't tell what's live | Either wire them into nav or delete. (Coupons/Credits/Payments likely should be *wired*; see B.) |
| A4 | **Med** | `pages/AdminUsers_diff_backup.patch` | A `.patch` backup in `src/` ships in the bundle context and confuses search | Delete. |
| A5 | **High** | `components/dashboard/*` (≈25 files) | Second user-dashboard shell vendored from `apps/web`; only `EbaySyncSettings` used | Delete the unused set; move `EbaySyncSettings` to a real shared location. |
| A6 | **High** | `AdminUsers.tsx` (1561 lines) | God-file: fetch + 6 dialogs + table + mobile view + CSV in one component | Decompose into `UsersTable`, `useUsers` hook, and per-action dialog components. |
| A7 | **Med** | `pages/` flat naming vs `platforms/` feature folders | Two organizing conventions in one app | Adopt one feature-folder convention (see PLAN Phase 3). |

### B. Broken / non-functional features (concrete repro)

| # | Sev | Files | Repro | Fix direction |
|---|---|---|---|---|
| B1 | **Critical** | `AdminModulePage.tsx` (Workspaces, Reports) | Open `/workspaces` or `/reports` → shows **hardcoded fake rows** ("Dreamy Home Store", etc.); click any row → navigates to `/integrations/:index` → **404 NotFound** | Replace with a real entity manager or remove from nav until built. |
| B2 | **High** | `App.tsx` (`billing`,`payments`,`credits`,`coupons` → `/overview`) | Visit `/coupons` → silently redirected to overview; the working `AdminCoupons` page never shows | Wire real pages to these routes + add nav entries. |
| B3 | **High** | `AdminSidebar.tsx` | Sidebar has **no links** to Plans, Subscriptions, Checkout Sessions, Roles, Best-Selling, Must-Sell, Profitable Products | Add a "Billing" and "eBay Catalog" nav group. |
| B4 | **High** | `PlatformDashboardLayout.tsx` | Open eBay App, switch to "Credits & Usage", refresh → resets to Overview; URL never changes; back button doesn't switch tabs | Drive `activeTab` from the route splat (`/ebay-app/:tab`). |
| B5 | **Med** | `AdminLayout.tsx` + `AdminTopbar.tsx` | Toggle "Provider" filter in topbar → **nothing happens** (no page reads `Outlet` context) | Either implement provider filtering or remove the control. |
| B6 | **Med** | `AdminTopbar.tsx` | Workspace `<Select>` ("Dreamy Home", "TopRatedDeals"…), date range "May 1 - May 31, 2025", notifications dot, are all **hardcoded** and inert | Wire to data or remove. |
| B7 | **Med** | `AdminSidebar.tsx` (Notices badge `12`), `AdminDashboard` ("7 payment failures") | Hardcoded counts that never reflect reality | Bind to real queries or drop. |
| B8 | **Med** | `AdminTopbar.tsx` dropdown | "Profile / Security settings / Help center" do nothing; **no Sign Out** | Implement account menu incl. sign-out from `useAuth`. |
| B9 | **High** | `App.tsx` `users/:userId`, `workspaces/:workspaceId` | Deep-link to a user detail → renders the list page; `:userId` is ignored | Build real detail routes or remove the param routes. |

### C. Inconsistent UI/UX (tables, forms, modals, states)

| # | Sev | Files | Problem | Fix direction |
|---|---|---|---|---|
| C1 | **High** | all list pages | Three table idioms: raw `<table>` (`AdminUsers`), `@repo/ui` `<Table>` (`AdminModulePage`), bespoke card lists. Different paddings, sort UIs, pagination | One shared `DataTable` (sort, paginate, select, column toggle, states). |
| C2 | **High** | most pages | Loading/empty/error states are **per-page and uneven**: `AdminUsers` has spinner+empty but no error UI (only a toast); eBay uses `<Skeleton>`; mock pages have none; few have explicit error states | Standard `QueryState` wrapper (loading/empty/error/success). |
| C3 | **Med** | dialogs everywhere | Confirm/delete dialogs re-implemented per page; some destructive actions have no confirm | Shared `ConfirmDialog` + `FormDialog`. |
| C4 | **Med** | `AdminUsers` vs `AdminModulePage` | Two visual languages: `motion.div` + `font-display` "Customer List" vs slate-flat "Module" layout; rounded-2xl vs default | One `PageHeader` + design-token discipline. |
| C5 | **Low** | `AdminDashboard`, `MetricCard`, `AdminModulePage` | Fabricated trends/sparklines (`14.3%`, `[12,18,16…]`) imply analytics that don't exist | Drive from data or clearly label as placeholder. |

### D. Data-integrity risks

| # | Sev | Files | Problem | Fix direction |
|---|---|---|---|---|
| D1 | **High** | `AdminUsers.tsx` | **Pagination + filtering mismatch**: server-side `.range()` paginates *before* the client-side `filterRole` filter and search/sort run on the current page only. So role-filtered results are wrong, and `totalCount` (server count, unfiltered) disagrees with what's shown | Move filter/sort/paginate server-side (RPC or query params), single source of count. |
| D2 | **Med** | `AdminUsers.tsx:598` | `activePercentage` divides `activeCount` by `users.length` (page size) not `totalCount` → wrong % | Compute from server aggregates. |
| D3 | **High** | `AdminUsers`, `AdminEbayUsers`, `AdminCredits`, `AdminRoles` | **Multiple sources of truth** for the same user/credit/role data; optimistic `setUsers(...)` after RPC isn't reconciled across pages → stale UI | Single `useUsers`/`useUser` react-query cache; invalidate on mutation. |
| D4 | **Med** | `(supabase as any)` everywhere | Untyped writes can silently target wrong columns; no compile-time guard | Regenerate `Database` types incl. admin tables; remove casts. |
| D5 | **Med** | direct `from().update()/delete()` in `AdminPlans`/`PlanPrices`/`Coupons` | Mutations bypass any service layer; RLS is the only validation; no audit entry for some | Route writes through RPC/edge with audit logging, consistently. |

### E. Missing CRUD coverage

| # | Sev | Area | Gap |
|---|---|---|---|
| E1 | **High** | Users | View + many actions, but **no create, no delete from UI** (delete edge fn exists, unused), `:userId` detail not built. |
| E2 | **Critical** | eBay listings / variations | **No CRUD at all** — can't view/edit/remove a seller's listings or variations. |
| E3 | **High** | Orders | **Read-only** (sync health). No order detail/refund/intervention surface (drawer exists but orphaned). |
| E4 | **High** | Coupons / Credits / Payments | Full CRUD pages built but **unreachable** (orphaned). |
| E5 | **Med** | Suppliers | Amazon settings only; no Walmart; no per-supplier enable/health. |
| E6 | **Med** | Workspaces / Reports | View is mock; no real backing at all. |

### F. No clear extension point for a new managed entity

| # | Sev | Why |
|---|---|---|
| F1 | **High** | Adding "manage entity X" today = copy an 800–1500-line page, re-implement table+dialogs+fetch+states, hand-add a route *and* an alias *and* (maybe) a sidebar entry, and remember it must be added under both `/` and `/admin`. The only reusable pattern is the **marketplace** seam (`platformRegistry`), which solves *platforms*, not *entities*. There is no `createEntityModule({ list, columns, form, actions })` convention, no shared CRUD hook factory, and no central nav config derived from routes. |

---

## Scorecard vs your "100/100" definition (current state)

| Criterion | Status |
|---|---|
| One consistent way to add/manage any entity | ❌ bespoke per page |
| Zero dead routes / duplicate components | ❌ 4 dead redirects, 6 alias dups, 4 orphan pages, ~24 dead components, tree mounted twice |
| Single source of truth per data type | ❌ users/credits/roles fetched 3–4× |
| Every page has loading/empty/error/success | ❌ uneven; mock pages none; errors usually toast-only |
| Uniform auth gating, no unprotected route | ⚠️ all gated by `requireAdmin`, but **no super-admin tier** and faked identity |
| New section in <1h by copy | ❌ requires editing 3–4 files + dup tree |

---

## Questions for you (ambiguities — not assumed)

1. **Domain scope.** The stated goal centers on *listings, variations, suppliers, pricing, orders*. Today the admin manages almost none of those (it's users/billing/content/extension). Do you want the plan to (a) **build** the missing eBay entity managers, or (b) **re-scope** to harden what exists? This changes Phase B/C substantially.
2. **Canonical base path.** Should admin live at root `/` or under `/admin`? (Currently both.) Affects every link.
3. **Orphan billing pages** (`AdminCoupons`/`AdminCredits`/`AdminPayments`): wire them back in, or were they intentionally retired in favor of `/plans` + `/subscriptions`?
4. **`components/dashboard/*`**: confirm this is vendored leftover from `apps/web` and safe to delete (only `EbaySyncSettings` is used) — or is something planned to consume it?
5. **Super-admin tier.** Do you want a real `requireSuperAdmin` gate on destructive actions (role promotion, plan/user deletion), or is server-side RLS/edge enforcement considered sufficient and UI gating unnecessary?
6. **Workspaces** a real concept (multi-tenant) you intend to build, or vestigial mock to remove?
7. **Two user managers** (`AdminUsers` global vs `AdminEbayUsers` tab): consolidate into one, or keep global vs per-platform intentionally?

# Dead-File Candidate Manifest — Phase 1

> Branch: `chore/deadfile-sweep` · Base commit: `7de93ff` · Date: 2026-06-22
> Policy: **HIGH-only moves** (locked). MEDIUM/LOW are **report-only — not moved**.
> Tools: knip 5.88.1 (alias-resolution limited — see Caveats) + `git grep` cross-checks. madge discarded (could not resolve `@repo/*` deep paths).
> Prior sweep "Repo Janitor 2026-06-21" already quarantined a large set into `_unused/`; this is **incremental** on top of it.

---

## ⚠️ Tooling caveats (read before trusting any row)

1. **knip cannot resolve `@repo/<pkg>/<deep/path>` subpath imports.** Apps import e.g. `@repo/ui/components/ui/button`, but the `@repo/ui` barrel only re-exports 4 symbols. So knip flagged ~50 in-use shadcn components (incl. `button.tsx`, verified imported 8×) as "unused." **All `packages/ui/src/components/ui/*` knip hits are FALSE POSITIVES → KEEP.**
2. **knip flags every `supabase/functions/*/index.ts` as unused** (74 files) because each edge function is an independently-deployed root knip doesn't know. **All `supabase/**` → FALSE POSITIVES → KEEP** (per brief's Supabase rule).
3. **Verified knip false positives in code:** `routeAfterAuth` (imported by `Register.tsx`), `TurnstileCaptcha` (used by `Auth.tsx`+`Register.tsx`), `usePlans`/`useRealtimeSync` (5 refs each), `use-toast` (14 refs), `OtpInput` (2 refs). All KEEP.
4. Every MEDIUM row was re-checked with a reliable `git grep -lI "<symbol>" -- '*.ts' '*.tsx'` (control: `ProtectedRoute` = 8 files, sanity-passed). Batch greps that returned all-zeros were proven broken and discarded.

---

## Surface: cross-cutting roots / build artifacts

| File (orig path) | Tier | Why unreachable (evidence) | Category | Action |
|---|---|---|---|---|
| `apps/extension_backup_phase0.zip` | **HIGH** | `git grep "extension_backup_phase0"` → 0 hits in tracked source (`_audit` excluded). Tracked (`git ls-files` ✓), not gitignored. Manual backup artifact; no build script or glob references it. | backup | **MOVE** |

## Surface: extension (`apps/extension`)
Analyzed conservatively (vanilla JS, manifest-driven roots; knip excluded this workspace). The prior sweep already quarantined its dead files (popup.*, fix_ui.*, clean_css.cjs, ui/*.css, _template.image-adapter.js — see `_unused/RESTORE_LOG.md`). No new HIGH candidates. String-path targets (`web_accessible_resources` globs, `getURL`, `executeScript`) → **LOW/UNVERIFIED → KEEP**.

## Surface: marketing (`apps/marketing`)
No new HIGH candidates. knip-flagged `App.css` and `prerender-blog.selftest.mjs` → see Needs-human / Tests lists. All components resolve from `App.tsx`/route tree.

## Surface: admin (`apps/admin`)

| File (orig path) | Tier | Why unreachable (evidence) | Category | Action |
|---|---|---|---|---|
| `src/components/dashboard/order-details/` **(16 files)** — `OrderDetailsDrawer`'s subtree: `SectionShell.tsx`, `KeyValueGrid.tsx`, `WhatsAppLogo.tsx`, `formatters.ts`, `types.ts`, `sections/{Customer,LineItems,OrderSummary,Payment,ShippingAddress,Timeline}Section.tsx` | MEDIUM | **Dead island.** Parent `OrderDetailsDrawer.tsx` is already in `_unused/` (prior sweep). `git grep "order-details"`/`"OrderDetailsDrawer"` in live `apps/admin/src` (excl. the subtree) → **0 hits**. Files only reference each other. | source | **KEEP (report)** — no dead-marker, so not HIGH per policy |
| `src/modules/admin/components/PlanGate.tsx` | MEDIUM | `git grep "PlanGate"` live code → 0 refs. (Sibling `PermissionGate` has 1 ref.) Part of new but not-yet-wired `modules/` scaffolding. | source | **KEEP (report)** |
| `src/modules/admin/components/PermissionGate.tsx` | MEDIUM-low | 1 live ref only (possible intra-module). | source | **KEEP (report)** |

## Surface: web (`apps/web`)

| File (orig path) | Tier | Why unreachable (evidence) | Category | Action |
|---|---|---|---|---|
| `src/components/checkout/CheckoutDialog.tsx` | MEDIUM | `git grep "CheckoutDialog"` → only `SPEC.md` (doc) + self. 0 live importers. | source | **KEEP (report)** |
| `src/components/checkout/CouponInput.tsx` | MEDIUM | 1 live ref — likely `CheckoutDialog` (itself a 0-ref orphan) ⇒ probable dead island. | source | **KEEP (report)** |
| `src/components/dashboard/DashboardLayout.tsx` | MEDIUM | Only live ref is `useSentryUser.ts`; not imported by `App.tsx`/routes (routed layout is elsewhere). | source | **KEEP (report)** |
| `src/components/dashboard/{DashboardHeader,DashboardSidebar,NoticesBanner}.tsx` | MEDIUM | 1 live ref each — mutually reference `DashboardLayout` ⇒ same dead island. | source | **KEEP (report)** |
| `src/hooks/useSentryUser.ts` | MEDIUM-low | 1 live ref (`DashboardLayout`). If the dashboard island is dead, this is too — but verify Sentry wiring first. | source | **KEEP (report)** |

## Surface: shared packages (`packages/*`)

| File (orig path) | Tier | Why unreachable (evidence) | Category | Action |
|---|---|---|---|---|
| `packages/auth/src/hooks/usePlanLimits.tsx` | MEDIUM | `git grep "usePlanLimits"` live code → 0 refs across all 3 apps. | source | **KEEP (report)** |
| `packages/ui/src/{navigation/NavLink,theme/ThemeToggle,contact/WhatsAppButton,hooks/use-mobile}.tsx` | MEDIUM-low | 1 live ref each — single importer or intra-package; needs per-file check across all 3 apps before any action. | source | **KEEP (report)** |

---

## Tests (KEEP by default — separate human decision)
10 files knip flagged because test entry patterns weren't configured. All KEEP:
`packages/auth/src/lib/{dashboardAccess,planIntent,resolveNextStep,routeAfterAuth}.test.ts`, `supabase/functions/_shared/{billing,description,email,plan-middleware}.test.ts`, `apps/admin/tests/admin-security.test.mjs`, `scripts/stripe-sync-plans.test.mjs`, `apps/marketing/scripts/prerender-blog.selftest.mjs`.

## Docs / non-code (KEEP — separate decision)
`packages/ui/src/styles.css`, `apps/marketing/src/App.css` (knip-flagged; CSS reachability not tracked by knip — App.css may be imported by `main.tsx`; verify). ~20 root `*.md` + `docs/**` not analyzed this pass.

## Needs human decision (UNVERIFIED — never moved)
- **All `supabase/functions/**`** — independent deployed roots (knip false positives). KEEP.
- **All `packages/ui/src/components/ui/*`** (~50 shadcn) — used via deep-path alias knip can't resolve. KEEP. *(A real "which shadcn components are unused" audit needs an alias-aware grep of `@repo/ui/components/ui/<name>` across apps — not done reliably this pass.)*
- **Standalone entry scripts:** `smoke_tests.js`, `scripts/stripe-sync-plans.mjs`, `load-tests/k6/sellersuit-smoke.js`, `supabase/migrations/apply_financial_fields.mjs` — invoked directly by node/CI, not imported. KEEP.
- **`apps/extension` string-path targets**, **all `public/**` assets**, **all `*.d.ts`** — LOW by rule. KEEP.
- The **1-ref MEDIUM-low** rows above — need individual cross-app verification before they could be reclassified.

## Roots excluded (sanity-check the entry-point detection)
- Web SPAs: `apps/{web,admin,marketing}/index.html` → `/src/main.tsx` → `App.tsx` route trees. (`vite-env.d.ts`, `main.tsx` correctly treated as roots, not orphans.)
- Extension: union of `manifest.json` / `manifest.dev.json` / `manifest.prod.json` declarations (service worker, 10 content-script groups, `web_accessible_resources` incl. globs, sidepanel/ui HTML) + vite bundle inputs + prepare/verify scripts.
- Supabase: each `functions/<name>/` dir + `_shared/`. Migrations/`config.toml` denylisted.
- DENYLIST untouched: both lockfiles (`bun.lockb`, `package-lock.json`), all `*.config.*`, `.github/**`, `vercel.json`, deploy scripts, `*.d.ts`.

## Already in `_unused/` (prior sweep — reconciliation)
Extension popup.*, fix_ui.*, clean_css.cjs, ui/*.css, _template.image-adapter.js; admin Dashboard*/Order*/Plan*/User* components + AdminCoupons/AdminCredits/AdminPayments pages; marketing CheckoutDialog/CouponInput/CourseSection/etc.; web CreditsLowBanner/LimitExhaustedDialog. Full list in `_unused/RESTORE_LOG.md`. **Not re-touched.**

---

## Summary
- **HIGH / move-eligible: 1 file** — `apps/extension_backup_phase0.zip`.
- **MEDIUM / report-only: ~28 files** — admin `order-details/` dead island (16) + web dashboard/checkout island (7) + admin `modules` gates (2) + `packages` singles (3). None have dead-markers, so none qualify to move under HIGH-only policy.
- **Excluded false positives: ~134** — supabase roots (74), shadcn deep-path (~50), tests (10), verified-used singles.

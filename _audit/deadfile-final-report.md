# Dead-File Sweep — Final Report

> Branch: `chore/deadfile-sweep` · Date: 2026-06-22 · Policy: HIGH-only + verified MEDIUM dead-islands (human-approved)
> **Not merged, not pushed, `_unused/` not deleted.** Awaiting human review.

## Counts

| Surface | Scanned (analyzed) | Moved | Kept-uncertain (reported) | Proven false-positives (rollback) |
|---|---|---|---|---|
| cross-cutting / extension backup | — | **1** (`extension_backup_phase0.zip`) | 0 | 0 |
| marketing | ~29 orphans triaged | 0 | 0 | 0 |
| admin | knip set triaged | **11** (`order-details/` island) | `PlanGate`, `PermissionGate` | 0 |
| web | knip set triaged | **7** (checkout + dashboard-layout islands) | — | 0 |
| packages/ui | all 7 pkgs, alias-aware | **21** (19 shadcn + `use-mobile` + `NavLink`) | `usePlanLimits`, `ThemeToggle`+`WhatsAppButton` (used) | 0 |
| supabase | all functions | 0 (all are roots) | 0 | 0 |
| **Total** | | **40 files** | ~4 | **0** |

- **Excluded false positives (analyzed, never moved): ~134** — 74 `supabase/functions/*` (independent deployed roots), ~50 `@repo/ui` shadcn components (used via deep-path alias knip can't resolve), 10 tests, plus verified-used singles (`routeAfterAuth`, `TurnstileCaptcha`, `usePlans`, `useRealtimeSync`, `use-toast`, `OtpInput`).

## Verification (per affected surface)

| Surface | typecheck | build | Notes |
|---|---|---|---|
| admin | ✅ pass | ✅ `vite build` 4051 modules | after removing 11-file island |
| web | ✅ pass | ✅ `vite build` 4067 modules | after removing 7-file islands |
| packages/ui (shared → all 3 apps) | ✅ pass | ✅ marketing 2488 / web 4067 / admin 4051 | after removing 21 ui files |
| extension backup zip | n/a | n/a | binary, 0 references — cannot affect any build/typecheck |
| marketing / supabase | untouched (no app-specific moves) | untouched | — |

Lint/tests not separately run: removing files with **zero importers** cannot introduce errors in remaining files; typecheck+build are the binding proof. Extension source and Supabase functions were not touched.

## Commits (per verified batch)

| Hash | Batch |
|---|---|
| `7de93ff` | WIP checkpoint (prior sweep + billing/audit remediation) — base for the sweep |
| `7f1aee7` | `extension_backup_phase0.zip` + Phase-1 manifest |
| `7bc4408` | admin `order-details/` dead island (11) |
| `29803ce` | web checkout + dashboard-layout dead islands (7) |
| `6d86b70` | 21 unused `packages/ui` files (19 shadcn + `use-mobile` + `NavLink`) |

## Restore
Every move has a one-line restore command in `_unused/RESTORE_LOG.md` (Sweep 2 section). Whole sweep reverts with `git reset --hard 7de93ff` (the WIP checkpoint).

## Things I was unsure about (kept on purpose)
1. **`packages/auth/.../usePlanLimits.tsx`, admin `modules/.../PlanGate.tsx`/`PermissionGate.tsx`** — 0–1 live refs, but part of an actively-developed `apps/admin/src/modules/` scaffold (untracked-until-this-branch). Likely intentional WIP, not dead. KEPT.
2. **`packages/ui` singles — RESOLVED.** `use-mobile` + `NavLink` were truly unimported (moved); `ThemeToggle` (marketing Navbar) + `WhatsAppButton` (marketing Contact) are USED → kept.
3. **Unused shadcn — RESOLVED.** Alias-aware pass (greping `@repo/ui/components/ui/<name>` incl. intra-package edges, iterative leaf-prune) found 19 unused components; moved + build-verified across all 3 apps. The remaining 30 are reachable.
4. **`apps/marketing/src/App.css`, `packages/ui/src/styles.css`** — knip flags CSS it can't trace; likely imported by `main.tsx`. KEPT.
5. **Tooling caveat:** both `knip` and `madge` produced heavy false positives on this monorepo's `@repo/*` deep-path aliases and on Supabase function roots. Every move was hand-verified with scoped `git grep` (with control symbols) + typecheck + build. Treat any future automated run with the same skepticism.

## Prior-sweep reconciliation
This sweep is incremental on "Repo Janitor 2026-06-21". Notably, that sweep **copied** the admin `order-details/` subtree into `_unused/` but left live duplicates behind; this sweep completed that move. No previously-quarantined file was re-touched.

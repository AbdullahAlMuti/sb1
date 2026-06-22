# TODO — Conservative Dead-File Sweep

See [plan-deadfile-sweep.md](plan-deadfile-sweep.md) for the full model, roots, dependency graph, and risks.
**Status: AWAITING APPROVAL — read-only, nothing moved.** Stop at every ◇ gate.
Hard rule: move only if zero edits to any other file are needed. Unsure → KEEP + report.

**Decisions locked (2026-06-22):** (1) Move-set tier = **HIGH only** (MEDIUM/LOW reported but kept). (2) Dirty tree investigated — it is 73 prior-sweep deletions tangled with **47 files of live billing/audit-remediation WIP**. Recommended resolution: **commit a WIP checkpoint** on the current branch, then branch (commit > stash because Phase-4 `git reset --hard` rollbacks would otherwise destroy the billing WIP). *Awaiting human go on the checkpoint commit.*

## Phase 0 — Safety preflight  *(gate)*
- [ ] P0.1 Resolve dirty tree — **investigated**: 73 deletions = prior sweep; 47 M = live billing/audit WIP (27 supabase fns, 12 admin pages, ProtectedRoute, etc.). **Recommend `git add -A && git commit` WIP checkpoint, then branch.** STOP for human go before committing.
- [ ] P0.2 `git checkout -b chore/deadfile-sweep` from the agreed clean base.
- [ ] P0.3 Produce per-surface inventory (counts, languages, entry points).
- [ ] P0.4 Confirm scope: Vite-SPA root model (not Next.js); union 3 extension manifests; enumerate `supabase/functions/*` + `packages/*`; get sign-off on §6 ambiguous-dir scope + prior-sweep reconciliation.
- [ ] ◇ **Checkpoint 0 (GATE):** clean tree, on branch, inventory + scope confirmed by human.

## Phase 1 — Analysis (READ-ONLY)  *(gate)*
- [ ] P1.0 Tool probe: `npx --no-install` for knip/madge/depcheck/ts-prune; try `npx knip --no-exit-code`. If installs fail → fallback mode + downgrade all tiers one notch.
- [ ] P1.1 Build cross-surface graph: union all 3 manifests, **expand `web_accessible_resources` globs**, resolve `_shared` edges, span web+admin+marketing for `packages/*`.
- [ ] P1.2 Per non-root file: reachability + tier + **`path:line` evidence** (importer grep, basename grep, string-path grep, manifest/route membership).
- [ ] P1.3 Write `_audit/deadfile-candidates.md` — table per surface + lists: Tests(KEEP), Docs/MD, Needs-human(UNVERIFIED), Roots-excluded, Already-in-`_unused/`.
- [ ] ◇ **Checkpoint 1 (GATE):** present manifest; **wait for explicit approval**. No moves.

## Phase 2 — Human review gate
- [x] P2.1 Tiers approved: **HIGH only** (locked 2026-06-22). Tests + docs excluded by default. MEDIUM/LOW reported, not moved. (Still gated on the Phase-1 manifest before any actual move.)

## Phase 3 — Execute moves (per-surface batches)  ✅ DONE (19 files, 0 rollbacks)
Order: marketing → admin → web → packages → extension → supabase.
- [x] P3.1 marketing — no candidates.
- [x] P3.2 admin — `order-details/` dead island (11 files), commit `7bc4408`.
- [x] P3.3 web — checkout + dashboard-layout islands (7 files), commit `29803ce`.
- [x] P3.4 packages — none moved (candidates KEPT, see report).
- [x] P3.5 extension — only `extension_backup_phase0.zip` (commit `7f1aee7`); no source touched.
- [x] P3.6 supabase — none (all functions are roots).
- [x] P3.7 Restore lines appended to `_unused/RESTORE_LOG.md` (Sweep 2 section).

## Phase 4 — Verify (after EACH surface batch)  *(gate per surface)*
- [ ] P4.web/admin/marketing: `typecheck:<app>` + `build:<app>` + root `lint` green (marketing build runs prerender-blog).
- [ ] P4.packages: `npm run typecheck` (all 3 apps) green.
- [ ] P4.extension: `typecheck` + `build` (3 bundles) + `lint` + `npm test` + `prepare:prod`→`verify:prod` green.
- [ ] P4.supabase: `node scripts/check-edge-functions.mjs` (+ `deno check` if available) green.
- [ ] Failure protocol: roll back batch immediately; mark offending file **proven false positive → permanent KEEP**; continue with the rest.
- [ ] ◇ **Checkpoint per surface (GATE):** all checks green before next surface.

## Phase 5 — Report & handoff
- [ ] P5.1 Commit each verified batch separately (`chore(deadfile): quarantine <surface> dead files` + Co-Authored-By trailer).
- [ ] P5.2 Final report: counts (scanned/moved/kept/false-positives), per-surface verification, branch + commit hashes, `_unused/RESTORE_LOG.md` location, "unsure about" list.
- [ ] STOP: do not delete `_unused/`, do not merge, do not push.

## Guardrails (apply to every task)
- [ ] DENYLIST never moved: manifests/locks (incl. both `bun.lockb` + `package-lock.json`), `*.config.*`, all `manifest*.json` + declared files, `supabase/migrations/**` + `config.toml`, `.env*`, `.github/**`, `vercel.json`, deploy scripts, repo meta, **all `*.d.ts`**.
- [ ] Never treat the root `tailwind.config.ts` `apps/**` content glob as a usage reference (F5).
- [ ] `public/**` assets, extension string-path targets, `*.d.ts`, unresolved dynamic imports → report only, never move.
- [ ] No content edits, ever. Move whole files only. `_unused/` is never deleted by us.

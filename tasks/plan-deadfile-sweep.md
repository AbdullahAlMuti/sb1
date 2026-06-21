# Plan — Conservative Dead-File Sweep (Quarantine, Not Delete)

> Status: **AWAITING APPROVAL — read-only, nothing moved yet** · Date: 2026-06-22
> Author role: senior build/release engineer · Mode: paranoid, bias-to-keep
> **Decisions locked:** move-set tier = **HIGH only**. Dirty-tree resolution = commit a WIP checkpoint then branch (rationale: Phase-4 `git reset --hard` rollbacks would destroy the 47-file billing WIP if left uncommitted) — *awaiting human go on the checkpoint commit.*
> Companion checklist: [todo-deadfile-sweep.md](todo-deadfile-sweep.md)
> Phase-1 evidence output will live at `_audit/deadfile-candidates.md` (does not exist yet).

---

## 0. Prime directive (the one rule)

**A file may be quarantined ONLY if moving it requires zero edits to any remaining file.**
If relocating a file would force a rewrite of an import, string path, config glob, or manifest
entry anywhere else, the file is — by definition — still in use. We move whole, unreferenced
files into `_unused/<mirrored-path>` with `git mv`. We never edit file contents. The human
deletes later. False positive (moving a used file) = critical failure. False negative (leaving
a dead file) = acceptable, expected, and preferred when unsure.

---

## 1. Critical findings that reshape the brief

The brief was written assuming a Next.js stack and a clean tree. Neither holds here. These
adaptations are load-bearing — read them before executing anything.

| # | Brief assumption | Reality in this repo | Consequence |
|---|---|---|---|
| F1 | Next.js (App/Pages Router) for dashboard/admin/marketing | **Vite + React Router SPAs.** No `next.config.*` exists. Entry = `apps/<app>/index.html` → `<script src="/src/main.tsx">` → `App.tsx` route tree. | Discard App/Pages-Router root detection. Roots = the three `index.html` files + their `main.tsx` graphs. File-system routing does **not** apply — routes are explicit `<Route>` elements, so a "page" component is only reachable if imported into a route. |
| F2 | Clean working tree at Phase 0 | **Dirty: 124 changed files, 4 untracked.** Most `D` entries are a prior sweep's deletions, already mirrored into `_unused/`. | Phase 0 cannot start until the tree is committed/stashed. This is the first gate (Task P0.1). |
| F3 | Greenfield quarantine | **A sweep already ran**: `_unused/` exists with mirrored `apps/`+`packages/` trees and `_unused/RESTORE_LOG.md` ("Repo Janitor — 2026-06-21", Tier A/B). | Reconcile, don't restart. Reuse the existing `_unused/<mirror>` layout and **append** to `RESTORE_LOG.md` (repo already uses `RESTORE_LOG.md`, not the brief's `RESTORE.md` — keep the existing name). Skip files already quarantined. |
| F4 | `knip`/`madge`/`depcheck` available | **No knip/madge config; offline-install risk** on this Windows box. | Probe tool availability first (Task P1.0). If install fails, fall back to `madge --orphans` + exhaustive grep and **downgrade every confidence tier by one** (per the brief's own fallback rule). |
| F5 | One Next app per surface | **Single root `tailwind.config.ts`** with `content: ["./apps/**/*.{ts,tsx}", "./packages/**/*.{ts,tsx}"]` covering all surfaces. | A file matching this glob is **not** "used" by it — Tailwind scans for class names; moving a file out of `apps/**` simply drops it from the scan with zero edits. So the tailwind content glob is a **non-blocker** and must not be treated as a usage reference. |
| F6 | Surfaces are independent | `packages/*` (`auth`, `api-client`, `ui`, `types`, `marketplace-core`, `config`, `utils`) are **shared across all three web apps** via `@repo/*` Vite aliases. | The reference graph MUST span all three apps before any `packages/*` file is called dead. A file dead in `web` may be alive in `admin` or `marketing`. |

Additional surface inventory:
- **Workspaces:** `apps/*` + `packages/*` (npm workspaces). Apps: `web` (:3001), `admin` (:3002), `marketing` (:3000), `extension`.
- **Two lockfiles present:** `bun.lockb` AND `package-lock.json`. Both are DENYLIST — do not touch either.
- **Non-app top-level dirs** rich in candidates but mixed with infra: `dist/`, `scratch/`, `reference/`, `agents/`, `services/`, `load-tests/`, `docs/`, plus `apps/backup_temp/`, `apps/extension_backup_phase0.zip`, and many root `*.md`. Scope decisions for these in §6.

---

## 2. Roots model (adapted per surface)

A file is a quarantine candidate only if **unreachable from every root across every surface**.

### 2a. Web SPAs — `apps/web`, `apps/admin`, `apps/marketing`
Roots (entry points, never imported-from-above):
- `apps/<app>/index.html` (declares `<script type="module" src="/src/main.tsx">` + any `<link>`/`<img>`).
- `apps/<app>/src/main.tsx` → `App.tsx` → the explicit `<Route>` component tree and everything they import.
- `apps/<app>/vite.config.ts` `build.rollupOptions.input` if it declares extra HTML entries (verify per app).
- `apps/marketing/scripts/prerender-blog.mjs` is part of its `build` script — treat as a root and follow its imports.
- `public/**` per app: URL-served, referenced as string paths (`src="/x.svg"`), **not** imported. Grep basenames; default KEEP at MEDIUM max.

NOT roots / NOT a usage signal: the root `tailwind.config.ts` content glob (see F5).

### 2b. Chrome MV3 extension — `apps/extension`
Roots = everything declared across **all three manifests** (`manifest.json` = dev/active, `manifest.dev.json`, `manifest.prod.json` — union them; prod ships a different set):
- `background.service_worker` → `background/index.js` (+ its full import graph: message-router, listing-runner, etc.).
- Every `content_scripts[].js` and `.css` (10 content-script groups; includes the long `common/*` chains and `ui/panel.css`).
- Every `web_accessible_resources[].resources` entry — **expand globs**: e.g. `assets/stickers/*`, plus explicit `ui/*.html`, `sidepanel/*`, `common/images/**`, `src/image-uploader.js`.
- `sidepanel/side-panel.html` (+ its `<script>`/`<link>`), `ui/*.html` and their referenced JS/CSS.
- `icons`/`action`/`options` if present (current dev manifest: no `action.default_popup`, no `options`, no `side_panel` key — side panel is opened programmatically; verify in prod manifest too).
- **String-path roots not in any import graph** (grep-only): `chrome.runtime.getURL('...')`, `chrome.scripting.executeScript({ files: [...] })`, `chrome.offscreen.createDocument({ url })`, `new Worker('...')`, dynamic `import()`. Treat every extension string-path target as **high-risk false positive → KEEP unless the string is provably dead.**
- Build inputs: `vite.config.js`, `vite.config.amazon.js`, `vite.config.walmart.js` `input`/`entry` fields are roots (they produce `build/*.bundle.js` referenced by the manifest).
- Prepare/verify scripts (`scripts/prepare-extension-*.js`, `verify-extension-prod.js`) and their copy/IGNORE lists are roots — a file named in an IGNORE_LIST is still referenced.

### 2c. Supabase — `supabase/functions/<name>/**`
- Each function directory is **its own independent root** (deployed separately; never imported by the web apps). Do NOT infer "unused" from the app graph.
- `supabase/functions/_shared/**` is imported across many functions — resolve those edges before calling any `_shared` file dead.
- `supabase/migrations/**`, `supabase/config.toml`, seed files: **DENYLIST — never touch.**

### 2d. Shared packages — `packages/*`
- Reachable if imported by any reachable file in any of the three web apps (via `@repo/<name>` alias) OR re-exported through a reachable barrel (`index.ts`). Span all apps first.

---

## 3. Cross-surface dependency graph (analysis order)

```
                 ┌─────────────── packages/* (@repo/auth, api-client, ui, types,
                 │                 marketplace-core, config, utils)  ── shared leaf
   index.html ──┤
   (web/admin/  │   apps/web ─────┐
    marketing)  │   apps/admin ───┼──► import @repo/*  (must union all 3 before
                 │   apps/marketing┘     declaring any package file dead)
                 │
   manifest.json (x3) ──► apps/extension  (string-path + import graph; isolated,
                                            shares nothing with web apps)
   each function dir ──► supabase/functions/*  (independent roots; _shared is internal)
```

**Implications for ordering:**
- Analyze the three web apps **together** (shared package graph) — you cannot mark a `packages/*` file dead from a single app.
- The extension and Supabase are **isolated** — analyze and verify each independently; failures there can't break web apps and vice-versa.
- Move order (least-coupled first, so any breakage is localized): **marketing → admin → web → extension → supabase**. `packages/*` candidates move only after all three web apps are analyzed, batched with whichever app's verification can prove them safe (in practice: a dedicated `packages` batch verified by typechecking all three apps).

---

## 4. Tooling plan

1. **Probe (P1.0):** attempt `npx --no-install knip`, `npx --no-install madge`, `npx --no-install depcheck`, `npx --no-install ts-prune`. Record what's available. Attempt a one-time `npx knip@latest --no-exit-code` (report mode only) — if the network blocks it, log and fall back.
2. **Primary signal (if available):** `knip` (Vite + monorepo aware) in report mode: `npx knip --no-exit-code`. Cross-check with `madge --orphans` per app `src/` and `ts-prune`.
3. **Fallback (if installs fail):** `madge --orphans apps/<app>/src` (if madge present) + **exhaustive grep** for every candidate's basename and string-path forms. Per F4, **downgrade every tier by one** in fallback mode.
4. **Cross-check is mandatory, never optional:** for EVERY candidate, grep the whole repo for the basename and string-path forms (`getURL`, `executeScript`, `src="/..."`, `import('...')`, manifest entries) before trusting any tool verdict. **Intersection wins:** unreachable in the import graph AND zero string/config/manifest hits AND not a root. Any single hit → KEEP.

> No new tools are added to `package.json`. All tool use is via `npx` in report mode only.

---

## 5. Confidence tiers & special categories (as applied here)

**Tiers**
- **HIGH** — orphan with a dead-marker (`*.old.*`, `*.bak`, `*.backup.*`, `*-copy.*`, `*.unused.*`, `*_backup*`, `*_diff_backup*`, `.patch` scratch), unreachable in graph, zero grep hits, not a root → eligible to move after approval.
- **MEDIUM** — unreachable + zero grep hits but no dead-marker → separate list; move only on explicit MEDIUM approval.
- **LOW / UNVERIFIED** — any unresolved dynamic import, any `public/**` asset, any extension string-path target, any `*.d.ts`, anything not fully traced → **never move**; report only.

**Always-separate lists (default KEEP)**
- **Tests:** `*.test.*`, `*.spec.*`, `__tests__/**`, and the extension's `tests/**/*.test.js` (run by `node --test`). Moving these breaks CI. KEEP by default; list for human.
- **Docs/MD:** the ~20 root `*.md` + `docs/**`. Usually safe but confirm none are imported (MDX) or referenced by `prerender-blog.mjs`/build. Separate list.
- **Barrels:** never move an `index.ts` that re-exports any reachable file.

**DENYLIST (never move, even if they look unused):** `package.json`/locks (`package-lock.json`, `bun.lockb`), `tsconfig*.json`/`jsconfig.json`, any `*.config.{js,ts,mjs,cjs}` (vite/tailwind/postcss/eslint/playwright), `eslint.config.js`, `playwright.config.ts`, `postcss.config.js`, all extension `manifest*.json` + everything they declare, `supabase/migrations/**`, `supabase/config.toml`, `.env*`, `.npmrc`, `.github/**`, `vercel.json`, `Dockerfile*`, deploy scripts (`deploy-google-sheets.ps1`), `.gitignore`/`.gitattributes`/`LICENSE`/root `README*`, and **all `*.d.ts`**.

---

## 6. Scope decisions for ambiguous top-level dirs (resolve at Phase 0)

These are candidate-rich but mixed; the human should confirm scope before Phase 1 spends effort on them:
- `dist/`, `apps/backup_temp/`, `apps/extension_backup_phase0.zip` — build output / explicit backups. **Proposed: in-scope, HIGH** (dead-markers), but verify nothing references them.
- `scratch/`, `reference/`, `_unused/` itself — **proposed: OUT of scope** (`scratch`/`reference` are intentional sandboxes; `_unused/` is the destination, not a source).
- `agents/`, `services/`, `load-tests/`, `smoke_tests.js`, `playwright-fixture.ts` — **proposed: OUT of scope / UNVERIFIED** until we confirm they aren't wired into CI or `playwright.config.ts`.
- Root `*.md` (≈20 files) + `docs/**` — **proposed: separate Docs list, default KEEP**, human decides.

> These are §2 of the Phase-0 questions (Task P0.4). No analysis effort is spent on OUT-of-scope dirs.

---

## 7. Phased execution (vertical slices, gate at every checkpoint)

Each surface is one **vertical slice**: analyze → manifest its candidates with evidence → (after approval) quarantine that surface's batch → verify that surface → commit. We do not do a horizontal "analyze everything, then move everything" — each surface is proven end-to-end before the next starts.

### PHASE 0 — Safety preflight  *(gate: human confirms before Phase 1)*
- **P0.1** Resolve the dirty tree. Current branch `fix/billing-webhook-drift-and-credits` has 124 uncommitted changes (largely the prior 2026-06-21 sweep). Commit or stash them so `git status` is clean. **STOP and ask the human how to handle these** — do not assume.
- **P0.2** Create and check out `chore/deadfile-sweep` from the agreed clean base.
- **P0.3** Produce the file inventory per surface (counts, languages, detected entry points) → preflight summary.
- **P0.4** Confirm router model (Vite SPA, per F1), locate all three manifests, enumerate `supabase/functions/*`, list `packages/*`, and get human sign-off on the §6 scope decisions + the prior-sweep reconciliation approach.
- **Acceptance:** clean `git status`; on `chore/deadfile-sweep`; inventory + scope decisions written; human confirms.
- **◇ Checkpoint 0 (GATE).**

### PHASE 1 — Analysis (READ-ONLY)  *(gate: human approves the manifest)*
- **P1.0** Tool-availability probe (§4). Record availability; set fallback/tier-downgrade flag.
- **P1.1** Build the cross-surface reference graph. Union all three manifests; **expand `web_accessible_resources` globs**; resolve `_shared` edges; span all three web apps for `packages/*`.
- **P1.2** For each non-root file: determine reachability, assign tier with **`path:line` evidence** for every check run (importer search, basename grep, string-path grep, manifest/route membership).
- **P1.3** Write `_audit/deadfile-candidates.md`: one table per surface (File | Tier | Why unreachable + evidence | Category | Action), then the explicit lists — **Tests (KEEP)**, **Docs/MD**, **Needs human decision (UNVERIFIED)**, **Roots excluded** (so the human can sanity-check entry-point detection), and a **"Already in `_unused/`"** reconciliation list.
- **Acceptance:** `_audit/deadfile-candidates.md` exists; every candidate has citations; no file moved; UNVERIFIED items flagged and excluded from any move set.
- **◇ Checkpoint 1 (GATE) — present manifest, wait for explicit approval.**

### PHASE 2 — Human review gate
- **P2.1** Human approves which tiers/categories to act on (e.g. "HIGH only", "include MEDIUM", "exclude all tests/docs"). No move proceeds without explicit go. Record the approved set verbatim in the todo.

### PHASE 3 — Execute moves (per-surface batches)  *(verify after each)*
Move order: **marketing → admin → web → packages → extension → supabase** (least-coupled first).
- For each approved file: `git mv <path> _unused/<path>` (create mirrored dirs as needed; mirror the original path exactly).
- One surface batch at a time; **run Phase 4 verification before the next surface.**
- Append every move to `_unused/RESTORE_LOG.md` (existing file) with a one-line restore command per file. (Keep the repo's existing `RESTORE_LOG.md` name; do not introduce a second `RESTORE.md`.)
- **Acceptance per batch:** only approved files moved; mirror path correct; restore line appended; nothing edited in place.

### PHASE 4 — Verify (after each surface batch)
Per affected surface, run what the repo defines:
- Web apps: `npm --workspace @sellersuit/<app> run typecheck` (`tsc --noEmit`) **and** `npm run build:<app>` (Vite build). Lint: `npm run lint` (root eslint). Marketing build also runs `prerender-blog.mjs`.
- `packages/*` batch: typecheck **all three** apps (`npm run typecheck`) since packages are shared.
- Extension: `npm --workspace @sellersuit/extension run typecheck` (`tsc -p jsconfig.json`), `npm run build` (3 Vite bundles), `npm run lint`, `npm test` (`node --test`), and `npm run verify:prod` after `prepare:prod`.
- Supabase: `node scripts/check-edge-functions.mjs` (repo's function checker) and `deno check` per touched function if Deno is available.
- **Failure protocol:** immediately roll the batch back (`git mv` back, or `git reset --hard` to the pre-batch commit). Record the offending file as a **proven false positive → permanent KEEP**. Continue with the rest of the batch. **Never carry a broken build forward.**
- **◇ Checkpoint per surface (GATE):** typecheck + build + lint + tests green before moving to the next surface.

### PHASE 5 — Report & handoff
- **P5.1** Commit each verified batch separately with a descriptive message (`chore(deadfile): quarantine <surface> dead files`). End commit messages with the required `Co-Authored-By` trailer.
- **P5.2** Final report: counts (scanned / moved per surface / kept-uncertain / proven-false-positives), verification results per surface (typecheck/build/lint/test pass-fail), branch name + per-batch commit hashes, location of `_unused/RESTORE_LOG.md`, and a plain-English "things I was unsure about and why" list.
- **STOP.** Do not delete `_unused/`, do not merge, do not push. Human reviews and decides.

---

## 8. Risks & unknowns (surfaced now, not later)

1. **Dirty tree / prior sweep entanglement (highest risk).** The 124 uncommitted changes must be committed or stashed first (P0.1) or moves will be impossible to attribute and rollback. We must not double-quarantine files already in `_unused/`.
2. **Extension string-path traps.** `web_accessible_resources` globs (`assets/stickers/*`), `getURL`, `executeScript({files})`, programmatic side-panel open. Static tools miss all of these → every extension candidate gets mandatory grep cross-check and defaults to KEEP when a string match exists.
3. **Tooling/offline.** If `npx` installs fail, we run in fallback mode with tiers downgraded one notch (F4) — fewer HIGH candidates, more KEEP. Acceptable by design.
4. **Shared packages.** Marking a `packages/*` file dead requires proving it across web AND admin AND marketing; easy to get a false positive from a single-app view.
5. **`public/**` and `*.d.ts`.** Never moved this pass — reported only.
6. **Two lockfiles + many config files.** All DENYLIST; no analysis needed, but listed so the human can confirm the entry-point detection didn't miss a build input.

---

## 9. Deliverables

- `_audit/deadfile-candidates.md` (Phase 1 manifest with citations).
- Per-surface quarantine commits on branch `chore/deadfile-sweep`.
- Updated `_unused/RESTORE_LOG.md` (appended, mechanical restore commands).
- Final report (Phase 5) pasted into the chat and/or `_audit/deadfile-final-report.md`.
- This plan + [todo-deadfile-sweep.md](todo-deadfile-sweep.md).

---

## 10. Note on file placement

Per the brief, Phases 0–2 are read-only on the working tree **except** report files under `_audit/`. This planning doc and its todo are written under `tasks/` (the repo's existing planning convention — `plan-billing-audit.md`, `plan-flow-consolidation.md`, etc.), deliberately **not** overwriting the active auth/billing-flow plan in `tasks/plan.md`. If you'd rather these live at `tasks/plan.md`/`tasks/todo.md`, say so and I'll relocate them.

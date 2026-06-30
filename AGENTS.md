# AGENTS.md

Instructions for AI coding agents working in this repository. This complements
[`CLAUDE.md`](CLAUDE.md) (architecture/commands) and
[`AI_AGENT_SCOPE_EBAY_ONLY.md`](AI_AGENT_SCOPE_EBAY_ONLY.md) (product scope).

---

## 0. SCOPE — READ THIS FIRST

> **This SaaS is currently eBay-only. Shopify is disabled and is future scope only.**

Before planning, analyzing, reporting, or writing any code, read
[`AI_AGENT_SCOPE_EBAY_ONLY.md`](AI_AGENT_SCOPE_EBAY_ONLY.md). The short version:

- **eBay is the only active marketplace.** All current work targets eBay, the
  Chrome extension, supplier import (Amazon/Walmart → normalized product → eBay),
  eBay listing/variation/SKU/pricing/image logic, the user dashboard, the admin
  panel, billing/credits/limits, and the supporting backend/DB/queue/worker.
- **Shopify is disabled.** It exists in the repo but is **not** part of the
  current product. Do not treat it as active, do not analyze it as a current
  feature, do not recommend or implement Shopify improvements.
- **Do not delete Shopify code, tables, or migrations.** Prefer feature-flag
  gating. Touch Shopify only if it breaks the active eBay build/runtime.
- **Reports & diagrams:** include only eBay workflow. The only permitted Shopify
  mention is: *"Shopify exists in the repository but is intentionally disabled
  and is future scope only."*
- **Ambiguity defaults to eBay-only.** This holds until the owner explicitly
  says *"Enable Shopify now."*

---

## 1. Repository orientation

This is a monorepo. See [`CLAUDE.md`](CLAUDE.md) for the full map. Key apps:

- `apps/web` — React/TypeScript SPA (marketing site + authenticated eBay dashboard)
- `apps/extension` — Manifest V3 Chrome extension (vanilla JS); **source of truth**
- `apps/admin` — admin panel
- `apps/marketing` — marketing site
- `packages/*` — shared `@repo/*` packages (auth, api-client, ui, types, config, …)
- `supabase/functions` — ~50 Deno Edge Functions
- `supabase/migrations` — sequential SQL migrations

## 2. Working agreement

- **Local-first feature rule.** Every new feature must be implemented and tested
  against the local/dev environment first. For extension work, build and load
  `apps/extension/dist/extension-dev`; for web/admin/backend work, use the local
  servers and local or non-production backend targets. Only after the local/dev
  flow works should the production build or generated production extension copy
  be prepared. This is a permanent gate: use `npm run qa:local` before release
  work, and keep root production scripts wired so local/dev verification runs
  before production artifacts are created.
- **Edit the extension in `apps/extension/` only.** `apps/web/public/chrome_extension/`
  is a generated copy — never edit it directly.
- **Match surrounding code.** Follow existing naming, comment density, and idioms.
- **Confirm outward-facing or hard-to-reverse actions** before doing them
  (deploys, deletes, sending data to external services).
- **Report outcomes faithfully.** If tests fail, say so with output; if a step
  was skipped, say that.
- Use the engineering skills/slash commands described in `CLAUDE.md`
  (`/spec`, `/plan`, `/build`, `/test`, `/review`, `/ship`, …) where they fit.

## 3. Common commands

```bash
npm run dev          # web dev server (port 3001)
npm run dev:local    # extension watcher + local marketing/web/admin servers
npm run typecheck    # tsc --noEmit across apps
npm run lint         # eslint
npm run build        # build marketing + web + admin
npm run check:local  # pre-release gate (env + security + typecheck + lint + build)
```

Extension (from `apps/extension/`):

```bash
npm test                 # Node built-in test runner
npm run build            # build main + amazon + walmart bundles
npm run prepare:prod     # production build → dist/extension-prod/
```

## 4. Before you finish

- Run `npm run typecheck` and relevant tests for code you touched.
- Verify previewable web changes via the preview workflow (don't ask the user to
  check manually).
- Keep Shopify out of any new user-facing surface, report, or roadmap.

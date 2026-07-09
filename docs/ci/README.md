# CI workflow (DEVOPS-P1)

`ci.yml` in this folder is the proposed GitHub Actions CI gate. It runs on every
PR and push to `main`:

| Job | What it runs |
|-----|--------------|
| `node` | `npm ci` → `npm run lint` → `npm run typecheck` → extension unit tests |
| `deno` | `deno check` on all `supabase/functions/**/*.ts` (catches the edge-function type errors the PRs flagged) |
| `db-tests` | `supabase start` → `supabase test db` (pgTAP: RLS isolation, billing idempotency, and the credit-mint regression) |
| `e2e` | Playwright smoke (`e2e/smoke.spec.ts`) |

## Why it's here and not in `.github/workflows/`

The connected GitHub app token does **not** have the `workflow` OAuth scope, so it
cannot create or update files under `.github/workflows/` via the API (the push is
rejected with `403 Resource not accessible by integration`). This repo's
`.gitignore` even excluded `.github/` for that reason.

## Install (one-time, needs a human with repo write + workflow permission)

```bash
mkdir -p .github/workflows
git mv docs/ci/ci.yml .github/workflows/ci.yml   # or: cp docs/ci/ci.yml .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "ci: install CI workflow"
git push
```

`.gitignore` has already been updated (in this PR) to keep `.github/workflows/`
tracked, so the file above will be committed normally once added.

## Secrets / prerequisites

- `db-tests` needs Docker on the runner (GitHub-hosted `ubuntu-latest` has it) for `supabase start`.
- `e2e` reads optional repo secrets `E2E_BASE_URL` (deployed marketing site) and
  `E2E_APP_URL` (customer app, enables the noindex check). Without them the
  homepage check runs against the default and the app check skips.

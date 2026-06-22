# SellerSuit — Launch Runbook (2026-06-22)

Single source of truth for the **remaining** steps to a paid public launch, reflecting everything
completed in the 2026-06-22 production-readiness pass. Supersedes the dated `OPERATOR_ACTIONS.md`
(2026-06-14) where they differ. Every step below requires account/dashboard credentials — they are
the irreducible human-only actions. ~30–45 min total.

---

## Already done (code + database) — do NOT redo

- **DB migrations applied to prod & verified (2026-06-22):**
  - `deduct_credits_atomic` — fixes the AI-credit drift (was missing from prod).
  - `lockdown_definer_execute_grants` — anon-executable SECURITY DEFINER fns 28→2, mutable search_path 1→0,
    closed the `deduct_usage_atomic` IDOR. `is_admin`/`has_role` intentionally kept (41 RLS policies use them).
  - `fk_covering_indexes` — 12 unindexed foreign keys indexed.
- **CSP set to enforcing** in all 4 `vercel.json` (was Report-Only) — *takes effect on next deploy; verify preview (step 6).*
- **Test net enforced** — `npm test` = 281 tests, in `check:local` + `ci.yml`.
- Security advisors: 0 ERROR; remaining WARNs are accepted (self-guarding admin RPCs, pg_trgm-in-public) or
  step 4 below (leaked-password).

---

## Remaining steps (ordered — order matters)

### 1. Vercel env vars (web, marketing, admin projects) → then redeploy each
Production scope. `VITE_*` are baked at build time, so a fresh deploy is required after setting them.
| Var | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://ojxzssooylmydystjvdo.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → publishable/anon key |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key — **without this, registration CAPTCHA always passes** |
| `VITE_SENTRY_DSN` | Sentry → project → Client Keys (DSN) |
| `VITE_APP_URL` / `VITE_ADMIN_URL` | `https://app.sellersuit.com` / `https://admin.sellersuit.com` |

### 2. Supabase Edge Function secrets (Settings → Edge Functions → Secrets)
`STRIPE_SECRET_KEY` (sk_live), `STRIPE_WEBHOOK_SECRET` (from step 3), `RESEND_API_KEY`,
`LOVABLE_API_KEY`/`OPENAI_API_KEY`, `ALLOWED_ORIGINS`, `EXTENSION_ALLOWED_ORIGINS`,
`INTERNAL_FUNCTION_SECRET`, `ENVIRONMENT=production`.
> Billing is already live, so most of these are likely set — **confirm each is present** before step 5.

### 3. Stripe live webhook (Stripe → Developers → Webhooks → Add endpoint)
- URL: `https://ojxzssooylmydystjvdo.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET` (step 2).

### 4. Enable leaked-password protection
Supabase → Authentication → Policies (Password) → enable "Leaked password protection". (Clears the last security advisor WARN.)

### 5. Redeploy edge functions — ONLY after steps 1–2 confirm secrets are set
This activates the repo's current `plan-middleware` (which calls `deduct_credits_atomic`, now present in prod) and
the restored `stripe-webhook`/`create-checkout`. **Test in Stripe test mode / a staging key first if possible** —
a bad billing deploy breaks live checkout.
- Functions to redeploy: `stripe-webhook`, `create-checkout`, and the plan-middleware consumers
  (`create-listing`, `generate-titles`, `generate-description`, and any other AI/credit consumers).
- Verify: one test AI generation deducts exactly one credit (no double-spend); a test checkout writes a
  `stripe_events` row and lifts limits; replaying the event is a no-op.

### 6. Deploy web/marketing/admin, verify CSP, then promote
1. Open the Vercel **preview** for branch `chore/prod-readiness` (or after merge). Log in; click through
   dashboard, billing/checkout, blog.
2. DevTools console → confirm **no `Content-Security-Policy` violation** messages. (CSP is now enforcing, not
   report-only — a missed origin will *block* the resource.) If a violation appears, add the origin to that
   file's `connect-src`/`script-src` and redeploy before promoting.
3. Promote to production.

### 7. Enable CI
`.github/workflows/ci.yml` exists but `.github/` is gitignored (push token lacks `workflow` scope). Either grant
the token `workflow` scope and `git add -f .github/workflows/`, or paste `ci.yml` into a new workflow via the
GitHub web UI. CI runs `security:static` + `typecheck` + `lint` + `test` (281) + `build`.

### 8. Production smoke test = GO / NO-GO
Register (CAPTCHA challenges) → verify email (Resend) → pair extension (`auth-status` 200) → scrape →
create a plan-gated listing → paid checkout lifts limits → cancel revokes → `curl -I` the three apps shows
the security headers incl. `Content-Security-Policy` (not `-Report-Only`). **All green → launch.**

---

## Branch
All code/migration artifacts are on `chore/prod-readiness` (6 commits, **not pushed**). The 3 migrations are
**already applied to the live database**; the CSP/test/doc changes ship when the branch is merged & deployed.
See [tasks/plan-production-readiness.md](../tasks/plan-production-readiness.md) for the full phased plan and
Phase 4–5 (observability, scale) post-launch work.

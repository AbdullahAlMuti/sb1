# Operator Action Sheet — final launch steps (2026-06-14)

Every code/DB change is done and in [PR #1](https://github.com/AbdullahAlMuti/sb1/pull/1). The steps below
are the **only** things that need a human with account/credential access (entering secrets, payments,
publishing, GitHub scope). Each is mechanical — paste the listed values. ~45 min total.

---

## 1. Set production env vars, then REDEPLOY  ⚠️ build-time
**Vercel → web project (`sb1`) → Settings → Environment Variables** (Production):
| Var | Value source |
|---|---|
| `VITE_SUPABASE_URL` | `https://ojxzssooylmydystjvdo.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → publishable/anon key |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key **(without this the CAPTCHA always passes)** |
| `VITE_SENTRY_DSN` | Sentry → project → Client Keys (DSN) — optional but recommended |
| `VITE_APP_URL` | `https://app.sellersuit.com` |
| `VITE_ADMIN_URL` | `https://admin.sellersuit.com` |

Repeat the relevant `VITE_*` (Supabase, Sentry) on the **marketing** and **admin** Vercel projects.

**Supabase → Edge Functions → Secrets:** `STRIPE_SECRET_KEY` (sk_live…), `STRIPE_WEBHOOK_SECRET`
(from step 2), `RESEND_API_KEY`, `LOVABLE_API_KEY`/`OPENAI_API_KEY`, `ALLOWED_ORIGINS`,
`EXTENSION_ALLOWED_ORIGINS`, `INTERNAL_FUNCTION_SECRET`, `ENVIRONMENT=production`,
`VERCEL_DEPLOY_HOOK_URL` (optional, for blog auto-publish).

➡️ **`VITE_*` vars are baked at build time — trigger a fresh deploy after setting them.**
**Verify:** `curl -s https://app.sellersuit.com/assets/index-*.js | grep -c 1x00000000000000000000AA` → must be `0`.

## 2. Stripe live webhook
**Stripe Dashboard → Developers → Webhooks → Add endpoint:**
- **URL:** `https://ojxzssooylmydystjvdo.supabase.co/functions/v1/stripe-webhook`
- **Events** (exactly these — what the handler processes):
  `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Copy the endpoint's **Signing secret** → set as `STRIPE_WEBHOOK_SECRET` (step 1).

## 3. Enable Supabase leaked-password protection
**Supabase → Authentication → Policies (Password) → enable "Leaked password protection".**

## 4. Deploy PR #1 to a preview, verify CSP, then flip to enforcing
1. Open PR #1's Vercel **preview** URL. Log in; click through **dashboard, billing/checkout, blog**.
2. DevTools console → confirm **no `Content-Security-Policy` violation** messages.
   *(Already locally verified clean for landing/auth/Turnstile/Supabase + Sentry origin added; this
   covers the authenticated dashboard + live Stripe which can't be tested without login.)*
3. If clean, in all four `vercel.json` (root, `apps/web`, `apps/marketing`, `apps/admin`) rename the
   header key **`Content-Security-Policy-Report-Only` → `Content-Security-Policy`**. Commit + merge.
   If a violation appears, add the flagged origin to that file's `connect-src`/`script-src` first.

## 5. CI (optional, removes the regression gate gap)
`ci.yml` exists on disk but `.github/` is gitignored because your push token lacks `workflow` scope.
Either grant the token `workflow` scope and `git add -f .github/workflows/ci.yml`, or paste the file's
contents into a new workflow via the GitHub web UI.

## 6. Submit the Chrome extension
Build is publish-ready (`npm --workspace @sellersuit/extension run verify:prod` → "Safe to publish").
**Chrome Web Store Developer Dashboard:** upload `apps/extension/dist/extension-prod/` (zipped),
privacy policy URL `https://sellersuit.com/privacy`, complete data-use disclosures (product scraping,
auth token, storage), screenshots, description → submit for review.

## 7. Production smoke test = GO/NO-GO
Register (CAPTCHA challenges) → verify email (Resend) → pair extension (`auth-status` 200) → scrape →
create a plan-gated listing → paid checkout lifts limits → cancel revokes → `curl -I` the three apps
shows the security headers. **All green → launch.**

---

### Already done for you (no action)
Security headers/CSP wiring (was silently off — fixed via routes→rewrites), email-enumeration/PII leak
closed, function `search_path` pinned, public-bucket listing closed, lint gate green, Sentry wired in all
three apps, extension verified. See [LAUNCH_FIX_PLAN_2026-06-14.md](LAUNCH_FIX_PLAN_2026-06-14.md).

# Production Launch Runbook

Owner-only steps that require dashboard access / secret values an agent cannot hold.
Supabase project: `ojxzssooylmydystjvdo`. Generated 2026-06-25.

> **Status of the agent-doable work (already complete):**
> - Role collapse migration **applied to prod + verified** (`super_admin` → `admin`, 0 remaining).
> - `audit_logs_rls` + `homepage_content` migrations **applied**; `admin_settings` RLS already in place.
> - Code committed: `6f3e735` (role collapse), `aab2b74` (migration files). Gates green.
> - **Not deployed by design:** the edge-function + frontend cleanup is non-urgent (old prod code
>   works post-migration). Deploy it through the normal release flow below when the branch is ready.

---

## 1. Turnstile (Cloudflare) — bot protection key

1. Cloudflare dashboard → **Turnstile** → create/select the widget for the prod domain.
2. Copy the **Site Key** (public) and **Secret Key** (private).
3. Site Key → frontend env (Vercel): `VITE_TURNSTILE_SITE_KEY` on the **web** project (Production scope).
4. Secret Key → Supabase Edge secret (used by the auth/verify functions):
   ```bash
   supabase secrets set TURNSTILE_SECRET_KEY=<secret> --project-ref ojxzssooylmydystjvdo
   ```
5. Redeploy the web app + any function that verifies Turnstile.

## 2. Stripe webhook registration

1. Stripe dashboard (**live mode**) → Developers → **Webhooks** → Add endpoint:
   `https://ojxzssooylmydystjvdo.supabase.co/functions/v1/stripe-webhook`
2. Select events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`,
   `invoice.paid`, `invoice.payment_failed` (match what `stripe-webhook/index.ts` handles).
3. Copy the endpoint's **Signing secret** (`whsec_...`).
4. Set the Supabase Edge secrets (live keys):
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_... \
                         STRIPE_WEBHOOK_SECRET=whsec_... \
                         --project-ref ojxzssooylmydystjvdo
   ```
5. Deploy `stripe-webhook` + `create-checkout` (see §6) **after** reviewing their diffs — the working
   tree has unreviewed billing changes ("webhook drift" per project notes); review before shipping.
6. Test with Stripe CLI `stripe trigger checkout.session.completed` or a $1 trial checkout.

## 3. Production secrets (Supabase Edge Functions)

Verify all required secrets are set for live (no test placeholders):
```bash
supabase secrets list --project-ref ojxzssooylmydystjvdo
```
Expected (cross-check against function code): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`TURNSTILE_SECRET_KEY`, eBay OAuth creds, any AI provider keys, `SUPABASE_SERVICE_ROLE_KEY`
(auto-present). Set any missing with `supabase secrets set KEY=value --project-ref ...`.

## 4. Security headers (Vercel)

Confirm `vercel.json` (root + per-app) sets, for marketing/web/admin:
`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
(or CSP `frame-ancestors`), `Referrer-Policy: strict-origin-when-cross-origin`, and a CSP.
Redeploy after editing. Verify: `curl -sI https://<domain> | grep -i -E 'strict-transport|content-type-options|frame'`.

## 5. Supabase Auth settings (dashboard)

- **Enable leaked-password protection** (flagged by advisors): Auth → Policies → enable
  "Check against HaveIBeenPwned".
- Confirm Site URL + Redirect URLs include the prod domains.
- Review email templates + rate limits.

## 6. Deploy the branch (when reviewed & ready — normal release flow)

Do this via your pipeline, NOT a blind agent push. Recommended order:
1. Finish/commit the `cleanup/safe-restructure` branch; open PR; review (especially `stripe-webhook`,
   `create-checkout`, and the edge functions with mixed WIP).
2. Merge to `main` → Vercel auto-deploys web/admin/marketing.
3. Deploy edge functions (review each first):
   ```bash
   supabase functions deploy <name> --project-ref ojxzssooylmydystjvdo
   # role-collapse cleanup set (optional, old code already works):
   #   admin-update-role admin-verify-email admin-sync-stripe-plans
   #   admin-get-users-verification trigger-marketing-deploy generate-marketing-post
   #   amazon-inventory-sync create-listing auth-otp  (+ _shared used by them)
   ```
4. Smoke test: signup → plan → $1 checkout → dashboard; confirm webhook delivers; confirm admin panel
   loads for an `admin` user.

## 7. Final gate

`check:local` requires a **local/test Supabase** (it refuses when `.env` points at prod — by design).
Point a local env at a test project, then:
```bash
npm run check:local   # env + security scan + typecheck + lint + test + build
```

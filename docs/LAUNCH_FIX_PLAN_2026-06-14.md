# SellerSuit — Launch Fix Plan v2 ("ship-it runbook") · 2026-06-14

Companion to [LAUNCH_READINESS_CHECKLIST_2026-06-14.md](LAUNCH_READINESS_CHECKLIST_2026-06-14.md).
v2 adds: a **safety net** (backup/preview/rollback), **copy-paste artifacts** for every fix, the
**build-time env gotcha**, **per-app CSPs** (verified origins), **launch-day monitoring**, a **one-day
runbook**, and a **risk register**. Legend: 🧑‍💻 in-repo (me) · 🧭 dashboard (you) · ⏱ effort.

> **Golden rule:** every change goes to a **preview/branch first**, gets verified, then promotes to prod.
> Nothing in Phase 1–3 touches prod without a tested preview and a known rollback.

---

## Phase −1 — Pre-flight & safety net (do FIRST) 🧭🧑‍💻 ⏱ 30m
- [ ] **DB restore point.** Confirm Supabase PITR/daily backup is on; take a manual snapshot before any
  migration. *Rollback = restore point + `DROP`/`REVOKE` inverse statements (kept with each migration).*
- [ ] **Migration sandbox.** Create a Supabase **dev branch**; apply Phase-1 migrations there first;
  run `get_advisors(security)`; only then apply to prod.
- [ ] **Preview deploys.** All `vercel.json`/code changes go to a **Vercel preview** URL first (every
  PR gets one). Verify there before promoting to production.
- [ ] **Abort criteria (write them down):** any of — checkout fails in live test, CAPTCHA still bypasses,
  a CSP white-screens an app, error rate >2% post-deploy → **roll back, don't push through.**

---

## Phase 0 — Ship the extension (parallel track, today) 🧭 ⏱ 1–2h
Build is publish-ready (`verify:prod` ✅, 217/217). This is store paperwork.
- [ ] 3–5 screenshots + listing copy.
- [ ] Privacy Policy URL = `https://sellersuit.com/privacy`; complete **data-use disclosures**
  (product-data scraping, auth token, local storage) — be explicit; vague disclosures get rejected.
- [ ] **Pre-empt review friction:** justify broad `host_permissions` (Amazon/Walmart/eBay) as core
  functionality in the "single purpose" field. Expect 1–3 day review; resubmit fast if rejected.
- [ ] `npm --workspace @sellersuit/extension run prepare:prod && npm --workspace @sellersuit/extension run verify:prod` → "Safe to publish" → zip `dist/extension-prod/` → submit.

---

## Phase 1 — Code/config fixes (one PR, preview-verified) 🧑‍💻 ⏱ 1.5–2.5h

### Step 1.1 — Revoke anon access to PII functions (P0 #5)
Migration `…_revoke_anon_pii_functions.sql` — **first** grep the public/anon client for callers
(register/onboarding may use `check_user_exists`); if so, route via an edge function or keep
`authenticated` only.
```sql
REVOKE EXECUTE ON FUNCTION public.check_user_exists(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_goal(text)     FROM anon, authenticated;
```
*Verify (dev branch):* advisor no longer lists them; register flow still works.
*Rollback:* `GRANT EXECUTE … TO authenticated;`

### Step 1.2 — Per-app security headers + CSP (P0 #6) — **do NOT copy web's CSP verbatim**
Verified origins: **marketing** uses Google Fonts + (at checkout) Stripe + Cloudflare Turnstile +
Supabase. **admin** uses Supabase + dicebear avatars. Add a `headers` block to each `vercel.json`.

**`apps/marketing/vercel.json` CSP:**
```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://challenges.cloudflare.com; frame-src https://js.stripe.com https://checkout.stripe.com https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'
```
**`apps/admin/vercel.json` CSP:**
```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'none'; object-src 'none'; base-uri 'self'
```
**Safe rollout:** ship as `Content-Security-Policy-Report-Only` first on the preview, click through
every page (checkout, avatars, blog), check console for CSP violations, add any missed origin, **then**
switch the header name to `Content-Security-Policy`. Plus the same `X-Frame-Options/Referrer-Policy/
Permissions-Policy/X-Content-Type-Options` block as root.
*Verify:* `curl -I <preview-url>` shows the headers; zero CSP console errors on every page.

### Step 1.3 — Remove committed backup (P1 #8)
```bash
git rm -r apps/backup_temp && git commit -m "chore: remove stale committed extension backup"
```

### Step 1.4 — Fix conditional hook (P1 #10)
`packages/auth/src/components/auth/TurnstileCaptcha.tsx` — call `useEffect` unconditionally, branch
inside:
```tsx
export function TurnstileCaptcha({ onVerify, onError, onExpire }: TurnstileCaptchaProps) {
  const isDev = import.meta.env.DEV;
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';
  useEffect(() => { if (isDev) onVerify('dev-token-bypass'); }, [isDev, onVerify]);
  if (isDev) return null;
  return (/* <Turnstile …/> */);
}
```
*Verify:* `npm run lint` has 0 `react-hooks/rules-of-hooks`.

### Step 1.5 — Clear lint parse false-positives (P1 #11)
`eslint.config.*` → `ignores: ["dist","supabase","**/dist","**/public/chrome_extension","**/*.cjs"]`
(`apps/backup_temp` gone after 1.3). *Verify:* parse errors → 0.

### Step 1.6 — Harden function search_path + confirm deny-all tables (P1 #13)
```sql
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.list_user_listings(text,text,integer,timestamptz,uuid) SET search_path = public;
ALTER FUNCTION public.create_listing_with_variations(uuid,jsonb,jsonb) SET search_path = public;
```
Confirm `rls_enabled_no_policy` tables (`stripe_events`, `support_notes`, `feature_*`,
`extension_session_*`, `function_rate_limits`) are touched **only** by service-role functions → safe as
deny-all; else add explicit owner/admin policy. *Verify:* advisor WARNs clear.

### Step 1.7 — Green the lint gate (P1 #9)
`eslint.config.*`: set `@typescript-eslint/no-explicit-any` → `"warn"` (keeps visibility, unblocks CI).
Fix the few real errors: `no-case-declarations` ×6 (wrap `case` bodies in `{}`), `prefer-const` ×5,
`no-empty` ×4; the 2 `react/no-danger` are the blog's DOMPurify renders → targeted
`// eslint-disable-next-line react/no-danger // sanitized by DOMPurify`.
*Verify:* `npm run lint` exits 0.

### Step 1.8 — Full local gate
```bash
npm run typecheck && npm run security:static && npm run lint && npm run build
```
All green → `check:local`/`release:ready` pass → merge PR → auto preview → promote.

---

## Phase 2 — Production configuration (dashboards) 🧭 ⏱ 1–2h
### Step 2.1 — Set every prod secret, then **REDEPLOY** (P0 #1, #2) — ⚠️ build-time gotcha
`VITE_*` vars are **inlined at build time**. After setting them in Vercel you **must trigger a new
build** or the app keeps the old/placeholder values. The critical one: `VITE_TURNSTILE_SITE_KEY` —
without it the CAPTCHA silently uses Cloudflare's always-pass test key.
Set (web project): `VITE_SUPABASE_*`, `VITE_TURNSTILE_SITE_KEY`, `VITE_APP_URL`, `VITE_ADMIN_URL`.
Set (Supabase function secrets): `STRIPE_SECRET_KEY` (sk_live), `STRIPE_WEBHOOK_SECRET`,
`RESEND_API_KEY`, `LOVABLE_API_KEY`/`OPENAI_API_KEY`, `ALLOWED_ORIGINS`, `EXTENSION_ALLOWED_ORIGINS`,
`INTERNAL_FUNCTION_SECRET`, `ENVIRONMENT=production`. **Then redeploy web + marketing.**
*Verify (hard proof):* on the live site, the deployed JS must **not** contain `1x00000000000000000000AA`
and the register page must show a **real CAPTCHA challenge**:
```bash
curl -s https://app.sellersuit.com/assets/index-*.js | grep -c "1x00000000000000000000AA"   # must be 0
```

### Step 2.2 — Enable Supabase Leaked Password Protection (P0 #4). Auth → Policies.
### Step 2.3 — (Optional) set `VERCEL_DEPLOY_HOOK_URL` Supabase secret for blog auto-publish.

---

## Phase 3 — Billing go-live verification 🧭🧑‍💻 ⏱ 30–60m
- [ ] Register the Stripe **LIVE** webhook → `…/functions/v1/stripe-webhook`; confirm
  `STRIPE_WEBHOOK_SECRET` matches the live endpoint (not test). (P0 #3)
- [ ] **Live E2E:** real card → checkout → subscription active → premium action (create listing /
  generate titles) works → cancel → access revoked. Confirms server-side gating + `stripe_events`
  idempotency in prod. *Abort if any step fails.*

---

## Phase 4 — Pre-launch smoke test = the GO/NO-GO gate 🧭 ⏱ 30m
Against production URLs:
1. New account → **CAPTCHA actually challenges** (proves 2.1).  2. Verification email arrives (Resend).
3. Extension pairs → `auth-status` 200.  4. Scrape → create listing → plan-gated + works.
5. Paid checkout → limits lift; cancel → revoked.  6. `curl -I` web/admin/marketing → headers present,
no CSP console errors anywhere.  7. Blog renders + a published post prerenders.
**All green → GO. Any red → fix or abort.**

---

## Phase 5 — Launch-day monitoring & ops (set up BEFORE go-live) 🧑‍💻🧭 ⏱ 1–2h
- [ ] **Error tracking:** wire **Sentry** into web + admin + edge functions (DSN as env). Without it
  you're blind on launch day. Set an alert on error-rate spike.
- [ ] **Payment alerts:** Stripe → email/Slack on failed payments + new subscriptions.
- [ ] **Uptime/canary:** monitor `app.sellersuit.com`, `sellersuit.com`, and a Supabase health endpoint;
  alert on 5xx. (A canary-watch routine can hit these post-deploy.)
- [ ] **Support ready:** support email/WhatsApp staffed; refund policy live; a known-issues doc.
- [ ] **Rollback levers documented:** Vercel "promote previous deploy", Supabase restore point, function
  re-deploy of last good version.

---

## Phase 6 — Post-launch hardening (not blockers) 🧑‍💻
CI (typecheck + security:static + extension tests + build on push) · bundle code-splitting (web 1.88 MB,
admin 1.77 MB) · drop `bun.lockb` · tighten CSP off `unsafe-inline/eval` via nonces · API/worker/queue
layer for 1k+ users.

---

## One-day launch runbook (T-minus)
| When | Track A (you) | Track B (me, code) |
|---|---|---|
| T-8h | Phase −1 backup/branch; start extension store listing (Phase 0) | Open PR with Phase 1 steps 1.1–1.8 on a branch |
| T-6h | Review preview deploy; CSP Report-Only walkthrough | Apply migrations on **dev branch**, run advisors |
| T-5h | Set all prod secrets (2.1) | Promote migrations to prod after sign-off |
| T-4h | **Redeploy** web+marketing; verify test-key absent (2.1) | Merge PR → prod |
| T-3h | Enable leaked-password protection (2.2); Stripe live webhook (3.1) | Wire Sentry + uptime (Phase 5) |
| T-2h | Live billing E2E (3.2) | Stand by for fixes |
| T-1h | **Phase 4 smoke test** = GO/NO-GO | — |
| T-0 | Flip marketing CTAs live / announce | Watch Sentry + uptime |
| T+24h | Review metrics, refunds, errors | Triage P1 backlog |

---

## Risk register
| Risk | Likelihood | Impact | Mitigation / abort |
|---|---|---|---|
| Turnstile key set but not redeployed → CAPTCHA off | High | High (bot signups/abuse) | 2.1 redeploy + grep test-key absent |
| Wrong CSP white-screens marketing/admin | Med | High | Report-Only first; per-app CSP; preview verify; abort→remove header |
| Stripe live webhook mismatch → no plan activation | Med | High | 3.1 verify secret; 3.2 live E2E before launch |
| Migration breaks register (anon revoke) | Low | Med | Test on dev branch; check callers; rollback GRANT |
| Chrome Web Store rejection | Med | Low (web app still sells) | Clear data-use disclosures; fast resubmit |
| No monitoring → silent failures | (if skipped) | High | Phase 5 Sentry+uptime before T-0 |

## Definition of Done (launch is "successful")
- Phase 4 smoke test fully green; live checkout + cancel verified.
- Sentry + uptime live; no Sev-1 in first 24h; payment success rate >95%; CAPTCHA challenge confirmed
  on real signups; no CSP errors in console; extension submitted (approval may trail).

## Ownership
- **Me (in-repo):** Phase 1 (all), Sentry/CI wiring, bundle splitting.
- **You (dashboards):** Phase 0 store listing, Phase 2 secrets+redeploy, Phase 3 Stripe, Phase 4 smoke
  test, Phase 5 alert setup, the GO decision.

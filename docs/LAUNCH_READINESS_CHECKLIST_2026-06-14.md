# SellerSuit — Launch Readiness Audit & Checklist (2026-06-14)

Scope: web dashboard (`apps/web`), admin (`apps/admin`), marketing (`apps/marketing`),
Supabase backend/functions/RLS, Stripe billing, and the Chrome extension (`apps/extension`).
Supersedes the 2026-06-12 audits in `docs/` where noted (billing + security headers landed since).

---

## Verdict: **CONDITIONAL GO — soft-launch ready now; full paid launch after the P0 config list (~half a day).**

This is **not blocked by deep code problems.** Everything that would take real engineering is already
done: it builds, typechecks, the extension passes its publish gate, premium actions are gated
server-side, billing is live, and the web app ships a CSP. The remaining launch blockers are a short
list of **configuration / operational** items (set production secrets, flip two Supabase settings, add
headers to two more deploys, register the Stripe webhook). Knock those out and you can charge customers.

- **Chrome extension: READY TO PUBLISH NOW.** `verify:prod` passes ("Safe to publish"), 217/217 tests
  pass, prod manifest strips localhost, permissions are scoped to the supported supplier/eBay hosts.
- **SaaS: READY after P0.** Functionally complete, hardened, billing done — pending prod config.

### What's already solid (verified this audit)
| Check | Result |
|---|---|
| `typecheck` (web + admin + marketing) | ✅ Pass |
| `build` (web + admin + marketing) | ✅ Pass |
| `security:static` (10 checks) | ✅ Pass (checkout price-from-plan, CORS, RLS WITH CHECK, PII logs removed…) |
| Extension `verify:prod` + tests | ✅ "Safe to publish", 217/217 |
| Server-side monetization gating | ✅ `create-listing` (plan/feature entitlement + rate limit + account status), `generate-titles` ("subscription inactive") |
| Security headers + CSP (web) | ✅ Present in root `vercel.json` |
| Secret hygiene | ✅ No hardcoded secrets; no service-role key in any frontend; `.env*` untracked; env documented in `.env.production.example` |
| Legal pages | ✅ `/privacy`, `/terms`, `/refund` in marketing |

---

## P0 — Launch blockers (do before charging customers)

- [ ] **Set `VITE_TURNSTILE_SITE_KEY` in production.** `packages/auth/src/components/auth/TurnstileCaptcha.tsx:14`
  falls back to Cloudflare's **test key `1x00000000000000000000AA` that always passes**. If the real key
  isn't set at build time, **registration CAPTCHA is a no-op** (open to bots). `check-local-env.mjs` does
  *not* validate it, so it can silently ship missing. → Set it in the web app's Vercel project env.
- [ ] **Confirm ALL production secrets are set** (Vercel envs + Supabase function secrets), per
  `.env.production.example`: `VITE_SUPABASE_*`, `STRIPE_SECRET_KEY` (sk_live), `STRIPE_WEBHOOK_SECRET`,
  `RESEND_API_KEY`, `LOVABLE_API_KEY`/`OPENAI_API_KEY`, `ALLOWED_ORIGINS`, `EXTENSION_ALLOWED_ORIGINS`,
  `INTERNAL_FUNCTION_SECRET`, `ENVIRONMENT=production`.
- [ ] **Register & test the Stripe LIVE webhook** (`stripe-webhook` function) and verify
  `STRIPE_WEBHOOK_SECRET` matches. Idempotency table (`stripe_events`) exists — do one live test
  checkout + cancellation end-to-end.
- [ ] **Enable Supabase "Leaked Password Protection"** (Auth → Policies). Advisor `auth_leaked_password_protection` is currently disabled.
- [ ] **Lock down anon-executable PII functions.** Advisor flags `public.check_user_exists(email)` and
  `public.get_user_goal(email)` as callable by the `anon` role (email-enumeration vector). Revoke
  `EXECUTE` from `anon`/`authenticated` or move them behind an edge function.
- [ ] **Add security headers + CSP to the marketing and admin deployments.** Only the **web** app has
  them (root `vercel.json`). `apps/marketing/vercel.json` and `apps/admin/vercel.json` have routes but
  **no headers/CSP** — copy the header block over (admin especially handles privileged actions).
- [ ] **Publish the extension with a Privacy Policy URL + data-use disclosures** in the Chrome Web Store
  listing (use `https://sellersuit.com/privacy`), plus screenshots and the store description. The build
  itself is ready; this is the store-listing paperwork.

## P1 — Fix this week (quality / CI / hygiene)

- [ ] **Remove `apps/backup_temp/` (67 tracked files).** It's a committed backup of an old extension copy
  — clutter, stale code, and it pollutes lint with parse errors. `git rm -r apps/backup_temp`.
- [ ] **Green the lint gate.** `npm run lint` = **480 errors / 42 warnings**, so `check:local` /
  `release:ready` currently **fail**. 456 are `@typescript-eslint/no-explicit-any` (style, not bugs).
  The two that matter: fix the conditional `React.useEffect` in `TurnstileCaptcha.tsx:18` (benign in prod
  because `import.meta.env.DEV` is compile-time false, but it's a real `rules-of-hooks` violation), and
  add `backup_temp`, `**/public/chrome_extension`, `**/*.cjs` to the eslint `ignores` to clear the 11
  parse-error false positives. Then triage `any` (or relax the rule to `warn` for launch).
- [ ] **Set up CI** to run `typecheck` + `security:static` + extension tests on every push (the scripts
  exist; nothing enforces them).
- [ ] **Harden remaining Supabase advisor WARNs:** set `search_path` on `set_updated_at`,
  `list_user_listings`, `create_listing_with_variations`; review the `rls_enabled_no_policy` tables
  (`stripe_events`, `support_notes`, `feature_*`, `extension_session_*`, etc. — RLS-on + no-policy =
  deny-all to clients, which is **safe** as long as they're only touched by service-role functions —
  just confirm that's intended).

## P2 — Soon after launch (perf / scale)

- [ ] **Code-split the bundles.** web `index.js` ≈ 1.88 MB (526 KB gzip), admin ≈ 1.77 MB. Use route-level
  `React.lazy` / `manualChunks`. Hurts first-load on mobile; not a launch blocker.
- [ ] **Resolve package-manager ambiguity** (both `package-lock.json` and `bun.lockb` exist — pick one).
- [ ] **Scale architecture (from the 2026-06-12 audits):** the app uses direct browser→Supabase with
  RLS. This is fine and conventional for launch *given correct RLS* (which the static scan validates),
  but for 1k–10k+ users plan a dedicated API/worker layer, queue, and observability. **Not a launch blocker.**

---

## How to re-verify (commands)
```bash
npm run typecheck            # all apps — currently green
npm run security:static      # 10 checks — currently green
npm run build                # marketing + web + admin — currently green
npm --workspace @sellersuit/extension run verify:prod   # after prepare:prod — "Safe to publish"
npm --prefix apps/extension test                        # 217/217
npm run lint                 # currently RED (480 errors, mostly `any`)
```

**Bottom line:** ship the extension now; complete the 7 P0 items (mostly dashboard config, ~half a day)
and you're clear for a paid public launch of the SaaS.

# Plan: Fix billing/plans/credits issues (repo↔prod drift, catalog, atomic credits)

## Context

User asked whether plan + billing + credits work correctly "according to the plans." I
audited the money path (Stripe webhook, `check-subscription-v2`, credit RPCs, plan catalog,
admin credit RPCs) and verified the **deployed** Supabase functions + DB advisors live.

**Verdict: production billing works today, but the repo has drifted from prod and would
break live billing on the next deploy. Three correctness issues to fix.**

What's healthy (leave alone):
- **Deployed** `stripe-webhook` **v68 is correct** — events are processed, emails fire,
  renewals/cancellations/past_due handled.
- Listing credit deduction is **atomic** — `create_listing_with_variations` locks the
  profile row `FOR UPDATE`, checks + deducts in one txn ([20260611090100_create_listing_credit_deduction.sql](supabase/migrations/20260611090100_create_listing_credit_deduction.sql)).
  `create-listing` uses it ([create-listing/index.ts:421](supabase/functions/create-listing/index.ts#L421)).
- `check-subscription-v2` live-reconciles Stripe on every call — a solid self-heal backstop
  ([check-subscription-v2/index.ts:168-212](supabase/functions/check-subscription-v2/index.ts#L168)).
- Admin credit/billing RPCs are role-guarded internally
  (`has_role(auth.uid(),'admin')` → `RAISE Unauthorized`, [admin_spine:151](supabase/migrations/20260617000000_admin_spine.sql#L151)).
  Advisor flags on them are defense-in-depth, **not** an open exploit.

### Canonical plan numbers (confirmed by user = live DB values)
| Plan | Credits/mo | Auto-orders | eBay accts |
|---|---|---|---|
| Trial | 10 | 10 | 1 |
| Starter | 500 | **250** | 1 |
| Pro | **5,000** | Unlimited | **2** |
The **DB is already correct** (migration 20260616000000). The **doc/marketing are stale**.

---

## Issues & dependency graph

```
P0  Repo stripe-webhook drift / broken brace  ── blocks safe deploy (do first)
P1  Plan-catalog doc↔DB drift (doc only; DB already correct)   ── independent
P2  AI credit deduction non-atomic            ── independent
P3  (optional) advisor hardening              ── independent, low priority
```

---

## P0 — Restore repo `stripe-webhook` to match deployed v68 (critical, deploy-risk)

**Problem:** `supabase/functions/stripe-webhook/index.ts` on `main` is **missing the `}`
that closes the duplicate-event `if`**, so the entire `switch (event.type)` sits *after* a
`return` and *inside* the `if` — dead code, effectively a syntax error
([stripe-webhook/index.ts:267-273](supabase/functions/stripe-webhook/index.ts#L267)). The
deployed v68 is correct and even contains checkout-handler logic the repo version lacks
(`session.metadata?.user_id`, fuller body). The web `tsc` typecheck does **not** cover Deno
edge functions, so this passes CI but **would fail or ship the dead-code path on the next
`supabase functions deploy stripe-webhook`, breaking live billing** (no provisioning, no
emails — only the `check-subscription-v2` backstop would remain).

**Fix:**
1. Replace the repo file with the **known-good deployed v68 source** (retrieved via Supabase
   MCP `get_edge_function`; saved tool-result JSON in this session). Make repo == prod.
2. Harden idempotency-retry: today the `stripe_events` id is inserted **before** processing,
   so a mid-processing failure returns 500 (Stripe retries) but the retry hits the unique
   row (23505) and is skipped → permanent loss. Change to **claim-then-release**: on any
   processing error, `DELETE FROM stripe_events WHERE id = event.id` before returning 500,
   so Stripe's retry re-processes. (Keep insert-first so concurrent duplicates still dedupe.)
3. Add a CI guard so a broken edge function can never merge again: add
   `deno check supabase/functions/**/index.ts` (or `supabase functions ... --no-verify-jwt`
   dry compile) to the `check:local` script in root `package.json` and/or the CI workflow.

**Acceptance:** `deno check supabase/functions/stripe-webhook/index.ts` passes; repo logic ==
deployed v68; processing failure leaves no `stripe_events` row (verified by re-delivery).

**Verification:** `deno check` clean; diff repo vs `get_edge_function` v68 → identical event
handling; Stripe test-mode: trigger `checkout.session.completed` twice (replay) → processed
once, second is `duplicate:true`. Also spot-diff the other billing functions vs deployed
(`create-checkout`, `check-subscription-v2`, `customer-portal`) to confirm webhook was the
only drift.

**▶ CHECKPOINT 1 — confirm repo webhook == prod + deno-check guard before catalog/credits.**

---

## P1 — Reconcile plan catalog (doc/marketing → match DB)

**Problem:** [docs/BILLING.md](docs/BILLING.md) table says Pro 1,500 credits / Starter
unlimited orders; DB (canonical) is Pro 5,000 / Starter 250 / Pro 2 eBay accts.

**Fix (DB needs NO change — values already correct):**
- Update the BILLING.md plans table + "Webhook Events" notes to the canonical numbers; add
  an eBay-accounts column (1/1/2).
- Grep for hardcoded stale copy and fix to match (frontend should read DB via
  `check-subscription-v2`/`plans`, but check for literals): search `apps/marketing`,
  `apps/web` (pricing/choose-plan) for `1,500` / `1500` / `Unlimited auto-orders` /
  `5 eBay`. Representative: marketing pricing config, web pricing page.

**Acceptance:** BILLING.md, pricing page, and DB all show identical numbers.
**Verification:** grep finds no stale `1,500`/`unlimited orders`/`5 eBay`; `/choose-plan`
renders 5,000 / 250 / 2.

---

## P2 — Make AI credit deduction atomic

**Problem:** `deductUsage('credit')` does a non-atomic read-then-write, and `validateUserPlan`
→ `deductUsage` is split across two calls — concurrent AI requests can both pass and overspend
credits ([plan-middleware.ts:571-613](supabase/functions/_shared/plan-middleware.ts#L571)).
Listings are safe (atomic RPC); AI (titles/description/research/image) is not.

**Fix:**
- New migration: `deduct_credits_atomic(p_user_id uuid, p_amount int, p_reason text,
  p_metadata jsonb) RETURNS int` — SECURITY DEFINER, `SELECT credits ... FOR UPDATE`, raise
  `Insufficient credits` if `< p_amount`, deduct, bump `user_plans.credits_used`, insert
  `credit_transactions` (+ `usage_logs`). Mirror the credit block in
  [create_listing_with_variations](supabase/migrations/20260611090100_create_listing_credit_deduction.sql#L45-101).
- Refactor `deductUsage` credit branch to call the RPC. Keep `validateUserPlan` for early UX
  rejection, but the RPC's own balance check closes the race.
- Reuse in the AI edge functions that currently validate+deduct (`generate-titles`,
  `generate-description`, `ai-product-research`, `ai-image-edit`).

**Acceptance:** N concurrent deducts with balance < N → exactly `balance` succeed, never
negative; each spend logged once.
**Verification:** integration test firing concurrent RPC calls; assert final `credits >= 0`
and transaction count == successes.

---

## P3 — (Optional) advisor hardening — defer unless requested

From live `get_advisors` (security): 28+27 `*_security_definer_function_executable` WARNs on
admin RPCs (guarded internally — defense-in-depth only), 9 INFO `rls_enabled_no_policy` on
admin tables, `auth_leaked_password_protection` off, `extension_in_public`,
`function_search_path_mutable`. Optional migration: `REVOKE EXECUTE` on `*_admin` RPCs +
`sync_profile_credits_from_ledger` from `anon, authenticated`; enable leaked-password
protection (Supabase Auth setting); add/confirm RLS policies on the flagged admin tables.
Not blocking — credit integrity is already enforced by the internal role guards.

---

## Files to touch

- **P0:** `supabase/functions/stripe-webhook/index.ts` (restore to v68 + retry-release);
  root `package.json` `check:local` (+ CI workflow) for `deno check`.
- **P1:** `docs/BILLING.md`; stale literals in `apps/marketing` + `apps/web` pricing copy.
- **P2:** new `supabase/migrations/<ts>_deduct_credits_atomic.sql`;
  `supabase/functions/_shared/plan-middleware.ts` (`deductUsage` credit branch); AI functions
  listed above.
- **P3 (optional):** new migration for REVOKEs/RLS.

## Verification (end-to-end)
1. `deno check supabase/functions/**/index.ts` — clean.
2. Diff repo stripe-webhook vs deployed v68 (`get_edge_function`) — identical.
3. Stripe **test mode**: $1 trial + paid sub → credits granted per plan, `trial_started` /
   `subscription_activated` emails fire, webhook logs show events processed; replay an event
   → `duplicate:true`; force a processing error → row released, Stripe retry succeeds.
4. Concurrency test for `deduct_credits_atomic`.
5. `npm run typecheck` + `npm run check:local` green; re-run `get_advisors` if P3 done.

## Notes
- Do NOT redeploy edge functions until P0 is verified locally — current prod is healthy; a
  premature deploy of the broken repo file is the exact risk this plan removes.
- The prior eBay-aspects plan is preserved at `tasks/plan-ebay-aspects.md` /
  `tasks/todo-ebay-aspects.md`.

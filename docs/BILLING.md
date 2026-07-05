# SellerSuit Billing System

## Overview

SellerSuit uses Stripe for all payments. There is no free plan — users must select a plan to access the app.

### Plans

| Plan | Price | Listings | Orders | Credits | Notes |
|---|---|---|---|---|---|
| Trial | $1 one-time | 10 | 10 | 10 | 7-day access, one per account |
| Starter | $15/mo · $144/yr | 500 | Unlimited | 500 | 1 credit per new listing |
| Pro | $49/mo · $470.40/yr | 5,000 | Unlimited | 1,500 | Popular, all features |

### Access States

The `access` field in `check-subscription-v2` response is the single source of truth for UI gating:

| State | Meaning |
|---|---|
| `none` | No plan — redirect to `/choose-plan` |
| `trial` | $1 trial active, within trial window |
| `trial_expired` | Trial ended, trial card hidden |
| `active` | Paid subscription active |
| `past_due` | Payment failed — show warning, portal |

---

## Environment Variables

Required in `.env` (or Vercel project settings):

```env
VITE_SUPABASE_URL=https://ojxzssooylmydystjvdo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>

# Edge Functions (set in Supabase dashboard → Edge Functions → Secrets)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://ojxzssooylmydystjvdo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Transactional email (Resend)
RESEND_API_KEY=re_...               # required — emails silently skip if absent
FROM_EMAIL=billing@sellersuit.com   # must be a verified Resend domain
APP_URL=https://sellersuit.com      # used for CTA links in emails
```

Sync script (local only):
```env
STRIPE_SECRET_KEY=sk_live_...       # or sk_test_... for test mode
SUPABASE_URL=https://ojxzssooylmydystjvdo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Runbook: Setting Up Billing from Scratch

> **⚠️ Production status (2026-07-04):** Verified via Stripe MCP that the **live** account
> (`acct_1RWG31J5ks4Nw0ZG`) has **no** Trial/Starter/Pro products or recurring prices and
> **zero** subscriptions — step 2 was never run against live, and the live webhook (step 3)
> is not pointed at the Supabase function. Until steps 2–3 below are executed with **live**
> credentials, production checkout fails ("Selected plan is not configured for checkout") and
> billing survives only on the `check-subscription-v2` login self-heal. The billing code itself
> is correct and idempotent; this is purely operational. Run the same steps once per environment
> (test key → dev/local DB, live key → prod DB).

### 1. Apply migrations

```bash
supabase db push
# or via Supabase MCP: apply_migration for each file in supabase/migrations/
```

Key migrations:
- `20260613100000_billing_foundation.sql` — `feature_flags`, `stripe_price_id_one_time`, `trial_used_at`, unique constraints
- `20260613101000_seed_plans_v2.sql` — Trial/Starter/Pro rows + `handle_new_user()` trigger

### 2. Create Stripe products and prices

```bash
node scripts/stripe-sync-plans.mjs --dry-run   # preview
node scripts/stripe-sync-plans.mjs              # apply
```

This creates Stripe products (keyed by `metadata.sellersuit_plan`) and prices, then writes the price IDs back to the `plans` table. Safe to re-run; subsequent runs are no-ops if prices match.

The script **refuses to write test-mode price IDs into a remote (prod) database, or live-mode IDs into a local DB** (`assertKeyMatchesTarget`) — this is the guard against the mismatch that silently breaks checkout. Use a `sk_live_` key for the prod project and a `sk_test_` key locally. Overrides `--allow-test-on-remote` (for a real staging project) / `--allow-live-on-local` exist but should rarely be needed.

### 3. Configure Stripe webhook

In the [Stripe Dashboard](https://dashboard.stripe.com/webhooks), create a webhook pointing to:
```
https://ojxzssooylmydystjvdo.supabase.co/functions/v1/stripe-webhook
```

Events to forward (must match the `switch` in `stripe-webhook/index.ts`):
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Copy the signing secret (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` in Supabase Edge Function secrets.

### 4. Configure Stripe Customer Portal

In [Stripe Billing → Customer portal](https://dashboard.stripe.com/test/settings/billing/portal), enable:
- Cancel subscriptions
- Update payment method
- View billing history

The portal URL is generated on demand by the `customer-portal` Edge Function.

---

## Test-Mode Walkthrough

1. Use Stripe test keys (`sk_test_...`, `pk_test_...`)
2. Run `stripe-sync-plans.mjs` → plans table gets test price IDs
3. Start dev server: `npm run dev`
4. Register a new account → profile gets `plan_id: null, credits: 0`
5. Visit `/choose-plan` → select Trial ($1)
6. Use Stripe test card `4242 4242 4242 4242` → checkout completes
7. Webhook fires `checkout.session.completed (mode=payment)` → `stripe-webhook` sets `trial_used_at`, upserts `user_plans {status: 'trialing'}`, grants 10 credits
8. `CheckoutSuccess` page polls `check-subscription-v2` until `access === 'trial'`, then redirects to `/dashboard`
9. After 7 days, `check-subscription-v2` lazily flips `status = 'expired'` and returns `access === 'trial_expired'`
10. `/dashboard` gate redirects to `/choose-plan` (trial card hidden); user upgrades to paid plan

**Replay safety:** the `stripe_events` table holds processed event IDs (unique PK). Replaying `checkout.session.completed` is safe — `trial_used_at` has an `AND trial_used_at IS NULL` guard.

---

## Feature Flag Gating

Feature flags live in `plans.feature_flags` (jsonb). Keys:

| Key | Plans |
|---|---|
| `bulk_lister` | Trial, Starter, Pro |
| `price_monitoring` | Starter, Pro |
| `top_selling_products` | Starter, Pro |
| `ai_product_research` | Pro only |
| `profitable_products` | Pro only |
| `priority_support` | Pro only |

### Frontend gating

```tsx
import { FeatureGate } from '@/components/FeatureGate';

<FeatureGate flag="ai_product_research">
  <ProductResearchPage />
</FeatureGate>
```

Returns `<LockedFeature />` with "Upgrade Plan" button if flag is false/absent.

### Backend gating (Edge Function pattern)

```typescript
const { data: profile } = await supabase.from('profiles').select('plan_id').eq('id', userId).single();
if (profile?.plan_id) {
  const { data: plan } = await supabase.from('plans').select('feature_flags').eq('id', profile.plan_id).single();
  const flags = (plan?.feature_flags ?? {}) as Record<string, unknown>;
  if (!flags['ai_product_research']) return new Response('{"error":"Forbidden"}', { status: 403 });
}
```

---

## Known Behaviors

### Trial: one per account, three-layer guard

1. DB: `profiles.trial_used_at IS NOT NULL` → 403 immediately
2. DB: `user_plans` history check for prior trial row
3. Stripe: `customer.metadata.trial_used === 'true'`

All three must pass. The webhook sets all three atomically.

### Trial expiry: reactive, not scheduled

There is no `pg_cron`. `check-subscription-v2` lazily flips `user_plans.status = 'expired'` when `trial_end < now()`. The DB gating RPCs (`create_listing_with_usage`, `create_auto_order_with_usage`) also check `trial_end` server-side, so users can't bypass expiry by avoiding the check endpoint.

### Billing interval switch resets usage counters

When a user switches from monthly to yearly (or vice versa), Stripe creates a new subscription period. The `isNewPeriod` branch in the webhook handler resets `orders_used` and `credits_used`. This is intentional.

### Plan price edits

Stripe prices are **immutable** after creation. The sync script (`stripe-sync-plans.mjs`) creates new prices and deactivates old ones when prices change. Update the DB price IDs accordingly. Existing subscribers keep their current price until they re-subscribe.

---

## Admin Plan Management

`/plans` in the admin panel (`apps/admin`) renders `AdminPlans.tsx`. From here you can:

- Edit limits, features, feature flags, Stripe price IDs
- Toggle `is_active` to show/hide from the pricing page
- Deactivate plans (never deleted — existing subscribers are unaffected)
- Add new plans

After editing `feature_flags` or prices in the admin, no deployment is needed — changes take effect immediately via realtime subscriptions.

---

## Transactional Emails

Branded emails are sent automatically by `stripe-webhook` via Resend. All sends are **fire-and-forget** — a Resend failure never causes the webhook to return an error to Stripe.

### Email events

| Trigger | Template | What it contains |
|---|---|---|
| `checkout.session.completed` (mode=payment) | `trial_started` | $1 charge confirmed, trial end date, dashboard CTA |
| `checkout.session.completed` (mode=subscription) | `subscription_activated` | Plan name, listing/credit limits, dashboard CTA |
| `invoice.payment_succeeded` (subscription_cycle) | `payment_receipt` | Amount, plan, next billing date, invoice PDF link |
| `invoice.paid` (subscription_cycle, alias) | `payment_receipt` | Same as above |
| `invoice.payment_failed` | `payment_failed` | Amount, urgent CTA to update payment method |
| `customer.subscription.deleted` | `subscription_cancelled` | Plan name, data-preserved notice, resubscribe CTA |

### Setup checklist

1. Create a **Resend** account at [resend.com](https://resend.com) and verify your sending domain (`sellersuit.com`).
2. Generate an API key and set `RESEND_API_KEY` in Supabase Edge Function secrets.
3. Set `FROM_EMAIL` (e.g. `billing@sellersuit.com`) and `APP_URL` (`https://sellersuit.com`).
4. **Disable Stripe's built-in receipt emails** to avoid duplicate sends:
   - Stripe Dashboard → Settings → Emails → uncheck "Successful payments" and "Failed payments".
   - Leave "Subscription renewals" unchecked too — the webhook covers it.

### Templates

All templates live in [`supabase/functions/_shared/email.ts`](../supabase/functions/_shared/email.ts). `buildEmailContent()` is a pure function — testable with Node, no Deno dependency. To preview a template locally:

```ts
import { buildEmailContent } from "./supabase/functions/_shared/email.ts";
const { subject, html } = buildEmailContent({ to: "you@example.com", type: "trial_started", userName: "You", trialEndDate: "2026-06-20T00:00:00Z" });
// write html to a file and open in a browser
```

---

## Webhook Events Reference

| Event | Handler |
|---|---|
| `checkout.session.completed` (mode=payment) | Activate trial, set `trial_used_at`, grant 10 credits |
| `checkout.session.completed` (mode=subscription) | Activate paid subscription |
| `customer.subscription.updated` | Sync status, period, cancel_at_period_end |
| `customer.subscription.deleted` | Downgrade to no-plan (`plan_id: null`) |
| `invoice.payment_failed` | Set `status = 'past_due'` |
| `invoice.payment_succeeded` | Clear past_due → active |

All events are idempotent via `stripe_events` table (unique on Stripe event ID).


## What I found (current system behavior)

### 1) Listing limits are **not consistently enforced**
You currently have two main backend entry points that create listings:

- **`supabase/functions/create-listing/index.ts`**
  - Enforces listing limit by counting active listings and comparing against `plans.max_listings`.
  - But it **ignores**:
    - subscription status (active/expired/canceled)
    - `user_plans.admin_override_limits` (admin overrides)
    - `user_plans.plan_id` when `profiles.plan_id` is missing/outdated

- **`supabase/functions/sync-listing/index.ts`** (used by extension / batch sync)
  - **Does not check `max_listings` at all**, only checks credits.
  - This is a direct path for users to exceed listing limits even if the UI blocks them.

### 2) “Expired plans still allow listing creation” is currently true
You already have a centralized enforcement layer:
- **`supabase/functions/_shared/plan-middleware.ts`**

But:
- Neither `create-listing` nor `sync-listing` uses it today.
- The middleware’s expiry logic is also flawed:

In `getFullPlanStatus()` it currently marks expired like:
- `current_period_end < now` **AND** `status != 'active'`

That means if a user’s `user_plans.status` stays `"active"` (which can happen if webhook sync lags or fails), they may **never be considered expired**, even if `current_period_end` is in the past.

### 3) “Plans not activating after payment” likely caused by Stripe webhook configuration
Your **`stripe-webhook`** edge function refuses to run in production unless `STRIPE_WEBHOOK_SECRET` exists:

- In `supabase/functions/stripe-webhook/index.ts`:
  - If `STRIPE_WEBHOOK_SECRET` is missing and `ENVIRONMENT !== "development"`, it returns **500** immediately.
- Your configured secrets list includes `STRIPE_SECRET_KEY` but **does not show `STRIPE_WEBHOOK_SECRET`**.
- Result: Stripe can accept payment, but the webhook update that marks the plan active may never succeed.

### 4) “Listing is not showing on the user dashboard” — most likely root causes
Based on the code and DB policies:
- RLS is enabled and there is a listings policy: `USING (auth.uid() = user_id)` for ALL operations, which is correct for per-user data.
- The dashboard fetch is straightforward (`select('*').eq('user_id', user.id)`).

So if listings “don’t show”, it’s usually one of:
1) The listing row **never got created** (edge function failed / extension failed).
2) The listing row was created with a **different `user_id`** than the logged-in user (token mismatch in extension, or using another account).
3) The listing row exists but **status isn’t `active`** and the UI is filtering (less likely since default is “all”, but still possible depending on user’s filter selection).
4) Auth session mismatch in preview (logged out / wrong user / email not verified).

This plan includes instrumentation/verification steps to pinpoint which one is happening.

---

## Fix strategy (without changing core business logic)
Goal: keep your current “count active listings” model (your existing core logic) but make enforcement **consistent and backend-authoritative**.

### A) Make backend enforcement consistent (the most important fix)
1) **Update `create-listing`** to use the existing middleware:
   - Before inserting a NEW listing:
     - call `validateUserPlan(..., 'listing', 1)`
     - call `validateUserPlan(..., 'credit', 1)` (since this endpoint deducts 1 credit on create)
   - Ensure the returned errors preserve your current response shape (402 with `limitType`, `current`, `limit`, `upgradeRequired`).

2) **Update `sync-listing`** (batch import) to enforce limits too:
   - After it determines `newListingsCount`:
     - call `validateUserPlan(..., 'listing', newListingsCount)`
     - call `validateUserPlan(..., 'credit', newListingsCount)`
   - This fixes “users can exceed listing limits” via extension/sync.

3) Ensure both functions use the same source of truth for plan selection:
   - `plan-middleware` already resolves plan id using `profiles.plan_id || user_plans.plan_id`
   - and it supports `admin_override_limits`
   - so adopting it automatically fixes “admin changes not reflecting” for enforcement.

### B) Fix expiry handling (backend-only)
1) **Correct the expiry logic** in `supabase/functions/_shared/plan-middleware.ts`:
   - Treat subscription as expired when:
     - `current_period_end` exists and `< now()` (regardless of status string), OR
     - status is `canceled`, OR
     - trial_end exists and `< now()` (for trials)
   - The key fix: do not allow `"active"` status to bypass a past `current_period_end`.

2) Optional but recommended (still within your rules because it’s enforcement-related):
   - When middleware detects expiry, do a best-effort update:
     - set `user_plans.status = 'expired'` (or `'canceled'` if that’s your convention)
   - This makes the UI and DB consistent even if Stripe webhook lags.

### C) Fix “plan not activating after payment”
1) **Add `STRIPE_WEBHOOK_SECRET` to Supabase Edge Function secrets**.
   - This is required for reliable activation.
2) Verify Stripe webhook endpoint is configured to hit your Supabase edge function URL.
3) Add minimal logging improvements (no logic changes) to `stripe-webhook`:
   - Log when it aborts due to missing secret.
   - Log `user_id`, matched `plan_id`, and final `user_plans` write result for audit.

### D) Fix listing dashboard not showing (only if it’s a logic blocker)
This will be approached as a debug-first fix:
1) Add targeted logs in the frontend `src/pages/dashboard/Listings.tsx` only if needed:
   - log the Supabase query error message in the toast (currently generic “Failed to fetch listings”)
   - this helps detect RLS/permission vs genuinely empty results
2) Add a one-time debug panel (dev-only) if necessary:
   - show current `user.id` and the number of rows returned
   - (No UI redesign; purely diagnostic.)

---

## Verification plan (how we’ll confirm each issue is fixed)

### 1) Subscription activation after payment
- Trigger a checkout
- Confirm Stripe sends `checkout.session.completed`
- Confirm edge function logs show:
  - webhook signature verified
  - plan matched by price id
  - `user_plans.status` updated to `active`
  - `profiles.plan_id` updated
- Confirm app shows subscribed plan (via `useSubscription` / `check-subscription-v2`)

### 2) Listing count increments correctly & shows in dashboard
- Create a listing (web app path)
- Confirm:
  - row inserted in `public.listings` with correct `user_id`
  - dashboard query returns it
- Create a listing via extension/sync
- Confirm the same

### 3) Limit enforcement (can’t exceed limits)
- Set `max_listings` low (e.g., 1) for a test plan
- Create 1 listing → allowed
- Attempt second listing:
  - via web create-listing → blocked 402
  - via sync-listing batch → blocked 402

### 4) Expiry enforcement
- Force `user_plans.current_period_end` to a past timestamp (test user)
- Attempt listing creation:
  - both endpoints return blocked with “Subscription expired…”

### 5) Admin changes reflected
- Set `user_plans.admin_override_limits.max_listings` for a user
- Confirm middleware-based enforcement respects it immediately.

---

## Files we will change (targeted, minimal)
Backend (edge functions):
- `supabase/functions/_shared/plan-middleware.ts` (fix expiry logic, ensure it’s authoritative)
- `supabase/functions/create-listing/index.ts` (use middleware for listing + expiry + admin overrides)
- `supabase/functions/sync-listing/index.ts` (same enforcement for batch path)
- `supabase/functions/stripe-webhook/index.ts` (configuration + logs; no business logic change)

Frontend (only if necessary to resolve “not showing”):
- `src/pages/dashboard/Listings.tsx` (improve error visibility; no redesign)

Configuration / secrets:
- Add `STRIPE_WEBHOOK_SECRET` in Supabase function secrets (required for real activation)

---

## Notes on your requirements (“don’t change business logic”)
- I will **not** change your listing creation algorithm (dedupe rules, SKU/ASIN matching, payload normalization).
- I will **not** change pricing, plan tier definitions, or replace your count-based model.
- Fixes are strictly:
  - consistent backend enforcement
  - correct expiry calculation
  - webhook activation reliability
  - admin overrides respected by enforcement

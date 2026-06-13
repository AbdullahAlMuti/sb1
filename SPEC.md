# SellerSuit Billing v2 — Spec

## 1. Objective

Extend the existing production billing system (plans, checkout, webhook, feature-gating) into a
world-class SaaS pricing and onboarding experience. The goal is:

- Rich, fully-dynamic pricing page (hero, plan cards, comparison table, FAQ, trust section)
- Normalised plan schema (slug, badge, CTA text, features table, prices table)
- Post-checkout onboarding wizard
- plan-first signup enforcement (`/signup?plan=slug&interval=monthly`)
- checkout_sessions audit table
- Admin coverage for plan_features, plan_prices, subscriptions, and checkout sessions

**Target users:** eBay dropshippers managing 10–5 000 active listings.

---

## 2. Existing foundation (DO NOT rebuild)

| Asset | Location |
|---|---|
| `plans` table | DB — has price columns, feature_flags, is_trial, is_popular, max_* |
| `user_plans` table | DB — status, stripe_subscription_id, trial_end, usage |
| `profiles` table | DB — plan_id, credits, trial_used_at, stripe_customer_id |
| `stripe_events` (idempotency) | DB |
| `create-checkout` | Edge Function — validates plan, creates Stripe session |
| `stripe-webhook` | Edge Function — activates trial/subscription, sends emails |
| `check-subscription-v2` | Edge Function — returns access state |
| `ensure-profile` | Edge Function — creates profile on first login |
| `customer-portal` | Edge Function — Stripe portal redirect |
| `PricingSection.tsx` | Web — monthly/yearly toggle, dynamic from DB |
| `CheckoutDialog.tsx` | Web — opens Stripe checkout |
| `ProtectedRoute` | Web — gates dashboard on access state |
| `useSubscription` / `usePlanLimits` | Web hooks |
| `useFeatureAccess` / `FeatureGate` | Web — client-side feature gating |
| `AdminPlans.tsx` | Admin — full CRUD for plans |
| `Subscription.tsx` | Web — billing page |
| No free plan, $1 trial (one-time checkout) | — |

---

## 3. Delta scope

### Phase A — Schema

**Migration `20260614_billing_v2_schema.sql`:**

Add to `plans` table (additive, all nullable/defaulted so existing rows work):
```sql
slug             text UNIQUE,          -- URL-safe, e.g. "starter", "pro"
short_description text,
long_description  text,
best_for          text,               -- "Small sellers getting started"
badge_text        text,               -- "Popular", "Best Value", null
cta_text          text,               -- "Start with Starter", "Choose Pro"
is_recommended    boolean DEFAULT false,
is_public         boolean DEFAULT true,
trial_requires_card boolean DEFAULT true,
stripe_product_id text,
metadata          jsonb DEFAULT '{}',
archived_at       timestamptz
```

New table `plan_features`:
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
plan_id     uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
group_name  text NOT NULL,            -- "Listing & Automation", "AI Tools", …
title       text NOT NULL,
description text,
display_value text,                  -- "500/month", "Unlimited", "✓"
included    boolean NOT NULL DEFAULT true,
tooltip     text,
is_highlighted boolean DEFAULT false, -- show on plan card (top 5)
sort_order  int DEFAULT 0,
created_at  timestamptz DEFAULT now(),
updated_at  timestamptz DEFAULT now()
```

New table `plan_prices`:
```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
plan_id          uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
interval         text NOT NULL CHECK (interval IN ('monthly','yearly','one_time')),
currency         text NOT NULL DEFAULT 'usd',
amount           numeric(10,2) NOT NULL,
compare_at_amount numeric(10,2),
stripe_price_id  text,
is_active        boolean DEFAULT true,
created_at       timestamptz DEFAULT now(),
updated_at       timestamptz DEFAULT now()
```

New table `checkout_sessions`:
```sql
id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
user_id                  uuid REFERENCES profiles(id),    -- nullable pre-auth
email                    text,
selected_plan_id         uuid REFERENCES plans(id),
stripe_checkout_session_id text UNIQUE,
status                   text DEFAULT 'pending'
                         CHECK (status IN ('pending','completed','expired','abandoned')),
metadata                 jsonb DEFAULT '{}',
created_at               timestamptz DEFAULT now(),
updated_at               timestamptz DEFAULT now()
```

Add to `profiles`:
```sql
onboarding_completed boolean DEFAULT false
```

**Seed migration `20260614_billing_v2_seed.sql`:**
- Backfill `plans.slug` from `lower(name)` with spaces→hyphens
- Backfill `plans.badge_text` from `is_popular` ("Popular")
- Backfill `plans.is_recommended` from `is_popular`
- Seed `plan_features` rows for Trial/Starter/Pro (highlighted: top 5 per plan)
- Seed `plan_prices` rows from existing `price_monthly`/`price_yearly` columns

RLS:
- `plan_features`: SELECT open (same as plans), INSERT/UPDATE/DELETE admin only
- `plan_prices`: SELECT open, INSERT/UPDATE/DELETE admin only
- `checkout_sessions`: INSERT by authenticated/service, SELECT owner+admin

### Phase B — Pricing page v2

File: `apps/web/src/components/PricingSection.tsx` (rewrite / extend existing)

Sections (all data from DB via `usePlans` hook):
1. **Hero** — headline + subheadline (hardcoded copy, not DB)
2. **Billing toggle** — monthly/yearly (existing)
3. **Plan cards** — badge_text, short_description, best_for, cta_text, highlighted plan_features (top 5), limits summary, CTA button
4. **Feature comparison table** — rows grouped by `group_name`, columns = plans, cells = display_value or ✓/✗
5. **FAQ** — 6 hardcoded entries (can add DB table later)
6. **Trust/security section** — "No free account" message, Stripe badge, security bullets
7. **Skeleton loading** — while usePlans fetches

Hook update: `packages/api-client/src/hooks/usePlans.tsx` — fetch `plan_features` + `plan_prices` alongside plans.

### Phase C — Onboarding wizard

New file: `apps/web/src/pages/onboarding/Onboarding.tsx`

Steps:
1. Workspace name (saves to new `workspaces` table or `profiles.workspace_name`)
2. Main use case (Amazon→eBay, Walmart→eBay, Multi-supplier)
3. Marketplace preference (eBay US, eBay UK, etc.)
4. Supplier preference (Amazon, Walmart, Both)
5. Done / Go to dashboard

State: stored in `profiles.onboarding_data jsonb` + `profiles.onboarding_completed`.

Route: `/onboarding` — protected (requires active/trial), redirects to `/dashboard` if `onboarding_completed`.

`CheckoutSuccess.tsx` — after polling `access === 'active'|'trial'`, redirect to `/onboarding` instead of `/dashboard` if `!onboarding_completed`.

### Phase D — Plan-first signup

`apps/web/src/App.tsx` — `/auth` and `/register` routes:
- If no `?plan=` param in URL → redirect to `/pricing`
- Pass plan slug + interval through auth flow to CheckoutDialog post-login

`apps/web/src/pages/auth/SignUp.tsx` (or existing auth component):
- Read `plan` and `interval` from URL params
- After Supabase signUp completes → open CheckoutDialog with those params

### Phase E — checkout_sessions tracking

`supabase/functions/create-checkout/index.ts`:
- INSERT into `checkout_sessions` (pending) before returning the Stripe URL
- On `checkout.session.completed` in `stripe-webhook`, UPDATE status → 'completed'

### Phase F — Admin upgrades

`apps/admin/src/pages/AdminPlans.tsx` — add fields:
- slug, short_description, long_description, best_for, badge_text, cta_text
- is_public, trial_requires_card, stripe_product_id
- `archived_at` → Archive button (sets archived_at, does NOT delete)

New admin pages:
- `AdminPlanFeatures.tsx` — per-plan feature list (group, title, display_value, included, sort_order, is_highlighted)
- `AdminPlanPrices.tsx` — per-plan price list (interval, amount, stripe_price_id, is_active)
- `AdminSubscriptions.tsx` — query user_plans JOIN profiles JOIN plans; show status, plan name, user email, period_end
- `AdminCheckoutSessions.tsx` — query checkout_sessions; show pending/abandoned sessions

New routes in `apps/admin/src/App.tsx`:
- `/plans/:id/features` → AdminPlanFeatures
- `/plans/:id/prices` → AdminPlanPrices
- `/subscriptions` → AdminSubscriptions
- `/checkout-sessions` → AdminCheckoutSessions

---

## 4. Commands

```bash
# Apply migrations (via Supabase MCP or CLI)
supabase db push

# Regenerate types after schema changes
supabase gen types typescript --project-id ojxzssooylmydystjvdo > packages/types/src/supabase.ts

# Typecheck
npm run typecheck

# Build
npm run build

# Web dev server
npm run dev

# Admin dev server
npm run dev:admin
```

---

## 5. Code style & conventions

- TypeScript strict; no `any` except `(invoice as any).hosted_invoice_url`
- Supabase MCP for migrations and edge function deploys
- React components: functional, no class components
- Tailwind CSS + shadcn/ui (existing UI library)
- No hardcoded plan names, prices, limits, or feature strings in components
- All plan data flows from DB → hook → component
- Edge functions: Deno, `https://esm.sh/` imports, no node_modules
- Shared edge-function code: `supabase/functions/_shared/`
- No free-plan fallback anywhere; `access === 'none'` → `/choose-plan`

---

## 6. Testing strategy

- Unit tests (Node `--experimental-strip-types --test`):
  - Any new pure helper in `_shared/`
- Existing tests must stay green: `supabase/functions/_shared/billing.test.ts`, `_shared/email.test.ts`
- After each phase: `npm run typecheck` + `npm run build` must pass
- Manual smoke test: pricing page renders 3 plan cards with features, onboarding wizard completes, admin can add a plan_feature

---

## 7. Boundaries

**Always do:**
- Keep existing `stripe_price_id_monthly/yearly` columns in plans (backward compat)
- Keep existing feature_flags jsonb for server-side gating (plan_features is additive for UI)
- Keep `is_popular` column alongside new `is_recommended` (don't delete old column)
- Use Supabase MCP for all DB migrations and edge function deploys
- Fire-and-forget emails (never block webhook response)

**Never do:**
- Delete or rename existing columns in `plans`, `user_plans`, `profiles`
- Rebuild create-checkout, stripe-webhook, check-subscription-v2 from scratch
- Expose `STRIPE_SECRET_KEY` to frontend
- Skip webhook signature verification
- Hard-code any plan name, price, or feature in React components
- Create a free plan or free-tier fallback

**Ask first:**
- If schema changes could affect existing Stripe subscription data
- If an existing Edge Function needs a breaking API change
- Before any destructive migration (DROP COLUMN, DROP TABLE)

// Single source of truth for "where does this user go next?".
//
// Every entry point (signup effect, login effect, dashboard guard, checkout
// success, choose-plan) delegates here so routing can never drift between
// pages. Pure and deterministic → fully unit-testable without React.
//
// IMPORTANT: this only chooses a DESTINATION. It never grants access — the
// dashboard guard (isDashboardAllowed) and the server (check-subscription-v2,
// RLS, gating RPCs) remain the real boundary. `access` here must come from the
// authoritative server check, not profile flags alone.

import type { AccessState } from './dashboardAccess';

export interface NextStepInput {
  /** Is there an authenticated user at all. */
  hasUser: boolean;
  /** user.email_confirmed_at != null. */
  isEmailVerified: boolean;
  /** Admin/super-admin — always routed to the admin app. */
  isAdmin: boolean;
  /** Authoritative subscription state from check-subscription-v2. */
  access: AccessState;
  /** Selected-plan token (URL ?plan → sessionStorage intent → pending_plan_id). */
  planToken: string | null | undefined;
  /** Goal-aware dashboard path (e.g. /dashboard/ebay). */
  dashboardPath: string;
  /** Whether the user has completed the onboarding flow. */
  onboardingCompleted: boolean;
}

// Sentinel routes. Kept as named constants so callers can compare without
// stringly-typed drift. VERIFY_EMAIL is mostly defensive — the auth pages
// render their verify UI inline and the guard has its own verify screen, so
// they won't usually act on it.
export const ROUTE_LOGIN = '/auth';
export const ROUTE_VERIFY_EMAIL = '/verify-email';
export const ROUTE_ADMIN = '/admin';
export const ROUTE_BILLING = '/dashboard/billing';
export const ROUTE_CHOOSE_PLAN = '/choose-plan';
export const ROUTE_PRICING = '/pricing';

/**
 * Resolve the canonical next destination for a user's current state.
 * First match wins:
 *   1. not signed in        → /auth
 *   2. email not verified    → /verify-email (defensive)
 *   3. admin                 → /admin
 *   4. onboarding not completed → dashboardPath
 *   5. past_due              → /dashboard/billing (recover payment)
 *   6. active | trial        → dashboard
 *   7. trial_expired         → /choose-plan
 *   8. has a plan token      → /checkout?plan=<token>
 *   9. otherwise             → /pricing
 */
export function resolveNextStep(input: NextStepInput): string {
  if (!input.hasUser) return ROUTE_LOGIN;
  if (!input.isEmailVerified) return ROUTE_VERIFY_EMAIL;
  if (input.isAdmin) return ROUTE_ADMIN;

  // Onboarding has priority over subscription gates — it must complete first
  if (!input.onboardingCompleted) return input.dashboardPath;

  if (input.access === 'past_due') return ROUTE_BILLING;

  if (input.access === 'active' || input.access === 'trial') {
    return input.dashboardPath;
  }

  if (input.access === 'trial_expired') return ROUTE_CHOOSE_PLAN;

  const token = (input.planToken ?? '').trim();
  if (token) return `/checkout?plan=${encodeURIComponent(token)}`;

  return '/billing';
}

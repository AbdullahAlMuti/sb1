// Pure dashboard-access logic, extracted so the security gate is unit-testable
// without rendering React. Used by ProtectedRoute (which re-exports
// canAccessDashboard for existing importers).

export type AccessState = 'none' | 'trial' | 'trial_expired' | 'active' | 'past_due' | string;

/**
 * Fast, profile-flags-only access check. True when the user is an admin, or the
 * profile shows a selected plan that is paid AND its subscription is active.
 *
 * NOTE: profile flags cannot detect an expired $1 trial (a one-time payment has
 * no Stripe subscription to cancel, so the flags stay paid/active). Treat this
 * as a fast/fallback signal only — the authoritative gate is isDashboardAllowed
 * with the server `access` state.
 */
export function canAccessDashboard(user: any, profile: any, isAdmin: boolean): boolean {
  if (!user) return false;
  if (isAdmin) return true;
  if (!profile) return false;
  const isPaid = profile.payment_status === 'paid' || profile.payment_status === 'succeeded';
  const isSubscriptionActive = profile.subscription_status === 'active';
  return Boolean(profile.selected_plan_id && isPaid && isSubscriptionActive);
}

/**
 * Authoritative dashboard gate.
 * - admins always allowed
 * - server access 'active'/'trial' allowed (authoritative positive)
 * - server access 'trial_expired'/'past_due' is a definitive block — profile
 *   flags can NOT override it (closes the stale-expired-trial hole)
 * - otherwise (server 'none'/unknown, e.g. the check errored) fall back to the
 *   profile flags so a transient server error never locks out a paying customer
 */
export function isDashboardAllowed(input: {
  isAdmin: boolean;
  access: AccessState;
  profileAllows: boolean;
}): boolean {
  if (input.isAdmin) return true;
  if (input.access === 'active' || input.access === 'trial') return true;
  const serverBlocks = input.access === 'trial_expired' || input.access === 'past_due';
  return !serverBlocks && input.profileAllows;
}

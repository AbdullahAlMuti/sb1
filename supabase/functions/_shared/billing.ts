// Pure billing/subscription logic shared by create-checkout, stripe-webhook
// and check-subscription-v2. No I/O here — keep it unit-testable.

/** -1 in the DB means unlimited; any non-negative limit is enforced normally. */
export function isWithinLimit(current: number, amount: number, limit: number): boolean {
  if (limit === -1) return true;
  return current + amount <= limit;
}

export type AccessState = "none" | "trial" | "trial_expired" | "active" | "past_due";

export interface PlanLike {
  id: string;
  is_trial?: boolean | null;
  stripe_price_id_monthly?: string | null;
  stripe_price_id_yearly?: string | null;
  stripe_price_id_one_time?: string | null;
}

export interface UserPlanLike {
  plan_id?: string | null;
  status?: string | null;
  trial_end?: string | null;
  current_period_end?: string | null;
}

// Single source of truth for "what can this user do right now".
// Stripe remains authoritative for paid subscriptions; this only interprets
// the locally-synced state.
export function resolveAccessState(
  userPlan: UserPlanLike | null,
  plan: PlanLike | null,
  now: Date = new Date(),
): AccessState {
  if (!userPlan || !plan || !userPlan.plan_id) return "none";

  const status = userPlan.status ?? "";

  if (status === "past_due") return "past_due";

  const isTrialPlan = Boolean(plan.is_trial);
  if (isTrialPlan) {
    if (status === "expired") return "trial_expired";
    if (status === "trialing" || status === "active") {
      const trialEnd = userPlan.trial_end ? new Date(userPlan.trial_end) : null;
      if (!trialEnd || trialEnd.getTime() <= now.getTime()) return "trial_expired";
      return "trial";
    }
    return "trial_expired";
  }

  if (status === "active" || status === "trialing") return "active";
  return "none";
}

export interface TrialEligibility {
  eligible: boolean;
  reason: string | null;
}

// One trial per account, enforced in three layers:
// profiles.trial_used_at (atomic claim), historical trial user_plans rows,
// and Stripe customer metadata (survives DB-level resets / re-registration).
export function isTrialEligible(input: {
  trialUsedAt: string | null | undefined;
  hadTrialPlanBefore: boolean;
  customerTrialUsed: boolean;
}): TrialEligibility {
  if (input.trialUsedAt) {
    return { eligible: false, reason: "Trial already used on this account" };
  }
  if (input.hadTrialPlanBefore) {
    return { eligible: false, reason: "Trial already used on this account" };
  }
  if (input.customerTrialUsed) {
    return { eligible: false, reason: "Trial already used with this payment account" };
  }
  return { eligible: true, reason: null };
}

export function trialEndFor(now: Date, durationDays: number): Date {
  const days = Number.isFinite(durationDays) && durationDays > 0 ? durationDays : 7;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export type BillingInterval = "monthly" | "yearly" | "one_time" | null;

export function billingIntervalForPrice(plan: PlanLike, priceId: string | null | undefined): BillingInterval {
  if (!priceId) return null;
  if (priceId === plan.stripe_price_id_monthly) return "monthly";
  if (priceId === plan.stripe_price_id_yearly) return "yearly";
  if (priceId === plan.stripe_price_id_one_time) return "one_time";
  return null;
}

// Whether the lazy expiry flip should run (check-subscription-v2 writes
// status='expired' so analytics see expirations without a cron).
export function shouldFlipToExpired(userPlan: UserPlanLike | null, plan: PlanLike | null, now: Date = new Date()): boolean {
  if (!userPlan || !plan || !plan.is_trial) return false;
  if (userPlan.status !== "trialing" && userPlan.status !== "active") return false;
  const trialEnd = userPlan.trial_end ? new Date(userPlan.trial_end) : null;
  return !trialEnd || trialEnd.getTime() <= now.getTime();
}

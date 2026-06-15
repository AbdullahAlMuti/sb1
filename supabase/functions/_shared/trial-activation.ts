// Idempotent $1-trial activation, shared by stripe-webhook (primary path) and
// check-subscription-v2 (reconciliation / self-heal path).
//
// A $1 trial is a one-time payment, so there is NO Stripe subscription to read
// back later. The trial only exists in our DB once it has been activated. This
// helper performs that activation atomically:
//   - claims profiles.trial_used_at (one trial per account, race-safe)
//   - upserts user_plans (status='trialing')
//   - updates profiles flags (paid/active, customer id, period)
//   - records the credit grant
//   - marks the Stripe customer (survives DB resets / re-registration)
//
// If the trial was already claimed (replayed webhook, concurrent reconcile),
// it no-ops and returns { activated: false }.

import type Stripe from "https://esm.sh/stripe@18.5.0";
import { trialEndFor } from "./billing.ts";

// The Supabase clients in these functions are created untyped; keep the param
// loose so this helper drops into both call sites without generic friction.
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export interface TrialActivationInput {
  userId: string;
  planId: string;
  stripeCustomerId: string | null;
  /** Stable id for audit metadata + profiles.subscription_id (payment_intent or session id). */
  sourceId: string;
}

export interface TrialActivationResult {
  activated: boolean;
  reason?: string;
  planName?: string;
  trialEnd?: string;
}

export async function activateTrial(
  supabase: SupabaseClient,
  stripe: Stripe,
  input: TrialActivationInput,
): Promise<TrialActivationResult> {
  const { userId, planId, stripeCustomerId, sourceId } = input;

  if (!userId || !planId) {
    return { activated: false, reason: "missing_user_or_plan" };
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("id, name, is_trial, trial_duration_days, credits_per_month, max_auto_orders")
    .eq("id", planId)
    .maybeSingle();

  if (!plan?.is_trial) {
    return { activated: false, reason: "not_a_trial_plan" };
  }

  // Atomic one-trial-per-account claim. Only the first caller flips trial_used_at
  // from null; everyone else sees no claimed row and bails.
  const { data: claimed } = await supabase
    .from("profiles")
    .update({ trial_used_at: new Date().toISOString() })
    .eq("id", userId)
    .is("trial_used_at", null)
    .select("id");

  if (!claimed?.length) {
    return { activated: false, reason: "already_claimed" };
  }

  const now = new Date();
  const trialEnd = trialEndFor(now, plan.trial_duration_days ?? 7);

  const planPayload = {
    user_id: userId,
    plan_id: plan.id,
    status: "trialing",
    stripe_subscription_id: null,
    current_period_start: now.toISOString(),
    current_period_end: trialEnd.toISOString(),
    trial_end: trialEnd.toISOString(),
    orders_used: 0,
    credits_used: 0,
    updated_at: now.toISOString(),
  };

  const { data: existingPlan } = await supabase
    .from("user_plans")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingPlan) {
    await supabase.from("user_plans").update(planPayload).eq("user_id", userId);
  } else {
    await supabase.from("user_plans").insert(planPayload);
  }

  const profileUpdate: Record<string, unknown> = {
    plan_id: plan.id,
    credits: plan.credits_per_month,
    selected_plan_id: plan.id,
    pending_plan_id: null,
    payment_status: "paid",
    subscription_status: "active",
    customer_id: stripeCustomerId,
    subscription_id: sourceId,
    current_period_start: now.toISOString(),
    current_period_end: trialEnd.toISOString(),
    subscription_provider: "stripe",
    updated_at: now.toISOString(),
  };
  if (stripeCustomerId) profileUpdate.stripe_customer_id = stripeCustomerId;
  await supabase.from("profiles").update(profileUpdate).eq("id", userId);

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: plan.credits_per_month,
    transaction_type: "plan_grant",
    balance_after: plan.credits_per_month,
    description: "Trial activated",
    metadata: { plan_id: plan.id, source_id: sourceId, trial_end: trialEnd.toISOString() },
  });

  // Belt-and-braces: mark the Stripe customer so a wiped/re-created account
  // reusing the same customer cannot start a second trial.
  if (stripeCustomerId) {
    try {
      await stripe.customers.update(stripeCustomerId, { metadata: { trial_used: "true" } });
    } catch (_err) {
      // non-fatal
    }
  }

  return { activated: true, planName: plan.name, trialEnd: trialEnd.toISOString() };
}

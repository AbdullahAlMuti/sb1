import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  resolveAccessState,
  shouldFlipToExpired,
  billingIntervalForPrice,
  type AccessState,
} from "../_shared/billing.ts";
import { activateTrial } from "../_shared/trial-activation.ts";
import { resolveCorsHeaders } from "../_shared/cors.ts";


const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION-V2] ${step}${detailsStr}`);
};

type PlanDetails = {
  id: string;
  name: string;
  display_name: string;
  credits_per_month: number;
  max_listings: number;
  max_auto_orders: number;
  is_trial: boolean;
  feature_flags: Record<string, unknown>;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  stripe_price_id_one_time: string | null;
};

const PLAN_COLUMNS =
  "id, name, display_name, credits_per_month, max_listings, max_auto_orders, is_trial, feature_flags, stripe_price_id_monthly, stripe_price_id_yearly, stripe_price_id_one_time";

function toPlanDetails(row: Record<string, unknown> | null): PlanDetails | null {
  if (!row?.id) return null;
  return {
    id: String(row.id),
    name: String(row.name ?? "none"),
    display_name: String(row.display_name ?? row.name ?? "none"),
    credits_per_month: Number(row.credits_per_month ?? 0),
    max_listings: Number(row.max_listings ?? 0),
    max_auto_orders: Number(row.max_auto_orders ?? 0),
    is_trial: Boolean(row.is_trial),
    feature_flags: (row.feature_flags as Record<string, unknown>) ?? {},
    stripe_price_id_monthly: (row.stripe_price_id_monthly as string) ?? null,
    stripe_price_id_yearly: (row.stripe_price_id_yearly as string) ?? null,
    stripe_price_id_one_time: (row.stripe_price_id_one_time as string) ?? null,
  };
}

function emptyResponse(extra?: Record<string, unknown>) {
  return {
    subscribed: false,
    plan_name: "none",
    plan: null,
    limits: null,
    usage: null,
    trial: null,
    access: "none" as AccessState,
    billing_interval: null,
    cancel_at_period_end: false,
    product_id: null,
    subscription_end: null,
    stripe_subscription_id: null,
    ...extra,
  };
}

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const supabaseServiceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    logStep("Function started", { version: "v2" });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify(emptyResponse()), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser(token);

    if (userError || !userData?.user?.email) {
      logStep("Auth error - returning unauthenticated response", {
        error: userError?.message ?? "missing_user",
      });
      return new Response(JSON.stringify(emptyResponse()), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const user = userData.user;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { data: profile } = await supabaseServiceClient
      .from("profiles")
      .select("credits, plan_id, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    // Create a mutable copy of the profile data so we can update it in memory
    // and return the fresh credits and plan ID to the client.
    let profileObj = profile ? { ...profile } : null;

    // Resolve an active/trialing Stripe subscription. Prefer the stored
    // customer id; fall back to an email scan for legacy profiles.
    const findActiveSubscription = async (): Promise<Stripe.Subscription | null> => {
      const candidateCustomerIds: string[] = [];
      if (typeof profile?.stripe_customer_id === "string" && profile.stripe_customer_id) {
        candidateCustomerIds.push(profile.stripe_customer_id);
      } else {
        const customers = await stripe.customers.list({ email: user.email!, limit: 10 });
        candidateCustomerIds.push(...customers.data.map((c: Stripe.Customer) => c.id));
      }

      for (const customerId of candidateCustomerIds) {
        try {
          const subs = await stripe.subscriptions.list({
            customer: customerId,
            status: "all",
            limit: 10,
          });
          const activeSub = subs.data.find(
            (s: Stripe.Subscription) =>
              s.status === "active" || s.status === "trialing" || s.status === "past_due",
          );
          if (activeSub) return activeSub;
        } catch (_e) {
          logStep("Stripe subscriptions lookup failed", { customerId });
        }
      }
      return null;
    };

    const subscription = await findActiveSubscription();
    const hasActiveSub = Boolean(
      subscription && (subscription.status === "active" || subscription.status === "trialing"),
    );

    // Reconciliation / self-heal: a $1 trial is a one-time payment with no Stripe
    // subscription, so it only exists in our DB once activated by the webhook. If
    // the webhook was delayed or dropped, detect a paid one-time trial checkout
    // here and activate it idempotently — dashboard access never depends on a
    // single webhook delivery. Cheap: only runs when there is no live sub and no
    // local active/trialing plan, and only when a Stripe customer id is known.
    if (!subscription && typeof profile?.stripe_customer_id === "string" && profile.stripe_customer_id) {
      try {
        const { data: localPlan } = await supabaseServiceClient
          .from("user_plans")
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle();
        const alreadyActive =
          localPlan?.status === "active" ||
          localPlan?.status === "trialing" ||
          localPlan?.status === "past_due";

        if (!alreadyActive) {
          const sessions = await stripe.checkout.sessions.list({
            customer: profile.stripe_customer_id,
            limit: 10,
          });
          const paidTrialSession = sessions.data.find(
            (s) => s.mode === "payment" && s.payment_status === "paid" && s.metadata?.plan_id,
          );
          if (paidTrialSession?.metadata?.plan_id) {
            const result = await activateTrial(supabaseServiceClient, stripe, {
              userId: user.id,
              planId: paidTrialSession.metadata.plan_id,
              stripeCustomerId: profile.stripe_customer_id,
              sourceId:
                (typeof paidTrialSession.payment_intent === "string"
                  ? paidTrialSession.payment_intent
                  : null) || paidTrialSession.id,
            });
            if (result.activated) {
              logStep("Trial reconciled from Stripe (webhook self-heal)", { userId: user.id });
            }
          }
        }
      } catch (e) {
        logStep("Trial reconciliation skipped (non-fatal)", { error: String(e) });
      }
    }

    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let planDetails: PlanDetails | null = null;
    let billingInterval: ReturnType<typeof billingIntervalForPrice> = null;
    let cancelAtPeriodEnd = false;

    if (subscription) {
      stripeSubscriptionId = subscription.id;
      cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);

      const cpe = (subscription as any).current_period_end;
      if (Number.isFinite(cpe)) {
        subscriptionEnd = new Date(cpe * 1000).toISOString();
      }

      const stripePriceId = subscription.items?.data?.[0]?.price?.id as string | undefined;

      if (subscription.items?.data?.[0]?.price?.product) {
        productId = subscription.items.data[0].price.product as string;
      }

      // DYNAMIC plan lookup - no hardcoded mappings
      const { data: planData } = stripePriceId
        ? await supabaseServiceClient
            .from("plans")
            .select(PLAN_COLUMNS)
            .or(`stripe_price_id_monthly.eq.${stripePriceId},stripe_price_id_yearly.eq.${stripePriceId}`)
            .maybeSingle()
        : ({ data: null } as any);

      planDetails = toPlanDetails(planData);
      if (planDetails) {
        billingInterval = billingIntervalForPrice(planDetails, stripePriceId ?? null);
      }

      // Persist plan info (best-effort) for paid subscriptions
      if (planDetails && hasActiveSub) {
        const { data: existingPlan } = await supabaseServiceClient
          .from("user_plans")
          .select("id, plan_id, current_period_end")
          .eq("user_id", user.id)
          .maybeSingle();

        const periodChanged = existingPlan && existingPlan.current_period_end !== subscriptionEnd;
        const planChanged = !existingPlan || existingPlan.plan_id !== planDetails.id;

        const payload: Record<string, unknown> = {
          user_id: user.id,
          plan_id: planDetails.id,
          status: "active",
          stripe_subscription_id: stripeSubscriptionId,
          current_period_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        };

        const profileUpdate: Record<string, unknown> = {
          plan_id: planDetails.id,
          selected_plan_id: planDetails.id,
          payment_status: "paid",
          subscription_status: "active",
          current_period_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        };

        if (planChanged || periodChanged) {
          payload.orders_used = 0;
          payload.credits_used = 0;
          profileUpdate.credits = planDetails.credits_per_month;

          const description = planChanged 
            ? `Plan updated to ${planDetails.name} (reconciliation)` 
            : `Credits refreshed - ${planDetails.name} renewal (reconciliation)`;

          // Log order reset
          await supabaseServiceClient.from("order_transactions").insert({
            user_id: user.id,
            transaction_type: "period_reset",
            orders_used_after: 0,
            description: planChanged 
              ? `Order limit reset - plan changed to ${planDetails.name} (reconciliation)` 
              : "Order limit reset - subscription renewal (reconciliation)",
            metadata: {
              plan_id: planDetails.id,
              max_orders: planDetails.max_auto_orders,
              old_plan_id: existingPlan?.plan_id ?? null,
              is_new_period: periodChanged,
              is_plan_change: planChanged,
            },
          });

          // Log credit transaction
          await supabaseServiceClient.from("credit_transactions").insert({
            user_id: user.id,
            amount: planDetails.credits_per_month,
            transaction_type: "plan_grant",
            balance_after: planDetails.credits_per_month,
            description: description,
            metadata: {
              old_plan_id: existingPlan?.plan_id ?? null,
              new_plan_id: planDetails.id,
              stripe_subscription_id: stripeSubscriptionId,
              is_new_period: periodChanged,
              is_plan_change: planChanged,
            },
          });

          logStep(planChanged 
            ? "Plan upgrade/downgrade detected in reconciliation, reset usage and granted credits"
            : "Plan renewal detected in reconciliation, reset usage and refreshed credits", 
            {
              userId: user.id,
              oldPlanId: existingPlan?.plan_id ?? null,
              newPlanId: planDetails.id,
            }
          );
        }

        // Atomic upsert: this self-heal runs concurrently with the Stripe webhook
        // and previously raced on a SELECT-then-INSERT, violating
        // user_plans_user_id_unique (23505). For a brand-new row orders_used
        // defaults to 0; on the unchanged path orders_used is intentionally left
        // out of the payload so an existing count is preserved on conflict.
        await supabaseServiceClient
          .from("user_plans")
          .upsert(existingPlan ? payload : { ...payload, orders_used: 0 }, { onConflict: "user_id" });

        await supabaseServiceClient
          .from("profiles")
          .update(profileUpdate)
          .eq("id", user.id);

        // Re-fetch profile to ensure in-memory state is fresh
        const { data: freshProfile } = await supabaseServiceClient
          .from("profiles")
          .select("credits, plan_id, stripe_customer_id")
          .eq("id", user.id)
          .maybeSingle();
        if (freshProfile) {
          profileObj = freshProfile;
        }
      } else if (!planDetails) {
        logStep("No matching plan found for subscription price");
      }
    }

    // Local plan state: trials and lapsed subscriptions have no live Stripe
    // subscription, so user_plans + profiles.plan_id carry the state.
    const { data: userPlan } = await supabaseServiceClient
      .from("user_plans")
      .select(
        "plan_id, status, trial_end, orders_used, credits_used, current_period_start, current_period_end",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (!planDetails) {
      const localPlanId = userPlan?.plan_id || profileObj?.plan_id;
      if (localPlanId) {
        const { data: pData } = await supabaseServiceClient
          .from("plans")
          .select(PLAN_COLUMNS)
          .eq("id", localPlanId)
          .maybeSingle();
        planDetails = toPlanDetails(pData);
        if (planDetails?.is_trial) billingInterval = "one_time";
      }
    }

    // Reactive trial expiry: flip status so analytics can see expirations
    // without a cron. Server-side enforcement lives in the DB gating RPCs.
    if (shouldFlipToExpired(userPlan, planDetails, new Date())) {
      await supabaseServiceClient
        .from("user_plans")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      // Keep public.profiles flags in lockstep so client fast-path can preemptively
      // block dashboard access without a bounce loop.
      await supabaseServiceClient
        .from("profiles")
        .update({
          payment_status: "unpaid",
          subscription_status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (userPlan) userPlan.status = "expired";
      logStep("Trial expired (lazy flip)", { userId: user.id });
    }

    const access = subscription && hasActiveSub && planDetails && !planDetails.is_trial
      ? ("active" as AccessState)
      : subscription && subscription.status === "past_due"
        ? ("past_due" as AccessState)
        : resolveAccessState(userPlan, planDetails, new Date());

    // Credits accounting: profiles.credits is the authoritative remaining
    // balance; plans.credits_per_month is the per-period total.
    const [{ count: listingsCount }] = await Promise.all([
      supabaseServiceClient
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);

    const creditsRemaining = Math.max(profileObj?.credits ?? 0, 0);
    const creditsTotal = planDetails && (access === "active" || access === "trial")
      ? planDetails.credits_per_month
      : 0;
    const creditsUsed = Math.max(creditsTotal - creditsRemaining, 0);
    const isSubscribed = access === "active";

    const trialInfo = planDetails?.is_trial
      ? {
          is_trial: true,
          trial_end: userPlan?.trial_end ?? null,
          trial_expired: access === "trial_expired",
        }
      : null;

    return new Response(
      JSON.stringify({
        subscribed: isSubscribed,
        plan_name: access === "none" ? "none" : planDetails?.name ?? "none",
        plan: planDetails
          ? {
              id: planDetails.id,
              name: planDetails.name,
              display_name: planDetails.display_name,
              credits_per_month: planDetails.credits_per_month,
              max_listings: planDetails.max_listings,
              max_auto_orders: planDetails.max_auto_orders,
              is_trial: planDetails.is_trial,
              feature_flags: planDetails.feature_flags,
            }
          : null,
        limits:
          planDetails && access !== "none"
            ? {
                credits_per_month: planDetails.credits_per_month,
                max_listings: planDetails.max_listings,
                max_auto_orders: planDetails.max_auto_orders,
              }
            : null,
        usage: {
          credits_total: creditsTotal,
          credits_remaining: creditsRemaining,
          listings_active: listingsCount ?? 0,
          orders_used: userPlan?.orders_used ?? 0,
          credits_used: creditsUsed,
          current_period_end: userPlan?.current_period_end ?? subscriptionEnd,
          status: userPlan?.status ?? (isSubscribed ? "active" : "none"),
        },
        trial: trialInfo,
        access,
        billing_interval: billingInterval,
        cancel_at_period_end: cancelAtPeriodEnd,
        product_id: productId,
        subscription_end: subscriptionEnd,
        stripe_subscription_id: stripeSubscriptionId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    const safeErrorMessage = errorMessage.includes("STRIPE_SECRET_KEY")
      ? "Payment service configuration error. Please contact support."
      : "Subscription check failed.";

    return new Response(JSON.stringify({ error: safeErrorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

import Stripe from "https://esm.sh/stripe@18.5.0";
import { activateTrial } from "./trial-activation.ts";

type SupabaseLike = {
  from: (table: string) => any;
};

export async function syncStripeData(
  supabaseAdmin: SupabaseLike,
  stripe: Stripe,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[billing-sync] Starting sync for customer: ${customerId}`);

    // 1. Resolve userId from profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, credits, plan_id, stripe_customer_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (profileError) throw profileError;

    let userId = profile?.id;
    let userEmail = profile?.email;

    if (!userId) {
      // Look up customer in Stripe to find email
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        throw new Error("Customer deleted in Stripe");
      }
      userEmail = customer.email;

      if (!userEmail) {
        throw new Error("No email found on Stripe customer");
      }

      // Look up profile by email
      const { data: profileByEmail, error: emailErr } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .eq("email", userEmail)
        .maybeSingle();

      if (emailErr) throw emailErr;
      if (!profileByEmail) {
        throw new Error(`No local profile found for customer email: ${userEmail}`);
      }

      userId = profileByEmail.id;

      // Link customer ID to profile
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("id", userId);
    }

    // 2. Retrieve subscriptions for this customer from Stripe
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    // Find the most active subscription (active > trialing > past_due > others)
    const activeSub = subs.data.find(
      (s: Stripe.Subscription) =>
        s.status === "active" || s.status === "trialing" || s.status === "past_due"
    );

    if (activeSub) {
      console.log(`[billing-sync] Found active/past_due Stripe subscription: ${activeSub.id} (status: ${activeSub.status})`);
      const priceId = activeSub.items.data[0]?.price?.id;

      // Find plan details by Stripe price ID
      const { data: planData } = await supabaseAdmin
        .from("plans")
        .select("id, name, credits_per_month, max_auto_orders")
        .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
        .maybeSingle();

      if (!planData) {
        throw new Error(`No matching plan found for Stripe price ID: ${priceId}`);
      }

      // If active/trialing, update/sync plan
      if (activeSub.status === "active" || activeSub.status === "trialing") {
        const { data: existingPlan } = await supabaseAdmin
          .from("user_plans")
          .select("id, plan_id, current_period_end")
          .eq("user_id", userId)
          .maybeSingle();

        const subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();
        const periodChanged = existingPlan && existingPlan.current_period_end !== subscriptionEnd;
        const planChanged = !existingPlan || existingPlan.plan_id !== planData.id;

        const planPayload: Record<string, unknown> = {
          user_id: userId,
          plan_id: planData.id,
          status: activeSub.status,
          stripe_subscription_id: activeSub.id,
          current_period_start: new Date(activeSub.current_period_start * 1000).toISOString(),
          current_period_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        };

        const profileUpdate: Record<string, unknown> = {
          plan_id: planData.id,
          selected_plan_id: planData.id,
          pending_plan_id: null,
          payment_status: "paid",
          subscription_status: "active",
          customer_id: customerId,
          subscription_id: activeSub.id,
          current_period_start: new Date(activeSub.current_period_start * 1000).toISOString(),
          current_period_end: subscriptionEnd,
          subscription_provider: "stripe",
          updated_at: new Date().toISOString(),
        };

        if (planChanged || periodChanged) {
          planPayload.orders_used = 0;
          planPayload.credits_used = 0;
          profileUpdate.credits = planData.credits_per_month;

          // Log credit transaction
          await supabaseAdmin.from("credit_transactions").insert({
            user_id: userId,
            amount: planData.credits_per_month,
            transaction_type: "plan_grant",
            balance_after: planData.credits_per_month,
            description: planChanged 
              ? `Subscribed to ${planData.name} plan` 
              : `Credits refreshed - ${planData.name} plan renewal`,
            metadata: {
              old_plan_id: existingPlan?.plan_id ?? null,
              new_plan_id: planData.id,
              stripe_subscription_id: activeSub.id,
              is_new_period: periodChanged,
              is_plan_change: planChanged,
            },
          });

          // Log order reset
          await supabaseAdmin.from("order_transactions").insert({
            user_id: userId,
            transaction_type: "period_reset",
            orders_used_after: 0,
            description: planChanged 
              ? `Order limit reset - plan changed to ${planData.name}` 
              : "Order limit reset - subscription renewal",
            metadata: {
              plan_id: planData.id,
              max_orders: planData.max_auto_orders,
            },
          });
        }

        await supabaseAdmin
          .from("user_plans")
          .upsert(existingPlan ? planPayload : { ...planPayload, orders_used: 0 }, { onConflict: "user_id" });

        await supabaseAdmin
          .from("profiles")
          .update(profileUpdate)
          .eq("id", userId);

        console.log(`[billing-sync] Subscription successfully synced for user: ${userId}`);
      } else if (activeSub.status === "past_due") {
        // Handle past_due
        await supabaseAdmin
          .from("user_plans")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("user_id", userId);

        await supabaseAdmin
          .from("profiles")
          .update({
            payment_status: "unpaid",
            subscription_status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        console.log(`[billing-sync] Subscription marked past_due for user: ${userId}`);
      }
    } else {
      // No active subscription. Check if they have a paid one-time trial checkout session
      const sessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 10,
      });

      const paidTrialSession = sessions.data.find(
        (s: Stripe.Checkout.Session) => s.mode === "payment" && s.payment_status === "paid" && s.metadata?.plan_id
      );

      if (paidTrialSession?.metadata?.plan_id) {
        console.log(`[billing-sync] Reconciling paid trial session: ${paidTrialSession.id}`);
        await activateTrial(supabaseAdmin, stripe, {
          userId,
          planId: paidTrialSession.metadata.plan_id,
          stripeCustomerId: customerId,
          sourceId: (typeof paidTrialSession.payment_intent === "string"
            ? paidTrialSession.payment_intent
            : null) || paidTrialSession.id,
        });
      } else {
        // No subscription and no trial checkout session -> Downgrade to no plan
        console.log(`[billing-sync] No subscription/trial found. Downgrading user: ${userId}`);
        
        await supabaseAdmin
          .from("user_plans")
          .update({
            plan_id: null,
            status: "canceled",
            orders_used: 0,
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        await supabaseAdmin
          .from("profiles")
          .update({
            plan_id: null,
            credits: 0,
            selected_plan_id: null,
            payment_status: "unpaid",
            subscription_status: "inactive",
            subscription_id: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        await supabaseAdmin.from("credit_transactions").insert({
          user_id: userId,
          amount: 0,
          transaction_type: "plan_grant",
          balance_after: 0,
          description: "Subscription ended",
          metadata: { reason: "stripe_sync_downgrade" },
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error(`[billing-sync] Error syncing Stripe data:`, error);
    return { success: false, error: error.message || String(error) };
  }
}

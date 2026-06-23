import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendBillingEmail } from "../_shared/email.ts";
import { activateTrial } from "../_shared/trial-activation.ts";
import { resolveCorsHeaders } from "../_shared/cors.ts";


const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    logStep("MISSING STRIPE_SECRET_KEY — webhook not configured");
    return new Response(JSON.stringify({ error: "Payment provider not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // SECURITY: Enforce webhook signature verification in production
  const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
  if (!webhookSecret && !isDevelopment) {
    logStep("SECURITY ERROR: STRIPE_WEBHOOK_SECRET not configured");
    return new Response(
      JSON.stringify({ error: "Webhook secret not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const findUserIdByCustomer = async (customerId: string | null | undefined): Promise<string | null> => {
    if (!customerId) return null;
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    return data?.id ?? null;
  };

  // Subscription ended (canceled/unpaid/deleted): there is no free plan -
  // the user drops to the explicit no-plan state and the choose-plan gate.
  const downgradeToNoPlan = async (userId: string, reason: string, clearSubscriptionId: boolean) => {
    const planPatch: Record<string, unknown> = {
      plan_id: null,
      status: "canceled",
      orders_used: 0,
      updated_at: new Date().toISOString(),
    };
    if (clearSubscriptionId) {
      planPatch.stripe_subscription_id = null;
      planPatch.current_period_end = null;
    }

    await supabase.from("user_plans").update(planPatch).eq("user_id", userId);
    
    const profilePatch: Record<string, unknown> = {
      plan_id: null,
      credits: 0,
      selected_plan_id: null,
      payment_status: "unpaid",
      subscription_status: "inactive",
      updated_at: new Date().toISOString()
    };
    if (clearSubscriptionId) {
      profilePatch.subscription_id = null;
      profilePatch.current_period_end = null;
    }
    await supabase.from("profiles").update(profilePatch).eq("id", userId);

    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: 0,
      transaction_type: "plan_grant",
      balance_after: 0,
      description: "Subscription ended",
      metadata: { reason },
    });

    logStep("User downgraded to no plan", { userId, reason });
  };

  const getUserEmailAndName = async (userId: string): Promise<{ email: string; name?: string } | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (!data?.email) return null;
    return { email: data.email, name: data.full_name ?? undefined };
  };

  // $1 trial purchase (checkout.session.completed with mode === "payment").
  // Activation is delegated to the shared, idempotent helper (also used by
  // check-subscription-v2 reconciliation) so the two paths can never diverge.
  // The trial_used_at claim is atomic, so replayed events and double purchases
  // activate at most once.
  const activateTrialFromSession = async (session: Stripe.Checkout.Session) => {
    const userId = session.metadata?.user_id;
    const planId = session.metadata?.plan_id;
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;

    if (!userId || !planId) {
      logStep("Payment-mode session missing metadata", { sessionId: session.id });
      return;
    }

    const result = await activateTrial(supabase, stripe, {
      userId,
      planId,
      stripeCustomerId,
      sourceId: (typeof session.payment_intent === "string" ? session.payment_intent : null) || session.id,
    });

    if (!result.activated) {
      logStep("Trial not activated", { userId, sessionId: session.id, reason: result.reason });
      return;
    }

    logStep("Trial activated", { userId, trialEnd: result.trialEnd });

    // Fire-and-forget - never let email failure fail the webhook
    getUserEmailAndName(userId).then((u) => {
      if (u) {
        sendBillingEmail({
          to: u.email,
          type: "trial_started",
          userName: u.name,
          trialEndDate: result.trialEnd,
        }).catch((e) => logStep("trial_started email error (non-fatal)", { error: String(e) }));
      }
    }).catch(() => {});
  };

  const syncActiveSubscriptionToUser = async (subscription: Stripe.Subscription, userId: string) => {
    const priceId = subscription.items.data[0]?.price?.id;
    const { data: planData } = await supabase
      .from("plans")
      .select("id, name, credits_per_month, max_auto_orders")
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
      .maybeSingle();

    if (!planData) {
      logStep("No matching plan found for price", { priceId });
      return;
    }

    const { data: existingPlan } = await supabase
      .from("user_plans")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const planPayload = {
      user_id: userId,
      plan_id: planData.id,
      status: subscription.status,
      stripe_subscription_id: subscription.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      orders_used: 0,
      credits_used: 0,
      updated_at: new Date().toISOString(),
    };

    if (existingPlan) {
      await supabase.from("user_plans").update(planPayload).eq("user_id", userId);
    } else {
      await supabase.from("user_plans").insert(planPayload);
    }

    await supabase
      .from("profiles")
      .update({
        plan_id: planData.id,
        credits: planData.credits_per_month,
        selected_plan_id: planData.id,
        pending_plan_id: null,
        payment_status: "paid",
        subscription_status: "active",
        customer_id: subscription.customer as string,
        subscription_id: subscription.id,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        subscription_provider: "stripe",
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    logStep("User plan updated", { userId, planName: planData.name });
  };

  try {
    // Claim-release idempotency: track the claimed event id so a mid-processing
    // failure can release it (DELETE) and let Stripe retry re-process it.
    let claimedEventId: string | null = null;
    logStep("Webhook received");

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // SECURITY: Verify webhook signature
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        logStep("Webhook signature verification failed", { error: String(err) });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (isDevelopment) {
      // WARNING: Development mode only - signature not verified
      event = JSON.parse(body);
      logStep("WARNING: Development mode - webhook signature not verified");
    } else {
      logStep("SECURITY ERROR: Missing webhook signature");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Processing event", { type: event.type, id: event.id });

    // Idempotency: skip events we've already processed
    const { error: insertError } = await supabase
      .from("stripe_events")
      .insert({ id: event.id, type: event.type });

    if (insertError?.code === "23505") {
      logStep("Duplicate event, skipping", { id: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert above succeeded (not a duplicate) - we now own this event id.
    claimedEventId = event.id;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { 
          sessionId: session.id, 
          customerId: session.customer,
          subscriptionId: session.subscription 
        });

        const userId = session.metadata?.user_id;
        const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;

        // Mark checkout_sessions row as completed (fire-and-forget)
        supabase.from("checkout_sessions")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("stripe_checkout_session_id", session.id)
          .then(({ error: csErr }) => {
            if (csErr) console.warn("[WEBHOOK] checkout_sessions update failed", csErr.message);
          });

        if (session.mode === "payment") {
          await activateTrialFromSession(session);
          break;
        }

        if (userId && session.subscription) {
          // Fetch subscription details
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          const priceId = subscription.items.data[0]?.price?.id;
          
          // Find plan by Stripe price ID - DYNAMIC, no hardcoding
          const { data: planData } = await supabase
            .from("plans")
            .select("id, name, credits_per_month, max_auto_orders")
            .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
            .maybeSingle();

          if (planData) {
            // Upsert user_plans with reset order count for new subscription
            const { data: existingPlan } = await supabase
              .from("user_plans")
              .select("id")
              .eq("user_id", userId)
              .maybeSingle();

            const planPayload = {
              user_id: userId,
              plan_id: planData.id,
              status: "active",
              stripe_subscription_id: subscription.id,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              orders_used: 0, // Reset on new subscription
              credits_used: 0, // Reset on new subscription
              updated_at: new Date().toISOString(),
            };

            if (existingPlan) {
              await supabase.from("user_plans").update(planPayload).eq("user_id", userId);
            } else {
              await supabase.from("user_plans").insert(planPayload);
            }

            // Update profile with new plan, credits, and canonical Stripe customer id.
            const profileUpdate: Record<string, unknown> = {
              plan_id: planData.id,
              credits: planData.credits_per_month,
              selected_plan_id: planData.id,
              pending_plan_id: null,
              payment_status: "paid",
              subscription_status: "active",
              customer_id: stripeCustomerId,
              subscription_id: subscription.id,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              subscription_provider: "stripe",
              updated_at: new Date().toISOString()
            };
            if (stripeCustomerId) profileUpdate.stripe_customer_id = stripeCustomerId;

            await supabase
              .from("profiles")
              .update(profileUpdate)
              .eq("id", userId);

            // Log credit transaction
            await supabase.from("credit_transactions").insert({
              user_id: userId,
              amount: planData.credits_per_month,
              transaction_type: "plan_grant",
              balance_after: planData.credits_per_month,
              description: `Subscribed to ${planData.name} plan`,
              metadata: {
                plan_id: planData.id,
                plan_name: planData.name,
                stripe_subscription_id: subscription.id,
              },
            });

            // Log order reset transaction
            await supabase.from("order_transactions").insert({
              user_id: userId,
              transaction_type: "period_reset",
              orders_used_after: 0,
              description: `Order limit reset - new ${planData.name} subscription`,
              metadata: {
                plan_id: planData.id,
                max_orders: planData.max_auto_orders,
              },
            });

            logStep("User plan updated", { userId, planName: planData.name });

            getUserEmailAndName(userId).then((u) => {
              if (u) {
                sendBillingEmail({
                  to: u.email,
                  type: "subscription_activated",
                  userName: u.name,
                  planName: planData.name,
                }).catch((e) => logStep("subscription_activated email error (non-fatal)", { error: String(e) }));
              }
            }).catch(() => {});
          } else {
            logStep("No matching plan found for price", { priceId });
          }
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription created", {
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId: subscription.customer,
        });

        // Best-effort user resolution:
        // 1) profiles.stripe_customer_id == subscription.customer
        const userId = await findUserIdByCustomer(subscription.customer as string);
        if (!userId) {
          logStep("No user found for subscription customer", { customerId: subscription.customer });
          break;
        }

        if (subscription.status === "active" || subscription.status === "trialing") {
          await syncActiveSubscriptionToUser(subscription, userId);
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });

        // Find user by subscription ID in user_plans
        const { data: userPlan } = await supabase
          .from("user_plans")
          .select("user_id, plan_id, current_period_end")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (userPlan) {
          const priceId = subscription.items.data[0]?.price?.id;
          
          // Dynamic plan lookup
          const { data: planData } = await supabase
            .from("plans")
            .select("id, name, credits_per_month, max_auto_orders")
            .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
            .maybeSingle();

          if (planData && (subscription.status === "active" || subscription.status === "trialing")) {
            // Check if this is a new billing period (period_end changed)
            const newPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
            const isNewPeriod = userPlan.current_period_end !== newPeriodEnd;
            const planChanged = userPlan.plan_id !== planData.id;

            const updatePayload: Record<string, unknown> = {
              plan_id: planData.id,
              status: subscription.status,
              current_period_end: newPeriodEnd,
              updated_at: new Date().toISOString(),
            };

            // If it's a new period OR the plan itself changed, reset usage and grant credits
            if (isNewPeriod || planChanged) {
              updatePayload.orders_used = 0;
              updatePayload.credits_used = 0;

              const description = planChanged 
                ? `Plan updated to ${planData.name}` 
                : "Order limit reset - new billing period";

              logStep(planChanged 
                ? `Plan change detected from ${userPlan.plan_id} to ${planData.id}, resetting counts`
                : "New billing period detected, resetting order count"
              );

              // Update profiles with new plan credits
              await supabase
                .from("profiles")
                .update({ credits: planData.credits_per_month })
                .eq("id", userPlan.user_id);

              // Log order reset
              await supabase.from("order_transactions").insert({
                user_id: userPlan.user_id,
                transaction_type: "period_reset",
                orders_used_after: 0,
                description: planChanged ? `Order limit reset - plan changed to ${planData.name}` : "Order limit reset - new billing period",
                metadata: {
                  plan_id: planData.id,
                  max_orders: planData.max_auto_orders,
                  old_plan_id: userPlan.plan_id,
                },
              });

              // Log credit transaction
              await supabase.from("credit_transactions").insert({
                user_id: userPlan.user_id,
                amount: planData.credits_per_month,
                transaction_type: "plan_grant",
                balance_after: planData.credits_per_month,
                description: description,
                metadata: {
                  old_plan_id: userPlan.plan_id,
                  new_plan_id: planData.id,
                  stripe_subscription_id: subscription.id,
                  is_new_period: isNewPeriod,
                  is_plan_change: planChanged,
                },
              });
            }

            await supabase
              .from("user_plans")
              .update(updatePayload)
              .eq("user_id", userPlan.user_id);

            await supabase
              .from("profiles")
              .update({
                plan_id: planData.id,
                selected_plan_id: planData.id,
                pending_plan_id: null,
                payment_status: "paid",
                subscription_status: "active",
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq("id", userPlan.user_id);

          } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
            await downgradeToNoPlan(userPlan.user_id, subscription.status, false);
          } else if (subscription.status === "past_due") {
            await supabase
              .from("user_plans")
              .update({ status: "past_due", updated_at: new Date().toISOString() })
              .eq("user_id", userPlan.user_id);

            await supabase
              .from("profiles")
              .update({
                payment_status: "unpaid",
                subscription_status: "past_due",
                updated_at: new Date().toISOString()
              })
              .eq("id", userPlan.user_id);
            logStep("Subscription past_due", { userId: userPlan.user_id });
          }

          logStep("User subscription synced", { userId: userPlan.user_id, status: subscription.status });
        } else {
          logStep("No user_plan found for subscription", { subscriptionId: subscription.id });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        const { data: userPlan } = await supabase
          .from("user_plans")
          .select("user_id, plan_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (userPlan) {
          // Capture plan name before downgrade clears plan_id
          let cancelledPlanName: string | undefined;
          if (userPlan.plan_id) {
            const { data: planRow } = await supabase
              .from("plans")
              .select("name")
              .eq("id", userPlan.plan_id)
              .maybeSingle();
            cancelledPlanName = planRow?.name ?? undefined;
          }

          await downgradeToNoPlan(userPlan.user_id, "subscription_deleted", true);

          getUserEmailAndName(userPlan.user_id).then((u) => {
            if (u) {
              sendBillingEmail({
                to: u.email,
                type: "subscription_cancelled",
                userName: u.name,
                planName: cancelledPlanName,
              }).catch((e) => logStep("subscription_cancelled email error (non-fatal)", { error: String(e) }));
            }
          }).catch(() => {});
        } else {
          logStep("No user_plan found for subscription", { subscriptionId: subscription.id });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { invoiceId: invoice.id, subscriptionId: invoice.subscription });

        if (invoice.subscription) {
          const { data: userPlan } = await supabase
            .from("user_plans")
            .select("user_id")
            .eq("stripe_subscription_id", invoice.subscription as string)
            .maybeSingle();

          if (userPlan) {
            // No plan/credit changes - Stripe retries the charge; access is
            // restored by invoice.payment_succeeded or revoked by
            // customer.subscription.deleted.
            await supabase
              .from("user_plans")
              .update({ status: "past_due", updated_at: new Date().toISOString() })
              .eq("user_id", userPlan.user_id);
            logStep("User marked past_due", { userId: userPlan.user_id });

            getUserEmailAndName(userPlan.user_id).then((u) => {
              if (u) {
                sendBillingEmail({
                  to: u.email,
                  type: "payment_failed",
                  userName: u.name,
                  amountCents: (invoice.amount_due ?? 0) || undefined,
                  currency: invoice.currency ?? "usd",
                }).catch((e) => logStep("payment_failed email error (non-fatal)", { error: String(e) }));
              }
            }).catch(() => {});
          } else {
            logStep("No user_plan found for subscription", { subscriptionId: invoice.subscription });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment succeeded", { invoiceId: invoice.id, billingReason: invoice.billing_reason });

        // Only refresh credits on recurring payments (not initial subscription)
        if (invoice.subscription && invoice.billing_reason === "subscription_cycle") {
          // Find user by subscription ID
          const { data: userPlan } = await supabase
            .from("user_plans")
            .select("user_id")
            .eq("stripe_subscription_id", invoice.subscription as string)
            .maybeSingle();

          if (userPlan) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const priceId = subscription.items.data[0]?.price?.id;
            
            // Dynamic plan lookup
            const { data: planData } = await supabase
              .from("plans")
              .select("id, name, credits_per_month, max_auto_orders")
              .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
              .maybeSingle();

            if (planData) {
              // Refresh credits and reset order count
              await supabase
                .from("profiles")
                .update({ credits: planData.credits_per_month })
                .eq("id", userPlan.user_id);

              await supabase
                .from("user_plans")
                .update({
                  orders_used: 0,
                  credits_used: 0,
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", userPlan.user_id);

              // Log credit refresh
              await supabase.from("credit_transactions").insert({
                user_id: userPlan.user_id,
                amount: planData.credits_per_month,
                transaction_type: "period_reset",
                balance_after: planData.credits_per_month,
                description: `Credits refreshed - ${planData.name} plan renewal`,
                metadata: {
                  plan_id: planData.id,
                  invoice_id: invoice.id,
                },
              });

              // Log order reset
              await supabase.from("order_transactions").insert({
                user_id: userPlan.user_id,
                transaction_type: "period_reset",
                orders_used_after: 0,
                description: "Order limit reset - subscription renewal",
                metadata: {
                  plan_id: planData.id,
                  max_orders: planData.max_auto_orders,
                  invoice_id: invoice.id,
                },
              });

              logStep("Credits and orders refreshed", {
                userId: userPlan.user_id,
                credits: planData.credits_per_month,
                maxOrders: planData.max_auto_orders,
              });

              getUserEmailAndName(userPlan.user_id).then((u) => {
                if (u) {
                  sendBillingEmail({
                    to: u.email,
                    type: "payment_receipt",
                    userName: u.name,
                    planName: planData.name,
                    amountCents: (invoice.amount_paid ?? 0) || undefined,
                    currency: invoice.currency ?? "usd",
                    invoiceUrl: (invoice as any).hosted_invoice_url ?? undefined,
                    nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString(),
                  }).catch((e) => logStep("payment_receipt email error (non-fatal)", { error: String(e) }));
                }
              }).catch(() => {});
            }
          } else {
            logStep("No user_plan found for subscription", { subscriptionId: invoice.subscription });
          }
        }
        break;
      }

      // Alias (some setups still send invoice.paid)
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice paid", { invoiceId: invoice.id, billingReason: invoice.billing_reason });

        // Reuse existing renewal logic by falling through via manual invocation.
        // We keep the same behavior as invoice.payment_succeeded.
        if (invoice.subscription && invoice.billing_reason === "subscription_cycle") {
          const { data: userPlan } = await supabase
            .from("user_plans")
            .select("user_id")
            .eq("stripe_subscription_id", invoice.subscription as string)
            .maybeSingle();

          if (userPlan) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const priceId = subscription.items.data[0]?.price?.id;
            const { data: planData } = await supabase
              .from("plans")
              .select("id, name, credits_per_month, max_auto_orders")
              .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
              .maybeSingle();

            if (planData) {
              await supabase
                .from("profiles")
                .update({ credits: planData.credits_per_month })
                .eq("id", userPlan.user_id);

              await supabase
                .from("user_plans")
                .update({
                  orders_used: 0,
                  credits_used: 0,
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", userPlan.user_id);

              logStep("Credits and orders refreshed (invoice.paid)", {
                userId: userPlan.user_id,
                credits: planData.credits_per_month,
                maxOrders: planData.max_auto_orders,
              });

              getUserEmailAndName(userPlan.user_id).then((u) => {
                if (u) {
                  sendBillingEmail({
                    to: u.email,
                    type: "payment_receipt",
                    userName: u.name,
                    planName: planData.name,
                    amountCents: (invoice.amount_paid ?? 0) || undefined,
                    currency: invoice.currency ?? "usd",
                    invoiceUrl: (invoice as any).hosted_invoice_url ?? undefined,
                    nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString(),
                  }).catch((e) => logStep("payment_receipt email error (invoice.paid, non-fatal)", { error: String(e) }));
                }
              }).catch(() => {});
            }
          }
        }

        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    // Release the idempotency claim so Stripe's retry can re-process this event.
    if (claimedEventId) {
      try {
        await supabase.from("stripe_events").delete().eq("id", claimedEventId);
        logStep("Released idempotency claim for retry", { id: claimedEventId });
      } catch (delErr) {
        logStep("Failed to release idempotency claim (non-fatal)", { error: String(delErr) });
      }
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

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
      updated_at: new Date().toISOString(),
    };

    if (existingPlan) {
      await supabase.from("user_plans").update(planPayload).eq("user_id", userId);
    } else {
      await supabase.from("user_plans").insert(planPayload);
    }

    await supabase
      .from("profiles")
      .update({ plan_id: planData.id, credits: planData.credits_per_month })
      .eq("id", userId);

    logStep("User plan updated", { userId, planName: planData.name });
  };

  try {
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

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { 
          sessionId: session.id, 
          customerId: session.customer,
          subscriptionId: session.subscription 
        });

        const userId = session.metadata?.user_id;

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
              updated_at: new Date().toISOString(),
            };

            if (existingPlan) {
              await supabase.from("user_plans").update(planPayload).eq("user_id", userId);
            } else {
              await supabase.from("user_plans").insert(planPayload);
            }

            // Update profile with new plan and credits
            await supabase
              .from("profiles")
              .update({ 
                plan_id: planData.id, 
                credits: planData.credits_per_month 
              })
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
          .select("user_id, current_period_end")
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

            const updatePayload: Record<string, unknown> = {
              plan_id: planData.id,
              status: subscription.status,
              current_period_end: newPeriodEnd,
              updated_at: new Date().toISOString(),
            };

            // Reset orders_used if new billing period
            if (isNewPeriod) {
              updatePayload.orders_used = 0;
              logStep("New billing period detected, resetting order count");

              // Log order reset
              await supabase.from("order_transactions").insert({
                user_id: userPlan.user_id,
                transaction_type: "period_reset",
                orders_used_after: 0,
                description: "Order limit reset - new billing period",
                metadata: {
                  plan_id: planData.id,
                  max_orders: planData.max_auto_orders,
                },
              });
            }

            await supabase
              .from("user_plans")
              .update(updatePayload)
              .eq("user_id", userPlan.user_id);

            await supabase
              .from("profiles")
              .update({ plan_id: planData.id })
              .eq("id", userPlan.user_id);

          } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
            // Downgrade to free
            const { data: freePlan } = await supabase
              .from("plans")
              .select("id, credits_per_month")
              .eq("name", "free")
              .maybeSingle();

            await supabase
              .from("user_plans")
              .update({
                plan_id: freePlan?.id || null,
                status: "canceled",
                orders_used: 0,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userPlan.user_id);

            await supabase
              .from("profiles")
              .update({ 
                plan_id: freePlan?.id || null, 
                credits: freePlan?.credits_per_month ?? 5 
              })
              .eq("id", userPlan.user_id);

            // Log credit transaction for downgrade
            await supabase.from("credit_transactions").insert({
              user_id: userPlan.user_id,
              amount: freePlan?.credits_per_month ?? 5,
              transaction_type: "plan_grant",
              balance_after: freePlan?.credits_per_month ?? 5,
              description: "Downgraded to free plan",
              metadata: { reason: subscription.status },
            });
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

        // Find user by subscription ID
        const { data: userPlan } = await supabase
          .from("user_plans")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (userPlan) {
          const { data: freePlan } = await supabase
            .from("plans")
            .select("id, credits_per_month")
            .eq("name", "free")
            .maybeSingle();

          await supabase
            .from("user_plans")
            .update({
              plan_id: freePlan?.id || null,
              status: "canceled",
              stripe_subscription_id: null,
              current_period_end: null,
              orders_used: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userPlan.user_id);

          await supabase
            .from("profiles")
            .update({ 
              plan_id: freePlan?.id || null, 
              credits: freePlan?.credits_per_month ?? 5 
            })
            .eq("id", userPlan.user_id);

          // Log credit transaction
          await supabase.from("credit_transactions").insert({
            user_id: userPlan.user_id,
            amount: freePlan?.credits_per_month ?? 5,
            transaction_type: "plan_grant",
            balance_after: freePlan?.credits_per_month ?? 5,
            description: "Subscription canceled - downgraded to free plan",
            metadata: {},
          });

          logStep("User downgraded to free", { userId: userPlan.user_id });
        } else {
          logStep("No user_plan found for subscription", { subscriptionId: subscription.id });
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
                maxOrders: planData.max_auto_orders 
              });
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
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", userPlan.user_id);

              logStep("Credits and orders refreshed (invoice.paid)", {
                userId: userPlan.user_id,
                credits: planData.credits_per_month,
                maxOrders: planData.max_auto_orders,
              });
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
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

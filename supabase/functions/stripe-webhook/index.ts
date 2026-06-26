import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendBillingEmail } from "../_shared/email.ts";
import { activateTrial } from "../_shared/trial-activation.ts";
import { resolveCorsHeaders } from "../_shared/cors.ts";
import { syncStripeData } from "../_shared/billing-sync.ts";

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

  if (!webhookSecret) {
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

  const getUserEmailAndName = async (userId: string): Promise<{ email: string; name?: string } | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (!data?.email) return null;
    return { email: data.email, name: data.full_name ?? undefined };
  };

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

  let claimedEventId: string | null = null;
  try {
    logStep("Webhook received");

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (!signature) {
      logStep("SECURITY ERROR: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    logStep("Processing event", { type: event.type, id: event.id });

    const { error: insertError } = await supabase
      .from("stripe_events")
      .insert({ id: event.id, type: event.type });

    if (insertError) {
      if (insertError.code === "23505") {
        logStep("Duplicate event ignored", { id: event.id });
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      logStep("Error claiming event", { error: insertError.message });
      throw new Error(`Failed to claim idempotency key: ${insertError.message}`);
    }
    claimedEventId = event.id;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "payment") {
          await activateTrialFromSession(session);
        } else if (session.mode === "subscription" && typeof session.customer === "string") {
          await syncStripeData(supabase, stripe, session.customer);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncStripeData(supabase, stripe, subscription.customer as string);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await findUserIdByCustomer(customerId);
        
        let cancelledPlanName: string | undefined;
        if (userId) {
          const { data: userPlan } = await supabase
            .from("user_plans")
            .select("plan_id")
            .eq("user_id", userId)
            .maybeSingle();
            
          if (userPlan?.plan_id) {
            const { data: planRow } = await supabase
              .from("plans")
              .select("name")
              .eq("id", userPlan.plan_id)
              .maybeSingle();
            cancelledPlanName = planRow?.name ?? undefined;
          }
        }
        
        await syncStripeData(supabase, stripe, customerId);

        if (userId) {
          getUserEmailAndName(userId).then((u) => {
            if (u) {
              sendBillingEmail({
                to: u.email,
                type: "subscription_cancelled",
                userName: u.name,
                planName: cancelledPlanName,
              }).catch((e) => logStep("subscription_cancelled email error (non-fatal)", { error: String(e) }));
            }
          }).catch(() => {});
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await syncStripeData(supabase, stripe, invoice.customer as string);
          
          const userId = await findUserIdByCustomer(invoice.customer as string);
          if (userId) {
            getUserEmailAndName(userId).then((u) => {
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
          }
        }
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription && invoice.billing_reason === "subscription_cycle" && invoice.customer) {
          await syncStripeData(supabase, stripe, invoice.customer as string);
          
          const userId = await findUserIdByCustomer(invoice.customer as string);
          if (userId) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("plan_id, current_period_end")
              .eq("id", userId)
              .maybeSingle();
              
            let planName: string | undefined;
            if (profile?.plan_id) {
               const { data: planRow } = await supabase
                 .from("plans")
                 .select("name")
                 .eq("id", profile.plan_id)
                 .maybeSingle();
               planName = planRow?.name ?? undefined;
            }
            
            getUserEmailAndName(userId).then((u) => {
              if (u) {
                sendBillingEmail({
                  to: u.email,
                  type: "payment_receipt",
                  userName: u.name,
                  planName: planName,
                  amountCents: (invoice.amount_paid ?? 0) || undefined,
                  currency: invoice.currency ?? "usd",
                  invoiceUrl: (invoice as any).hosted_invoice_url ?? undefined,
                  nextBillingDate: profile?.current_period_end ?? undefined,
                }).catch((e) => logStep("payment_receipt email error (non-fatal)", { error: String(e) }));
              }
            }).catch(() => {});
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

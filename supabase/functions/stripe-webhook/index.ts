import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { syncStripeData } from "../_shared/billing-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const sendErrorAlert = async (message: string, context?: Record<string, unknown>) => {
  const webhookUrl = Deno.env.get("ERROR_WEBHOOK_URL");
  if (!webhookUrl) {
    console.warn("[STRIPE-WEBHOOK] ERROR_WEBHOOK_URL is not set. Cannot send Slack alert.");
    return;
  }
  try {
    const payload = {
      text: `🚨 *[STRIPE-WEBHOOK ERROR]*: ${message}\n\n*Details*:\n\`\`\`json\n${JSON.stringify(context || {}, null, 2)}\n\`\`\``
    };
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`[STRIPE-WEBHOOK] Failed to send Slack alert. Status: ${response.status}`);
    }
  } catch (e) {
    console.error("[STRIPE-WEBHOOK] Error sending Slack alert:", e);
  }
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
        await sendErrorAlert("Webhook signature verification failed", { error: String(err), signature });
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

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { 
          sessionId: session.id, 
          customerId: session.customer,
          subscriptionId: session.subscription 
        });

        // Mark checkout_sessions row as completed (fire-and-forget)
        supabase.from("checkout_sessions")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("stripe_checkout_session_id", session.id)
          .then(({ error: csErr }) => {
            if (csErr) console.warn("[WEBHOOK] checkout_sessions update failed", csErr.message);
          });

        const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
        if (stripeCustomerId) {
          const syncResult = await syncStripeData(supabase, stripe, stripeCustomerId);
          if (!syncResult.success) {
            throw new Error(`Sync failed: ${syncResult.error}`);
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription event received", {
          type: event.type,
          subscriptionId: subscription.id,
          customerId: subscription.customer,
        });

        const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : null;
        if (stripeCustomerId) {
          const syncResult = await syncStripeData(supabase, stripe, stripeCustomerId);
          if (!syncResult.success) {
            throw new Error(`Sync failed: ${syncResult.error}`);
          }
        }
        break;
      }

      case "invoice.payment_failed":
      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice event received", {
          type: event.type,
          invoiceId: invoice.id,
          customerId: invoice.customer,
        });

        const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : null;
        if (stripeCustomerId) {
          const syncResult = await syncStripeData(supabase, stripe, stripeCustomerId);
          if (!syncResult.success) {
            throw new Error(`Sync failed: ${syncResult.error}`);
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
    await sendErrorAlert("Unhandled exception in Stripe webhook handler", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

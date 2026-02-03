import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map Stripe product IDs to plan names and credits
const productToPlan: Record<string, { name: string; credits: number }> = {
  'prod_TeCiCCFNeORn9S': { name: 'starter', credits: 50 },
  'prod_TeCiyupNyVBR05': { name: 'growth', credits: 200 },
  'prod_TeCivsSU28U4G1': { name: 'enterprise', credits: 9999 },
  // Free trial product - to be added after creating in Stripe
};

// Check for completed free trial payment
const checkFreeTrialPayment = async (stripe: Stripe, customerId: string): Promise<{ hasTrial: boolean; trialEndDate: string | null }> => {
  try {
    // Check for successful payment intents (one-time payments)
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 10,
    });

    const successfulPayment = paymentIntents.data.find((pi: any) => 
      pi.status === 'succeeded' && pi.amount === 100 // $1.00 in cents
    );

    if (successfulPayment) {
      // Calculate trial end date (14 days from payment)
      const paymentDate = new Date(successfulPayment.created * 1000);
      const trialEndDate = new Date(paymentDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      
      if (trialEndDate > new Date()) {
        return { hasTrial: true, trialEndDate: trialEndDate.toISOString() };
      }
    }

    return { hasTrial: false, trialEndDate: null };
  } catch (error) {
    console.log("Error checking free trial payment:", error);
    return { hasTrial: false, trialEndDate: null };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  // Create a client that can validate the caller's JWT via the Authorization header.
  // This avoids relying on a server-side session (which edge functions don't have).
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  // Separate service client for DB writes (plans/user_plans/profiles).
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseServiceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      logStep("No/invalid authorization header - returning unauthenticated response");
      return new Response(
        JSON.stringify({
          subscribed: false,
          plan_name: "free",
          product_id: null,
          subscription_end: null,
          error: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Validate JWT and load user
    const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !userData?.user?.email) {
      logStep("Auth error - returning unauthenticated response", {
        error: userError?.message ?? "missing_user",
      });
      return new Response(
        JSON.stringify({
          subscribed: false,
          plan_name: "free",
          product_id: null,
          subscription_end: null,
          error: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found, returning unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_name: 'free',
        product_id: null,
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let planName = 'free';
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      
      // Safely convert subscription end date
      const cpe = (subscription as any).current_period_end;
      if (Number.isFinite(cpe)) {
        try {
          subscriptionEnd = new Date(cpe * 1000).toISOString();
        } catch (e) {
          logStep("Failed to parse current_period_end", { current_period_end: cpe, type: typeof cpe });
          subscriptionEnd = null;
        }
      } else {
        logStep("Missing/invalid current_period_end", { current_period_end: cpe, type: typeof cpe });
      }
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });

      // Safely get product ID and plan details
      if (subscription.items?.data?.[0]?.price?.product) {
        productId = subscription.items.data[0].price.product as string;
        const planInfo = productToPlan[productId];
        planName = planInfo?.name || 'unknown';
      }
      logStep("Determined subscription tier", { productId, planName });

      // Update user_plans table
      const { data: planData } = await supabaseServiceClient
        .from('plans')
        .select('id')
        .eq('name', planName)
        .single();

      if (planData) {
        // Check if user_plan exists (use maybeSingle to avoid errors)
        const { data: existingPlan } = await supabaseServiceClient
          .from('user_plans')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingPlan) {
          await supabaseServiceClient
            .from('user_plans')
            .update({
              plan_id: planData.id,
              status: 'active',
              stripe_subscription_id: stripeSubscriptionId,
              current_period_end: subscriptionEnd,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        } else {
          await supabaseServiceClient
            .from('user_plans')
            .insert({
              user_id: user.id,
              plan_id: planData.id,
              status: 'active',
              stripe_subscription_id: stripeSubscriptionId,
              current_period_end: subscriptionEnd,
            });
        }

        // Get plan credits from our mapping
        const planInfo = productToPlan[productId!];
        const planCredits = planInfo?.credits || 5;

        // Update profile with plan_id and reset credits for the billing period
        await supabaseServiceClient
          .from('profiles')
          .update({
            plan_id: planData.id,
            credits: planCredits,
          })
          .eq('id', user.id);

        logStep("Updated user plan in database", { planId: planData.id, credits: planCredits });
      }
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_name: planName,
      product_id: productId,
      subscription_end: subscriptionEnd,
      stripe_subscription_id: stripeSubscriptionId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    
    // SECURITY: Don't expose internal error details to client
    const safeErrorMessage = errorMessage.includes("STRIPE_SECRET_KEY") 
      ? "Payment service configuration error. Please contact support."
      : errorMessage;
    
    return new Response(JSON.stringify({ 
      error: safeErrorMessage,
      subscribed: false,
      plan_name: 'free'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

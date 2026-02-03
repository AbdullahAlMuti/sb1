import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION-V2] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  // Stateless auth client: validates the caller JWT using the Authorization header.
  const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  // Service client for DB writes.
  const supabaseServiceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    logStep("Function started", { version: "v2" });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({
          subscribed: false,
          plan_name: "free",
          plan: null,
          limits: null,
          usage: null,
          product_id: null,
          subscription_end: null,
          stripe_subscription_id: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

   // Avoid relying on a server-side session in edge runtime; validate the explicit JWT
   const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser(token);

    if (userError || !userData?.user?.email) {
      logStep("Auth error - returning unauthenticated response", {
        error: userError?.message ?? "missing_user",
      });
      return new Response(
        JSON.stringify({
          subscribed: false,
          plan_name: "free",
          plan: null,
          limits: null,
          usage: null,
          product_id: null,
          subscription_end: null,
          stripe_subscription_id: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const user = userData.user;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find an active/trialing subscription for this email.
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });

    const subscriptionCandidates: Array<{
      customerId: string;
      subscription: Stripe.Subscription | null;
    }> = customers.data.length
      ? await Promise.all(
          customers.data.map(async (customer: Stripe.Customer) => {
            try {
              const subs = await stripe.subscriptions.list({
                customer: customer.id,
                status: "all",
                limit: 10,
              });

              const activeSub =
                subs.data.find((s: Stripe.Subscription) => s.status === "active" || s.status === "trialing") ??
                null;
              return { customerId: customer.id, subscription: activeSub };
            } catch (e) {
              logStep("Stripe subscriptions lookup failed", { customerId: customer.id });
              return { customerId: customer.id, subscription: null };
            }
          }),
        )
      : [];

    const activeEntry = subscriptionCandidates.find((c) => Boolean(c.subscription)) ?? null;
    const hasActiveSub = Boolean(activeEntry?.subscription);

    let productId: string | null = null;
    let planName = "free";
    let subscriptionEnd: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let planDetails: {
      id: string;
      name: string;
      display_name: string;
      credits_per_month: number;
      max_listings: number;
      max_auto_orders: number;
    } | null = null;

    if (hasActiveSub && activeEntry?.subscription) {
      const subscription = activeEntry.subscription;
      stripeSubscriptionId = subscription.id;

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
            .select("id, name, display_name, credits_per_month, max_listings, max_auto_orders")
            .or(`stripe_price_id_monthly.eq.${stripePriceId},stripe_price_id_yearly.eq.${stripePriceId}`)
            .maybeSingle()
        : { data: null } as any;

       // Fallback to free if no matching plan found
       planName = planData?.name || "free";

      if (planData?.id) {
        planDetails = {
          id: planData.id,
          name: planData.name,
          display_name: planData.display_name ?? planData.name,
           credits_per_month: planData.credits_per_month ?? 0,
          max_listings: planData.max_listings ?? 10,
          max_auto_orders: planData.max_auto_orders ?? 0,
        };
      }

      // Persist plan info (best-effort)
      if (planData?.id) {
        const { data: existingPlan } = await supabaseServiceClient
          .from("user_plans")
          .select("id, orders_used")
          .eq("user_id", user.id)
          .maybeSingle();

        const payload = {
          user_id: user.id,
          plan_id: planData.id,
          status: "active",
          stripe_subscription_id: stripeSubscriptionId,
          current_period_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        };

        if (existingPlan) {
          await supabaseServiceClient.from("user_plans").update(payload).eq("user_id", user.id);
        } else {
          await supabaseServiceClient.from("user_plans").insert({
            ...payload,
            orders_used: 0,
          });
        }

        await supabaseServiceClient
          .from("profiles")
          .update({ plan_id: planData.id })
          .eq("id", user.id);
      } else {
        logStep("No matching plan found for price", { stripePriceId });
      }
    }

    // If we still don't have plan details (free or unmatched price), load them by name.
    if (!planDetails) {
      const { data: fallbackPlan } = await supabaseServiceClient
        .from('plans')
        .select('id, name, display_name, credits_per_month, max_listings, max_auto_orders')
        .eq('name', planName)
        .maybeSingle();

      if (fallbackPlan?.id) {
        planDetails = {
          id: fallbackPlan.id,
          name: fallbackPlan.name,
          display_name: fallbackPlan.display_name ?? fallbackPlan.name,
           credits_per_month: fallbackPlan.credits_per_month ?? 0,
          max_listings: fallbackPlan.max_listings ?? 10,
          max_auto_orders: fallbackPlan.max_auto_orders ?? 0,
        };
      }
    }

    // Also return basic usage/limits so dashboard can render plan limits + usage.
    const [{ data: profile }, { data: userPlan }, { count: listingsCount }] = await Promise.all([
      supabaseServiceClient
        .from('profiles')
        .select('credits, plan_id')
        .eq('id', user.id)
        .maybeSingle(),
      supabaseServiceClient
        .from('user_plans')
        .select('orders_used, credits_used, current_period_end, status')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabaseServiceClient
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active'),
    ]);

    // Credits source-of-truth:
    // - profiles.credits is the authoritative remaining balance (deducted on usage, reset on renewal)
    // - plans.credits_per_month is the monthly total
    // - credits_used is derived for display (and also tracked in user_plans for analytics)
    const creditsTotal = planDetails?.credits_per_month ?? 0;
    const creditsRemaining = Math.max(profile?.credits ?? 0, 0);
    const creditsUsed = Math.max(creditsTotal - creditsRemaining, 0);

    return new Response(
      JSON.stringify({
        subscribed: hasActiveSub,
        plan_name: planName,
        plan: planDetails,
        limits: planDetails
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
          status: userPlan?.status ?? (hasActiveSub ? 'active' : 'free'),
        },
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

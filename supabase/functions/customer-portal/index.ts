import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import {
  getAllowedReturnOrigin,
  requireAllowedOrigin,
  resolveCorsHeaders,
} from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

async function persistStripeCustomerId(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  customerId: string,
) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);

  if (error) {
    console.error("[CUSTOMER-PORTAL] Failed to persist Stripe customer id", {
      userId,
      message: error.message,
    });
  }
}

async function resolveCustomerId(
  stripe: Stripe,
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  userEmail: string,
  profileCustomerId: string | null,
): Promise<string> {
  if (profileCustomerId) return profileCustomerId;

  const customers = await stripe.customers.list({ email: userEmail, limit: 2 });
  if (customers.data.length !== 1) {
    throw new Error("No unique Stripe customer is linked to this account");
  }

  const customerId = customers.data[0].id;
  await persistStripeCustomerId(supabaseAdmin, userId, customerId);
  return customerId;
}

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const originError = requireAllowedOrigin(req);
  if (originError) return originError;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const ipLimit = await checkRateLimit(supabaseAdmin, {
      bucket: "customer-portal:ip",
      key: getClientIp(req),
      limit: 30,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    const user = userData.user;
    if (userError || !user?.id || !user.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userLimit = await checkRateLimit(supabaseAdmin, {
      bucket: "customer-portal:user",
      key: user.id,
      limit: 10,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customerId = await resolveCustomerId(
      stripe,
      supabaseAdmin,
      user.id,
      user.email,
      typeof profile?.stripe_customer_id === "string" ? profile.stripe_customer_id : null,
    );

    const returnOrigin = getAllowedReturnOrigin(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${returnOrigin}/dashboard`,
    });

    logStep("Customer portal session created", { sessionId: portalSession.id, userId: user.id });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

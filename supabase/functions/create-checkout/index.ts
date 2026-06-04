import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import {
  getAllowedReturnOrigin,
  requireAllowedOrigin,
  resolveCorsHeaders,
} from "../_shared/cors.ts";

type BillingInterval = "monthly" | "yearly";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRICE_ID_RE = /^price_[a-zA-Z0-9]+$/;

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

async function readLimitedJson(req: Request, maxBytes = 4096): Promise<Record<string, unknown>> {
  const body = await req.text();
  if (body.length > maxBytes) throw new Error("Request body is too large");
  if (!body) return {};
  const parsed = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

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
    console.error("[CREATE-CHECKOUT] Failed to persist Stripe customer id", {
      userId,
      message: error.message,
    });
  }
}

async function resolveStripeCustomerId(
  stripe: Stripe,
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  userEmail: string,
  existingCustomerId: string | null,
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;

  const customers = await stripe.customers.list({ email: userEmail, limit: 2 });
  if (customers.data.length > 1) {
    throw new Error("Multiple Stripe customers match this account. Contact support.");
  }

  const customer =
    customers.data[0] ??
    (await stripe.customers.create({
      email: userEmail,
      metadata: { user_id: userId },
    }));

  await persistStripeCustomerId(supabaseAdmin, userId, customer.id);
  return customer.id;
}

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  const originError = requireAllowedOrigin(req);
  if (originError) return originError;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    logStep("Function started");

    const ipLimit = await checkRateLimit(supabaseAdmin, {
      bucket: "create-checkout:ip",
      key: getClientIp(req),
      limit: 20,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    const requestBody = await readLimitedJson(req);
    const planId = typeof requestBody.planId === "string" ? requestBody.planId.trim() : "";
    const billingInterval: BillingInterval = requestBody.billingInterval === "yearly" ? "yearly" : "monthly";
    const expectedPriceId = typeof requestBody.priceId === "string" ? requestBody.priceId.trim() : null;
    const couponCode =
      typeof requestBody.couponCode === "string"
        ? requestBody.couponCode.slice(0, 50).toUpperCase().trim()
        : null;

    if (!UUID_RE.test(planId)) {
      throw new Error("Valid planId is required");
    }

    if (expectedPriceId && !PRICE_ID_RE.test(expectedPriceId)) {
      throw new Error("Invalid priceId format");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      logStep("Unauthorized", { message: userError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email ?? null;

    const userLimit = await checkRateLimit(supabaseAdmin, {
      bucket: "create-checkout:user",
      key: userId,
      limit: 10,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "Email not available for this user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("id, name, display_name, stripe_price_id_monthly, stripe_price_id_yearly, is_active")
      .eq("id", planId)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan) {
      throw new Error("Selected plan is unavailable");
    }

    const stripePriceId =
      billingInterval === "yearly" ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;

    if (!stripePriceId || !PRICE_ID_RE.test(stripePriceId)) {
      throw new Error("Selected plan is not configured for checkout");
    }

    if (expectedPriceId && expectedPriceId !== stripePriceId) {
      throw new Error("Submitted priceId does not match the selected plan");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customerId = await resolveStripeCustomerId(
      stripe,
      supabaseAdmin,
      userId,
      userEmail,
      typeof profile?.stripe_customer_id === "string" ? profile.stripe_customer_id : null,
    );

    let stripeCouponId: string | null = null;
    let couponData: Record<string, any> | null = null;

    if (couponCode) {
      const { data: coupon, error: couponError } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", couponCode)
        .eq("is_active", true)
        .single();

      if (couponError || !coupon) {
        throw new Error("Invalid coupon code");
      }

      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

      if (now < validFrom) throw new Error("This coupon is not yet active");
      if (validUntil && now > validUntil) throw new Error("This coupon has expired");
      if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
        throw new Error("This coupon has reached its usage limit");
      }

      if (coupon.is_one_time_per_user) {
        const { data: existingUsage } = await supabaseAdmin
          .from("coupon_usages")
          .select("id")
          .eq("coupon_id", coupon.id)
          .eq("user_id", userId)
          .limit(1);

        if (existingUsage && existingUsage.length > 0) {
          throw new Error("You have already used this coupon");
        }
      }

      if (coupon.applicable_plans?.length && !coupon.applicable_plans.includes(planId)) {
        throw new Error("This coupon is not valid for the selected plan");
      }

      const stripeCouponParams: Stripe.CouponCreateParams = {
        duration: "once",
        metadata: {
          internal_coupon_id: coupon.id,
          internal_coupon_code: coupon.code,
        },
      };

      if (coupon.discount_type === "percentage") {
        stripeCouponParams.percent_off = coupon.discount_value;
      } else {
        stripeCouponParams.amount_off = Math.round(coupon.discount_value * 100);
        stripeCouponParams.currency = "usd";
      }

      const stripeCoupon = await stripe.coupons.create(stripeCouponParams);
      stripeCouponId = stripeCoupon.id;
      couponData = coupon;
      logStep("Coupon validated", { couponId: coupon.id, discountType: coupon.discount_type });
    }

    const returnOrigin = getAllowedReturnOrigin(req);
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${returnOrigin}/checkout/success?plan=${encodeURIComponent(planId)}`,
      cancel_url: `${returnOrigin}/#pricing`,
      metadata: {
        user_id: userId,
        plan_id: planId,
        billing_interval: billingInterval,
        coupon_id: couponData?.id || null,
        coupon_code: couponData?.code || null,
      },
    };

    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", {
      sessionId: session.id,
      userId,
      planId,
      billingInterval,
      hasCoupon: Boolean(stripeCouponId),
    });

    if (couponData) {
      await supabaseAdmin
        .from("coupons")
        .update({ used_count: couponData.used_count + 1 })
        .eq("id", couponData.id);

      await supabaseAdmin.from("coupon_usages").insert({
        coupon_id: couponData.id,
        user_id: userId,
        stripe_session_id: session.id,
        discount_applied: couponData.discount_type === "percentage" ? 0 : couponData.discount_value,
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: errorMessage.includes("Origin") ? 403 : 500,
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import {
  getAllowedReturnOrigin,
  requireAllowedOrigin,
  resolveCorsHeaders,
} from "../_shared/cors.ts";
import { isTrialEligible } from "../_shared/billing.ts";

type BillingInterval = "monthly" | "yearly";
type SupabaseLike = { from: (table: string) => any };

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
  supabaseAdmin: SupabaseLike,
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
  supabaseAdmin: SupabaseLike,
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
    const planIdParam = typeof requestBody.planId === "string" ? requestBody.planId.trim() : "";
    const billingInterval: BillingInterval = requestBody.billingInterval === "yearly" ? "yearly" : "monthly";
    const expectedPriceId = typeof requestBody.priceId === "string" ? requestBody.priceId.trim() : null;
    const couponCode =
      typeof requestBody.couponCode === "string"
        ? requestBody.couponCode.slice(0, 50).toUpperCase().trim()
        : null;

    if (planIdParam && !UUID_RE.test(planIdParam)) {
      throw new Error("Valid planId format is required");
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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, trial_used_at, pending_plan_id")
      .eq("id", userId)
      .maybeSingle();

    let planId = profile?.pending_plan_id;
    if (planIdParam && planIdParam !== planId) {
      if (!UUID_RE.test(planIdParam)) {
        throw new Error("Valid planId is required");
      }
      await supabaseAdmin
        .from("profiles")
        .update({ pending_plan_id: planIdParam })
        .eq("id", userId);
      planId = planIdParam;
    }

    if (!planId) {
      throw new Error("No plan selected. Please select a plan first.");
    }

    // Block duplicate checkout when the user already has an active PAID
    // subscription (a live Stripe subscription). Trials (status "trialing", no
    // stripe_subscription_id) are intentionally allowed so a trialing user can
    // convert to a paid plan. Plan changes for paid subscribers go through the
    // customer portal, not a second Checkout session.
    const { data: existingUserPlan } = await supabaseAdmin
      .from("user_plans")
      .select("status, stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingUserPlan?.status === "active" && existingUserPlan?.stripe_subscription_id) {
      logStep("Active subscription exists — blocking duplicate checkout", { userId });
      return new Response(
        JSON.stringify({
          error: "You already have an active subscription.",
          redirect: "/dashboard",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 },
      );
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select(
        "id, name, display_name, stripe_price_id_monthly, stripe_price_id_yearly, stripe_price_id_one_time, is_trial, trial_duration_days, is_active",
      )
      .eq("id", planId)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan) {
      throw new Error("Selected plan is unavailable");
    }

    const isTrialPlan = Boolean(plan.is_trial);
    const stripePriceId = isTrialPlan
      ? plan.stripe_price_id_one_time
      : billingInterval === "yearly"
        ? plan.stripe_price_id_yearly
        : plan.stripe_price_id_monthly;

    if (!stripePriceId || !PRICE_ID_RE.test(stripePriceId)) {
      throw new Error("Selected plan is not configured for checkout");
    }

    if (expectedPriceId && expectedPriceId !== stripePriceId) {
      throw new Error("Submitted priceId does not match the selected plan");
    }

    // profile already loaded above

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customerId = await resolveStripeCustomerId(
      stripe,
      supabaseAdmin,
      userId,
      userEmail,
      typeof profile?.stripe_customer_id === "string" ? profile.stripe_customer_id : null,
    );

    if (isTrialPlan) {
      // One trial per account: profile marker, plan history, and the Stripe
      // customer metadata (covers re-registered emails reusing a customer).
      const { data: trialHistory } = await supabaseAdmin
        .from("user_plans")
        .select("id, plans!inner(is_trial)")
        .eq("user_id", userId)
        .eq("plans.is_trial", true)
        .limit(1);

      const customer = await stripe.customers.retrieve(customerId);
      const customerTrialUsed =
        !customer.deleted && (customer as Stripe.Customer).metadata?.trial_used === "true";

      const eligibility = isTrialEligible({
        trialUsedAt: typeof profile?.trial_used_at === "string" ? profile.trial_used_at : null,
        hadTrialPlanBefore: Boolean(trialHistory?.length),
        customerTrialUsed,
      });

      if (!eligibility.eligible) {
        logStep("Trial rejected", { userId, reason: eligibility.reason });
        return new Response(JSON.stringify({ error: eligibility.reason }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    }

    let stripeCouponId: string | null = null;
    let couponData: Record<string, any> | null = null;

    // Coupons apply to recurring plans only — the $1 trial is already nominal.
    if (couponCode && !isTrialPlan) {
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
      // The $1 trial is a one-time payment; activation happens in the webhook
      // (checkout.session.completed with mode === "payment").
      mode: isTrialPlan ? "payment" : "subscription",
      // Use the legacy return paths so this function is safe to (re)deploy in ANY
      // order relative to the web app — no Supabase/Vercel deploy-ordering hazard.
      // The current production web build serves /checkout/success directly; the
      // new build aliases /checkout/success → /payment-success and /#pricing still
      // works everywhere. (Switch these to /payment-success and /payment-cancelled
      // only after the new web build is the live production deploy.)
      success_url: `${returnOrigin}/checkout/success?plan=${encodeURIComponent(planId)}${isTrialPlan ? "&mode=payment" : ""}`,
      cancel_url: `${returnOrigin}/payment-cancelled`,
      metadata: {
        user_id: userId,
        plan_id: planId,
        billing_interval: isTrialPlan ? "one_time" : billingInterval,
        coupon_id: couponData?.id || null,
        coupon_code: couponData?.code || null,
      },
    };

    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
    } else if (!isTrialPlan) {
      sessionParams.allow_promotion_codes = true;
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

    // Track checkout session for audit (fire-and-forget — never block the response)
    supabaseAdmin.from("checkout_sessions").insert({
      user_id: userId,
      email: userEmail,
      selected_plan_id: planId,
      stripe_checkout_session_id: session.id,
      status: "pending",
      metadata: {
        billing_interval: isTrialPlan ? "one_time" : billingInterval,
        is_trial: isTrialPlan,
      },
    }).then(({ error: csErr }) => {
      if (csErr) console.warn("[CREATE-CHECKOUT] checkout_sessions insert failed", csErr.message);
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    const isOriginError = errorMessage.includes("Origin");
    return new Response(JSON.stringify({ error: isOriginError ? "Origin not allowed" : "Unable to create checkout session. Please try again." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: isOriginError ? 403 : 500,
    });
  }
});

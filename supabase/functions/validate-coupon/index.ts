import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { requireAllowedOrigin, resolveCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VALIDATE-COUPON] ${step}${detailsStr}`);
};

async function readLimitedJson(req: Request, maxBytes = 4096): Promise<Record<string, unknown>> {
  const body = await req.text();
  if (body.length > maxBytes) throw new Error("Request body is too large");
  const parsed = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  const originError = requireAllowedOrigin(req);
  if (originError) return originError;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ valid: false, error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    logStep("Function started");

    const ipLimit = await checkRateLimit(supabaseClient, {
      bucket: "validate-coupon:ip",
      key: getClientIp(req),
      limit: 30,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ valid: false, error: "Authentication required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.id) {
      logStep("Auth error", { message: userError?.message });
      return new Response(JSON.stringify({ valid: false, error: "Invalid authentication" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = userData.user.id;
    const userLimit = await checkRateLimit(supabaseClient, {
      bucket: "validate-coupon:user",
      key: userId,
      limit: 20,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    const body = await readLimitedJson(req);
    const code = typeof body.code === "string" ? body.code.slice(0, 50).toUpperCase().trim() : "";
    const planId = typeof body.planId === "string" ? body.planId.slice(0, 100).trim() : "";
    const orderAmount = typeof body.orderAmount === "number" ? body.orderAmount : Number(body.orderAmount ?? 0);

    if (!code) {
      return new Response(JSON.stringify({ valid: false, error: "Coupon code is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Request parsed", { userId, hasPlanId: Boolean(planId), hasOrderAmount: Number.isFinite(orderAmount) });

    const { data: coupon, error: couponError } = await supabaseClient
      .from("coupons")
      .select("*")
      .eq("code", code)
      .single();

    if (couponError || !coupon) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid coupon code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!coupon.is_active) {
      return new Response(JSON.stringify({ valid: false, error: "This coupon is no longer active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

    if (now < validFrom) {
      return new Response(JSON.stringify({ valid: false, error: "This coupon is not yet active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (validUntil && now > validUntil) {
      return new Response(JSON.stringify({ valid: false, error: "This coupon has expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return new Response(JSON.stringify({ valid: false, error: "This coupon has reached its usage limit" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (coupon.is_one_time_per_user) {
      const { data: existingUsage } = await supabaseClient
        .from("coupon_usages")
        .select("id")
        .eq("coupon_id", coupon.id)
        .eq("user_id", userId)
        .limit(1);

      if (existingUsage && existingUsage.length > 0) {
        return new Response(JSON.stringify({ valid: false, error: "You have already used this coupon" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    if (coupon.min_order_amount && Number.isFinite(orderAmount) && orderAmount < coupon.min_order_amount) {
      return new Response(
        JSON.stringify({ valid: false, error: `Minimum order amount of $${coupon.min_order_amount} required` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    if (coupon.applicable_plans?.length && planId && !coupon.applicable_plans.includes(planId)) {
      return new Response(JSON.stringify({ valid: false, error: "This coupon is not valid for the selected plan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let discountAmount = 0;
    if (Number.isFinite(orderAmount) && orderAmount > 0) {
      discountAmount =
        coupon.discount_type === "percentage"
          ? (orderAmount * coupon.discount_value) / 100
          : coupon.discount_value;

      if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
        discountAmount = coupon.max_discount_amount;
      }
      if (discountAmount > orderAmount) discountAmount = orderAmount;
    }

    logStep("Coupon validated successfully", { couponId: coupon.id, discountType: coupon.discount_type });

    return new Response(
      JSON.stringify({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discount_type,
          discountValue: coupon.discount_value,
          discountAmount,
          maxDiscountAmount: coupon.max_discount_amount,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ valid: false, error: "An error occurred validating the coupon" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

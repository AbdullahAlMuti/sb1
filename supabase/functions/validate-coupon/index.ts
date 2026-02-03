import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-COUPON] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { code, planId, orderAmount } = await req.json();
    
    if (!code) {
      return new Response(
        JSON.stringify({ valid: false, error: "Coupon code is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Request parsed", { code, planId, orderAmount });

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ valid: false, error: "Authentication required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("Auth error", { error: userError?.message });
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid authentication" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    // Fetch coupon by code
    const { data: coupon, error: couponError } = await supabaseClient
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .single();

    if (couponError || !coupon) {
      logStep("Coupon not found", { code, error: couponError?.message });
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid coupon code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Coupon found", { couponId: coupon.id, discount: coupon.discount_value });

    // Validate coupon status
    if (!coupon.is_active) {
      return new Response(
        JSON.stringify({ valid: false, error: "This coupon is no longer active" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Validate date range
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

    if (now < validFrom) {
      return new Response(
        JSON.stringify({ valid: false, error: "This coupon is not yet active" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (validUntil && now > validUntil) {
      return new Response(
        JSON.stringify({ valid: false, error: "This coupon has expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Validate usage limit
    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return new Response(
        JSON.stringify({ valid: false, error: "This coupon has reached its usage limit" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Validate one-time per user
    if (coupon.is_one_time_per_user) {
      const { data: existingUsage } = await supabaseClient
        .from("coupon_usages")
        .select("id")
        .eq("coupon_id", coupon.id)
        .eq("user_id", userId)
        .limit(1);

      if (existingUsage && existingUsage.length > 0) {
        return new Response(
          JSON.stringify({ valid: false, error: "You have already used this coupon" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Validate minimum order amount
    if (coupon.min_order_amount && orderAmount && orderAmount < coupon.min_order_amount) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Minimum order amount of $${coupon.min_order_amount} required` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Validate applicable plans
    if (coupon.applicable_plans && coupon.applicable_plans.length > 0 && planId) {
      if (!coupon.applicable_plans.includes(planId)) {
        return new Response(
          JSON.stringify({ valid: false, error: "This coupon is not valid for the selected plan" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (orderAmount) {
      if (coupon.discount_type === 'percentage') {
        discountAmount = (orderAmount * coupon.discount_value) / 100;
      } else {
        discountAmount = coupon.discount_value;
      }

      // Apply max discount cap
      if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
        discountAmount = coupon.max_discount_amount;
      }

      // Ensure discount doesn't exceed order amount
      if (discountAmount > orderAmount) {
        discountAmount = orderAmount;
      }
    }

    logStep("Coupon validated successfully", { 
      discountType: coupon.discount_type, 
      discountValue: coupon.discount_value,
      discountAmount 
    });

    return new Response(
      JSON.stringify({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discount_type,
          discountValue: coupon.discount_value,
          discountAmount: discountAmount,
          maxDiscountAmount: coupon.max_discount_amount
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ valid: false, error: "An error occurred validating the coupon" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

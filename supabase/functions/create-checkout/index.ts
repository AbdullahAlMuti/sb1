import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Service-role client for privileged DB operations (coupon write, etc.)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    logStep("Function started");

    const requestBody = await req.json();
    
    // SECURITY: Input validation
    const priceId = typeof requestBody.priceId === 'string' ? requestBody.priceId.slice(0, 100) : null;
    const planId = typeof requestBody.planId === 'string' ? requestBody.planId.slice(0, 100) : null;
    const couponCode = typeof requestBody.couponCode === 'string' ? requestBody.couponCode.slice(0, 50).toUpperCase().trim() : null;
    
    if (!priceId || !/^price_[a-zA-Z0-9]+$/.test(priceId)) {
      throw new Error("Valid Price ID is required");
    }
    logStep("Request parsed", { priceId, planId, couponCode: couponCode ? "provided" : "none" });

    // Auth: Use bearer token claims (edge functions don't have a browser session)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("Unauthorized - missing bearer token", { hasAuthHeader: Boolean(authHeader) });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    // Basic JWT sanity check to avoid confusing "Auth session missing" errors
    const tokenParts = token.split('.');
    if (!token || tokenParts.length !== 3) {
      logStep("Unauthorized - invalid JWT format", { tokenPresent: Boolean(token), parts: tokenParts.length });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Stateless auth: validate JWT and load the user
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Prefer getUser(token) (works reliably in Edge, no session required)
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

    if (!userEmail) {
      logStep("Missing email on user", { userId });
      return new Response(JSON.stringify({ error: "Email not available for this user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("User authenticated", { userId, email: userEmail });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    }

    // Handle coupon if provided
    let stripeCouponId = null;
    let couponData = null;

    if (couponCode) {
      // Validate coupon from our database
      const { data: coupon, error: couponError } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (couponError || !coupon) {
        logStep("Coupon not found or inactive", { couponCode });
        throw new Error("Invalid coupon code");
      }

      // Validate coupon dates
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

      if (now < validFrom) {
        throw new Error("This coupon is not yet active");
      }
      if (validUntil && now > validUntil) {
        throw new Error("This coupon has expired");
      }

      // Validate usage limits
      if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
        throw new Error("This coupon has reached its usage limit");
      }

      // Check one-time per user
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

      // Check applicable plans
      if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
        if (!coupon.applicable_plans.includes(planId)) {
          throw new Error("This coupon is not valid for the selected plan");
        }
      }

      logStep("Coupon validated", { couponId: coupon.id, discountType: coupon.discount_type });
      couponData = coupon;

      // Create a Stripe coupon for this checkout
      try {
        const stripeCouponParams: Stripe.CouponCreateParams = {
          duration: 'once',
          metadata: {
            internal_coupon_id: coupon.id,
            internal_coupon_code: coupon.code
          }
        };

        if (coupon.discount_type === 'percentage') {
          stripeCouponParams.percent_off = coupon.discount_value;
        } else {
          stripeCouponParams.amount_off = Math.round(coupon.discount_value * 100); // Convert to cents
          stripeCouponParams.currency = 'usd';
        }

        const stripeCoupon = await stripe.coupons.create(stripeCouponParams);
        stripeCouponId = stripeCoupon.id;
        logStep("Stripe coupon created", { stripeCouponId });
      } catch (stripeError) {
        logStep("Error creating Stripe coupon", { error: stripeError });
        throw new Error("Failed to apply coupon");
      }
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/checkout/success?plan=${planId}`,
      cancel_url: `${req.headers.get("origin")}/#pricing`,
           metadata: {
        user_id: userId,
        plan_id: planId,
        coupon_id: couponData?.id || null,
        coupon_code: couponData?.code || null,
      },
    };

    // Apply coupon discount if we have one
    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id, url: session.url, hasCoupon: !!stripeCouponId });

    // If we have a coupon, record the usage attempt (will be confirmed by webhook later)
    if (couponData) {
      // Update used_count optimistically
      await supabaseAdmin
        .from("coupons")
        .update({ used_count: couponData.used_count + 1 })
        .eq("id", couponData.id);

      // Record usage
      await supabaseAdmin
        .from("coupon_usages")
        .insert({
          coupon_id: couponData.id,
          user_id: userId,
          stripe_session_id: session.id,
          discount_applied: couponData.discount_type === 'percentage' 
            ? 0 // Will be calculated after payment
            : couponData.discount_value
        });

      logStep("Coupon usage recorded", { couponId: couponData.id });
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
      status: 500,
    });
  }
});

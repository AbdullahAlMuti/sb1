import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutoOrderPayload {
  order_id?: string;
  ebay_order_id?: string;
  ebay_sku?: string;
  sku?: string;
  buyer_name?: string;
  buyer_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  item_price?: number | string;
  total_cost?: number | string;
  profit?: number | string;
  details?: Record<string, unknown>;
  status?: string;
  listing_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[create-auto-order] Function started");

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[create-auto-order] No authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create Supabase client with user token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Verify user session
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !userData?.user) {
      console.error("[create-auto-order] Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    console.log(`[create-auto-order] Authenticated user: ${userId} (${userEmail})`);

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's plan and order limits from database
    const { data: userPlan } = await supabase
      .from("user_plans")
      .select("plan_id, orders_used, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_id")
      .eq("id", userId)
      .single();

    const planId = userPlan?.plan_id || profile?.plan_id;

    // Get plan limits dynamically
    let maxAutoOrders = 0;
    let planName = "free";
    
    if (planId) {
      const { data: planData } = await supabase
        .from("plans")
        .select("name, max_auto_orders")
        .eq("id", planId)
        .single();
      
      if (planData) {
        maxAutoOrders = planData.max_auto_orders ?? 0;
        planName = planData.name;
      }
    }

    // Check order limit
    const ordersUsed = userPlan?.orders_used ?? 0;

    if (maxAutoOrders === 0) {
      console.log("[create-auto-order] Auto orders not available on plan:", planName);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Auto orders are not available on your current plan",
          limitType: "orders",
          current: ordersUsed,
          limit: maxAutoOrders,
          upgradeRequired: true,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ordersUsed >= maxAutoOrders) {
      console.log("[create-auto-order] Order limit reached:", ordersUsed, "/", maxAutoOrders);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Order limit reached for this billing period",
          limitType: "orders",
          current: ordersUsed,
          limit: maxAutoOrders,
          upgradeRequired: true,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const payload: AutoOrderPayload = await req.json();
    console.log("[create-auto-order] Received payload:", JSON.stringify(payload));

    // Validate required fields
    const ebayOrderId = payload.ebay_order_id || payload.order_id;
    if (!ebayOrderId) {
      console.error("[create-auto-order] Missing order ID");
      return new Response(
        JSON.stringify({ success: false, error: "Missing ebay_order_id or order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse numeric values safely
    const parseNumber = (val: unknown): number | null => {
      if (val === null || val === undefined) return null;
      const str = String(val).replace(/[^0-9.-]/g, "");
      const num = parseFloat(str);
      return isNaN(num) ? null : num;
    };

    // Build insert payload with user_id from session
    const insertPayload = {
      user_id: userId,
      ebay_order_id: ebayOrderId,
      ebay_sku: payload.ebay_sku || payload.sku || null,
      buyer_name: payload.buyer_name || null,
      buyer_address: payload.buyer_address || payload.shipping_address || {},
      item_price: parseNumber(payload.item_price),
      total_cost: parseNumber(payload.total_cost),
      profit: parseNumber(payload.profit),
      details: payload.details || {},
      status: payload.status || "pending",
      listing_id: payload.listing_id || null,
    };

    console.log("[create-auto-order] Insert payload:", JSON.stringify(insertPayload));

    // Check for existing order with same ebay_order_id for this user
    const { data: existingOrder } = await supabase
      .from("auto_orders")
      .select("id, status")
      .eq("user_id", userId)
      .eq("ebay_order_id", ebayOrderId)
      .maybeSingle();

    if (existingOrder) {
      console.log("[create-auto-order] Order already exists:", existingOrder.id);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Order already exists",
          id: existingOrder.id,
          status: existingOrder.status,
          isExisting: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new order
    const { data: newOrder, error: insertError } = await supabase
      .from("auto_orders")
      .insert(insertPayload)
      .select("id, status, created_at")
      .single();

    if (insertError) {
      console.error("[create-auto-order] Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment orders_used in user_plans
    const newOrdersUsed = ordersUsed + 1;
    if (userPlan) {
      await supabase
        .from("user_plans")
        .update({ orders_used: newOrdersUsed, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } else {
      // Create user_plans entry if it doesn't exist
      await supabase.from("user_plans").insert({
        user_id: userId,
        plan_id: planId,
        orders_used: 1,
        status: "active",
      });
    }

    // Log order transaction for audit trail
    await supabase.from("order_transactions").insert({
      user_id: userId,
      order_id: newOrder.id,
      transaction_type: "order_placed",
      orders_used_after: newOrdersUsed,
      description: `Auto order placed: ${ebayOrderId}`,
      metadata: {
        ebay_order_id: ebayOrderId,
        limit: maxAutoOrders,
      },
    });

    // Log usage
    await supabase.from("usage_logs").insert({
      user_id: userId,
      action: "create_auto_order",
      credits_used: 0,
      metadata: {
        order_id: newOrder.id,
        ebay_order_id: ebayOrderId,
      },
    });

    console.log("[create-auto-order] Order created:", newOrder.id, "Orders used:", newOrdersUsed, "/", maxAutoOrders);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Auto order created",
        id: newOrder.id,
        status: newOrder.status,
        created_at: newOrder.created_at,
        isExisting: false,
        ordersRemaining: maxAutoOrders - newOrdersUsed,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("[create-auto-order] Unexpected error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

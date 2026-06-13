import { resolveExtensionOrLegacyAuth, createServiceClient } from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { requireAllowedOrigin, resolveCorsHeaders } from "../_shared/cors.ts";

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

async function readLimitedJson(req: Request, maxBytes = 8192): Promise<AutoOrderPayload> {
  const body = await req.text();
  if (body.length > maxBytes) throw new Error("Request body is too large");
  const parsed = JSON.parse(body) as AutoOrderPayload;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Request body must be a JSON object");
  }
  return parsed;
}

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const str = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : null;
}

Deno.serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req, { extension: true });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const originError = requireAllowedOrigin(req, { extension: true });
  if (originError) return originError;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("[create-auto-order] Function started");

    const supabase = createServiceClient();
    const ipLimit = await checkRateLimit(supabase, {
      bucket: "create-auto-order:ip",
      key: getClientIp(req),
      limit: 30,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    const authContext = await resolveExtensionOrLegacyAuth(supabase, req);
    const userId = authContext.userId;
    console.log(`[create-auto-order] Authenticated user: ${userId} (${authContext.authMode})`);

    const userLimit = await checkRateLimit(supabase, {
      bucket: "create-auto-order:user",
      key: userId,
      limit: 60,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    const payload = await readLimitedJson(req);
    const ebayOrderId = payload.ebay_order_id || payload.order_id;
    if (!ebayOrderId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing ebay_order_id or order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rpcPayload = {
      ebay_order_id: String(ebayOrderId).slice(0, 100),
      order_id: String(ebayOrderId).slice(0, 100),
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

    const { data: rpcResult, error: rpcError } = await supabase.rpc("create_auto_order_with_usage", {
      p_user_id: userId,
      p_order: rpcPayload,
    });

    if (rpcError || !rpcResult) {
      const message = rpcError?.message || "Failed to create auto order";
      const status = /(limit|plan|subscription|blocked)/i.test(message) ? 402 : 500;
      console.error("[create-auto-order] Atomic create error:", { message });
      return new Response(
        JSON.stringify({ success: false, error: message, upgradeRequired: status === 402 }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const order = rpcResult.order;
    const action = rpcResult.action === "existing" ? "existing" : "created";
    const status = action === "existing" ? 200 : 201;

    console.log("[create-auto-order] Order handled", { action, orderId: order?.id });

    return new Response(
      JSON.stringify({
        success: true,
        message: action === "existing" ? "Order already exists" : "Auto order created",
        id: order?.id,
        status: order?.status,
        created_at: order?.created_at,
        isExisting: action === "existing",
        ordersRemaining: rpcResult.orders_remaining,
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("[create-auto-order] Unexpected error:", errorMessage);
    const status = /(authorization|auth token|session)/i.test(errorMessage) ? 401 : 500;
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

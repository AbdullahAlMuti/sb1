import { resolveExtensionCors } from "../_shared/cors.ts";
import { resolveExtensionOrLegacyAuth, requireFeatureEntitlement, createServiceClient } from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp as getRateLimitIp, rateLimitResponse } from "../_shared/rate-limit.ts";

interface EbayOrderPayload {
  ebay_order_id: string;
  sales_record_number?: string;
  buyer_name?: string;
  buyer_username?: string;
  buyer_email?: string;
  order_date?: string;
  order_status?: string;
  total_amount?: number;
  subtotal?: number;
  currency?: string;
  shipping_address?: Record<string, unknown>;
  line_items?: Record<string, unknown>[];
  platform?: string;
  // New fields
  item_number?: string;
  item_title?: string;
  custom_label?: string;
  quantity?: number;
  sold_via?: string;
  discount_info?: string;
  ship_by_date?: string;
  date_sold?: string;
  date_paid?: string;
  buyer_zip?: string;
  item_image_url?: string;
  // Financial tracking fields
  shipping_cost?: number;
  ad_fee?: number;
  transaction_id?: string;
  add_fee?: number;

  // eBay dashboard value (from CSV/extension) - optional
  net_profit?: number;
  delivery_date?: string;
}

interface SyncRequest {
  orders: EbayOrderPayload[];
}

// -------------------------------------------------------------------------------------------------
// SYNC LOGGING HELPER
// -------------------------------------------------------------------------------------------------
async function logSyncEvent(
  supabase: any,
  userId: string | null,
  status: 'success' | 'warning' | 'error' | 'info',
  error_category: string | null,
  message: string,
  rawPayload: any = null,
  metadata: any = null
) {
  if (!userId) return; // Cannot log without a user

  try {
    // Sanitize payload preview (remove PII, limit length)
    let payloadPreview: any = null;
    if (rawPayload) {
      // Clone if it's an object to avoid mutating original
      let p = JSON.parse(JSON.stringify(rawPayload));
      
      // If array, limit to 2 items
      if (Array.isArray(p)) {
        p = p.slice(0, 2);
        p.forEach((item: any) => maskPII(item));
      } else if (typeof p === 'object') {
        maskPII(p);
      } else {
        // String or other
        p = String(p).substring(0, 500);
      }
      payloadPreview = p;
    }

    await supabase.from('ebay_sync_logs').insert({
      user_id: userId,
      status: status,
      error_category: error_category,
      payload_preview: payloadPreview,
      metadata: metadata ? { message, ...metadata } : { message }
    });
  } catch (err) {
    console.error("[sync-ebay-orders] Failed to write sync log:", err);
  }
}

function maskPII(obj: any) {
  if (!obj || typeof obj !== 'object') return;
  const sensitiveKeys = ['buyer_name', 'buyer_username', 'buyer_email', 'shipping_address', 'buyer_zip', 'phone', 'csrf', 'token', 'cookie', 'authorization', 'secret', 'password', 'jwt'];
  for (const key of Object.keys(obj)) {
    if (sensitiveKeys.includes(key.toLowerCase()) || key.toLowerCase().includes('token')) {
      obj[key] = '***MASKED***';
    } else if (typeof obj[key] === 'object') {
      maskPII(obj[key]);
    }
  }
}
// -------------------------------------------------------------------------------------------------

Deno.serve(async (req) => {
  const corsHeaders = resolveExtensionCors(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[sync-ebay-orders] Request received");

    const supabase = createServiceClient();
    const ipLimit = await checkRateLimit(supabase, {
      bucket: "sync-ebay-orders:ip",
      key: getRateLimitIp(req),
      limit: 30,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);
    
    // Authenticate using the shared dual-auth resolver
    const authContext = await resolveExtensionOrLegacyAuth(supabase, req);
    const userId = authContext.userId;

    console.log(`[sync-ebay-orders] Authenticated user: ${userId} (Mode: ${authContext.authMode})`);
    await logSyncEvent(supabase, userId, 'info', null, 'sync_received', null, { authMode: authContext.authMode });

    const userLimit = await checkRateLimit(supabase, {
      bucket: "sync-ebay-orders:user",
      key: userId,
      limit: 60,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    // Verify feature entitlement
    const hasAccess = await requireFeatureEntitlement(supabase, userId, authContext.workspaceId, "ebay_order_sync");
    if (!hasAccess) {
      console.warn(`[sync-ebay-orders] User ${userId} missing ebay_order_sync entitlement`);
      return new Response(
        JSON.stringify({ success: false, error: "Feature not entitled or subscription inactive" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let body: SyncRequest;
    try {
      body = await req.json();
    } catch (e: any) {
      console.error("[sync-ebay-orders] Payload parse failed:", e.message);
      await logSyncEvent(supabase, userId, 'error', 'backend_sync', 'payload_parse_failed', null, { error: 'invalid_json_body' });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { orders } = body;

    if (!orders || !Array.isArray(orders)) {
      console.error("[sync-ebay-orders] Invalid payload: orders array required");
      await logSyncEvent(supabase, userId, 'error', 'backend_sync', 'validation_failed', null, { reason: 'orders array required' });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid payload: orders array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (orders.length === 0) {
      console.log("[sync-ebay-orders] No orders to sync");
      await logSyncEvent(supabase, userId, 'info', null, 'sync_completed', null, { message: 'No orders provided' });
      return new Response(
        JSON.stringify({ success: true, synced: 0, skipped: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-ebay-orders] Processing ${orders.length} orders`);
    await logSyncEvent(supabase, userId, 'info', null, 'orders_upsert_started', orders.length, { count: orders.length });

    let synced = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Helper to parse date strings accurately
    const parseDate = (dateStr?: string): string | null => {
      if (!dateStr) return null;
      try {
        const standardDate = new Date(dateStr);
        if (!isNaN(standardDate.getTime())) return standardDate.toISOString();

        // Handle eBay CSV formats (e.g. Jan-25-26)
        const months: Record<string, number> = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };

        const cleanStr = dateStr.trim().toLowerCase().replace(/,/g, '');
        const parts = cleanStr.split(/[- /]+/);

        if (parts.length >= 3) {
          let [day, month, year]: any[] = [0, 0, 0];
          let matched = false;

          if (months[parts[0]] !== undefined) { // MMM-DD-YY
            month = months[parts[0]]; day = parseInt(parts[1], 10); year = parseInt(parts[2], 10); matched = true;
          } else if (months[parts[1]] !== undefined) { // DD-MMM-YY
            day = parseInt(parts[0], 10); month = months[parts[1]]; year = parseInt(parts[2], 10); matched = true;
          }

          if (matched && !isNaN(day) && !isNaN(month) && !isNaN(year)) {
            if (year < 100) year += 2000;
            const d = new Date(Date.UTC(year, month, day));
            return isNaN(d.getTime()) ? null : d.toISOString();
          }
        }
        return null;
      } catch {
        return null;
      }
    };

    // Robust numeric parsing
    const parseNumber = (val?: any): number | null => {
      if (val === undefined || val === null || val === "") return null;
      if (typeof val === "number") return val;
      const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
      return isNaN(num) ? null : num;
    };

    for (const order of orders) {
      try {
        if (!order.ebay_order_id) {
          skipped++;
          continue;
        }

        const transactionAmount = parseNumber(order.total_amount);
        const shippingCost = parseNumber(order.shipping_cost);
        const adFee = parseNumber(order.ad_fee);
        const addFee = parseNumber(order.add_fee);
        const netProfit = parseNumber(order.net_profit);

        const orderData = {
          user_id: userId,
          ebay_order_id: order.ebay_order_id,
          sales_record_number: order.sales_record_number || null,
          buyer_name: order.buyer_name || null,
          buyer_username: order.buyer_username || null,
          buyer_email: order.buyer_email || null,
          order_date: parseDate(order.order_date) || parseDate(order.date_sold) || new Date().toISOString(),
          order_status: (transactionAmount === 0 ? "cancelled" : (order.order_status || "paid")).toLowerCase(),
          total_amount: transactionAmount,
          subtotal: parseNumber(order.subtotal),
          currency: order.currency || "USD",
          shipping_address: order.shipping_address || null,
          line_items: order.line_items || null,
          platform: order.platform || "eBay",
          item_number: order.item_number || null,
          item_title: order.item_title || null,
          custom_label: order.custom_label || null,
          quantity: parseNumber(order.quantity) || 1,
          sold_via: order.sold_via || null,
          discount_info: order.discount_info || null,
          ship_by_date: parseDate(order.ship_by_date),
          date_sold: parseDate(order.date_sold),
          date_paid: parseDate(order.date_paid),
          buyer_zip: order.buyer_zip || null,
          item_image_url: order.item_image_url || null,
          shipping_cost: shippingCost,
          ad_fee: adFee,
          transaction_id: order.transaction_id || null,
          add_fee: addFee,
          net_profit: netProfit,
          delivery_date: parseDate(order.delivery_date),
          synced_at: new Date().toISOString(),
          deleted_at: null,
        };

        // UPSERT LOGIC
        // UPSERT LOGIC
        // FIX: Match based on Sales Record Number first to support combined orders (multi-item).
        // eBay Order ID is shared across items in a combined order, but Sales Record Number is unique per item.
        let query = supabase
          .from("ebay_orders")
          .select("id, add_fee")
          .eq("user_id", userId);

        if (order.sales_record_number) {
          query = query.eq("sales_record_number", order.sales_record_number);
        } else {
          console.log(`[sync-debug] Order ${order.ebay_order_id} missing sales_record_number, fallback to ID`);
          query = query.eq("ebay_order_id", order.ebay_order_id);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
          console.log(`[sync-debug] Duplicate found for ${order.ebay_order_id} (Sale: ${order.sales_record_number || 'N/A'}) - Updating`);
          // PROTECTION: Only update fields that were actually provided in the payload
          // to avoid nulling out existing data (like buyer info from CSV sync)
          const updateData: any = { synced_at: new Date().toISOString() };

          // Map of fields to check and update if present in the payload
          const fieldsToUpdate = [
            'sales_record_number', 'buyer_name', 'buyer_username', 'buyer_email',
            'order_status', 'total_amount', 'subtotal', 'currency',
            'shipping_address', 'line_items', 'item_number', 'item_title',
            'custom_label', 'quantity', 'sold_via', 'discount_info',
            'buyer_zip', 'item_image_url', 'shipping_cost', 'ad_fee',
            'transaction_id', 'add_fee', 'date_paid', 'ship_by_date', 'net_profit', 'delivery_date'
          ];

          for (const key of fieldsToUpdate) {
            const val = (order as any)[key];
            if (val !== undefined && val !== null && val !== "") {
              if (key.includes('date') || key.includes('_by_') || key === 'date_sold' || key === 'date_paid') {
                const parsed = parseDate(val);
                if (parsed) updateData[key] = parsed;
              } else if (typeof val === 'number' || key.includes('amount') || key.endsWith('_cost') || key.endsWith('_fee')) {
                const num = parseNumber(val);
                if (num !== null) updateData[key] = num;
              } else {
                updateData[key] = val;
              }
            }
          }

          // Special handling for order_date which is required but might be in different payload keys
          const oDate = parseDate(order.order_date) || parseDate(order.date_sold);
          if (oDate) updateData.order_date = oDate;

          const { error: err } = await supabase
            .from("ebay_orders")
            .update(updateData)
            .eq("id", existing.id);

          if (err) throw err;
          updated++;
        } else {
          const { error: err } = await supabase
            .from("ebay_orders")
            .insert(orderData);
          if (err) throw err;
          synced++;
        }
      } catch (err: any) {
        console.error(`[sync-ebay-orders] Order ${order.ebay_order_id} failed:`, err.message);
        errors.push(`${order.ebay_order_id}: sync_failed`);
        skipped++;
        // Log individual upsert failure (using database category)
        await logSyncEvent(supabase, userId, 'error', 'database', 'database_upsert_failed', { ebay_order_id: order.ebay_order_id }, { error: 'order_upsert_failed' });
      }
    }

    await logSyncEvent(supabase, userId, errors.length > 0 ? 'warning' : 'success', null, 'orders_upsert_completed', null, { 
      synced, updated, skipped, error_count: errors.length 
    });

    return new Response(
      JSON.stringify({ success: true, synced, updated, skipped, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[sync-ebay-orders] Fatal error:", error);
    // Since we might not have a reliable supabase client or userId if auth failed, 
    // we only log to DB if we successfully initialized them.
    // Auth failures themselves shouldn't normally log to ebay_sync_logs unless we want to.
    return new Response(
      JSON.stringify({ success: false, error: "Unable to sync eBay orders. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

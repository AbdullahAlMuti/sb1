import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { enforceActiveSubscription } from "../_shared/plan-middleware.ts";
import { resolveCorsHeaders } from "../_shared/cors.ts";


// Helper to log PII access for security audit
const logPIIAccess = async (
  supabase: any,
  userId: string,
  action: string,
  metadata: Record<string, unknown>
) => {
  try {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      entity_type: "ebay_orders",
      action,
      metadata: {
        ...metadata,
        pii_accessed: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[ebay-orders] Failed to log PII access", err);
  }
};

type ListRequest = {
  op: "list";
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

type DeleteRequest = {
  op: "delete";
  ids: string[];
};

type RequestBody = ListRequest | DeleteRequest;

const json = (ch: Record<string,string>, status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...ch, "Content-Type": "application/json" },
  });

const clampInt = (value: unknown, fallback: number, min: number, max: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

const asTrimmedString = (value: unknown, maxLen: number) => {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  if (!s) return undefined;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
};

const parseISODate = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
};

const uuidish = /^[0-9a-fA-F-]{20,}$/;

Deno.serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(corsHeaders, 401, { error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Use Service Role client for heavy queries that exceed RLS/Anon limits (like total revenue over 1000 rows)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const ipLimit = await checkRateLimit(supabaseAdmin, {
      bucket: "ebay-orders:ip",
      key: getClientIp(req),
      limit: 60,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    const userId = !claimsError && claimsData?.claims?.sub ? (claimsData.claims.sub as string) : null;
    if (!userId) return json(corsHeaders, 401, { error: "Unauthorized" });

    const blockResponse = await enforceActiveSubscription(supabaseAdmin, userId);
    if (blockResponse) return blockResponse;

    const userLimit = await checkRateLimit(supabaseAdmin, {
      bucket: "ebay-orders:user",
      key: userId,
      limit: 120,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    if (req.method !== "POST") return json(corsHeaders, 405, { error: "Method not allowed" });

    const body = (await req.json()) as Partial<RequestBody>;
    if (!body?.op) return json(corsHeaders, 400, { error: "Invalid payload" });

    if (body.op === "list") {
      const page = clampInt((body as ListRequest).page, 1, 1, 1_000_000);
      const limit = clampInt((body as ListRequest).limit, 100, 1, 100);
      const search = asTrimmedString((body as ListRequest).search, 200);
      const status = asTrimmedString((body as ListRequest).status, 30) ?? "all";
      const dateFrom = parseISODate((body as ListRequest).dateFrom);
      const dateTo = parseISODate((body as ListRequest).dateTo);

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Helper function needs to accept query builder from EITHER client
      const applyFilters = (baseQuery: any, statuses: string[] | string | null) => {
        let q = baseQuery.eq("user_id", userId).is("deleted_at", null);

        // Filter by status if provided
        if (statuses) {
          if (statuses === "all") {
            // No specific filter
          } else {
            if (Array.isArray(statuses)) {
              q = q.in("order_status", statuses);
            } else {
              q = q.in("order_status", [
                statuses,
                statuses.toLowerCase(),
                statuses.toUpperCase(),
                statuses[0]?.toUpperCase() + statuses.slice(1),
              ]);
            }
          }
        }

        if (search) {
          const escaped = search.replaceAll("%", "\\%").replaceAll("_", "\\_");
          q = q.or(
            `ebay_order_id.ilike.%${escaped}%,buyer_name.ilike.%${escaped}%,buyer_email.ilike.%${escaped}%`,
          );
        }
        if (dateFrom) q = q.gte("order_date", dateFrom);
        if (dateTo) q = q.lte("order_date", dateTo);
        return q;
      };

      // 1. Get filtered paginated data
      let query = supabase.from("ebay_orders").select("*, order_enrichments(*)", { count: "exact" });
      query = applyFilters(query, status);

      const { data, error, count } = await query
        .order("sales_record_number", { ascending: false, nullsFirst: false })
        .order("order_date", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("[ebay-orders] list error", error);
        return json(corsHeaders, 500, { error: "Failed to load orders" });
      }

      // SECURITY: Audit log when buyer PII is accessed
      const hasPII = data && data.length > 0 && data.some(
        (order: any) => order.buyer_email || order.shipping_address
      );
      if (hasPII) {
        await logPIIAccess(supabase, userId, "list_orders_with_pii", {
          order_count: data?.length ?? 0,
          search_query: search ?? null,
          status_filter: status !== "all" ? status : null,
        });
      }


      const { data: summaryRows, error: summaryError } = await supabaseAdmin.rpc("get_ebay_order_summary", {
        p_user_id: userId,
        p_status: status,
        p_search: search,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });

      if (summaryError) {
        console.error("[ebay-orders] summary error", summaryError);
      }

      const summary = Array.isArray(summaryRows) ? summaryRows[0] : summaryRows;
      const distinctRows = Number(summary?.distinct_rows ?? 0);
      const totalRevenue = Number(summary?.total_revenue ?? 0);

      // console.log(`[Revenue Debug] Status: ${status}, Rows: ${distinctRows}, Total: ${totalRevenue}`);


      // 3. Get Counts for tabs
      const countFor = async (statuses: string[] | null) => {
        // USE supabaseAdmin for accurate counts > 1000
        let q = supabaseAdmin.from("ebay_orders").select("id", { count: "exact", head: true });

        let base = q.eq("user_id", userId).is("deleted_at", null);

        if (statuses && statuses.length > 0) {
          base = base.in("order_status", statuses);
        } else {
          // 'All' tab
        }

        if (search) {
          const escaped = search.replaceAll("%", "\\%").replaceAll("_", "\\_");
          base = base.or(`ebay_order_id.ilike.%${escaped}%,buyer_name.ilike.%${escaped}%,buyer_email.ilike.%${escaped}%`);
        }
        if (dateFrom) base = base.gte("order_date", dateFrom);
        if (dateTo) base = base.lte("order_date", dateTo);

        const { count: c } = await base;
        return c ?? 0;
      };

      const [all, pending, processing, shipped, completed, cancelled, refunded] = await Promise.all([
        countFor(null),
        countFor(["pending", "Pending"]),
        countFor(["processing", "Processing"]),
        countFor(["shipped", "Shipped"]),
        countFor(["completed", "Completed"]),
        countFor(["cancelled", "Cancelled"]),
        countFor(["refunded", "Refunded"]),
      ]);

      return json(corsHeaders, 200, {
        orders: data ?? [],
        total: count ?? 0,
        totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimals
        page,
        limit,
        counts: { all, pending, processing, shipped, completed, cancelled, refunded },
        debug: {
          statusFilter: status,
          revenueRows: distinctRows,
          calcRevenue: totalRevenue
        }
      });
    }

    if (body.op === "delete") {
      const ids = (body as DeleteRequest).ids;
      if (!Array.isArray(ids) || ids.length === 0) return json(corsHeaders, 400, { error: "ids is required" });
      if (ids.length > 1000) return json(corsHeaders, 400, { error: "Too many ids" });

      const cleaned = Array.from(new Set(ids.filter((id) => typeof id === "string" && uuidish.test(id))));
      if (cleaned.length === 0) return json(corsHeaders, 400, { error: "No valid ids" });

      // Hard-delete: permanently removes records from the database.
      const { data: deletedData, error: deleteError } = await supabase
        .from("ebay_orders")
        .delete()
        .eq("user_id", userId)
        .in("id", cleaned)
        .select("id");

      if (deleteError) {
        console.error("[ebay-orders] delete error", deleteError);
        return json(corsHeaders, 500, { error: "Failed to delete orders" });
      }

      return json(corsHeaders, 200, {
        deletedCount: Array.isArray(deletedData) ? deletedData.length : 0,
        deletedIds: Array.isArray(deletedData) ? deletedData.map((r: any) => r.id) : [],
      });
    }

    return json(corsHeaders, 400, { error: "Unknown op" });
  } catch (e) {
    console.error("[ebay-orders] unhandled", e);
    return json(corsHeaders, 500, { error: "Internal error" });
  }
});

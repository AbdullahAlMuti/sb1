import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
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

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    const userId = !claimsError && claimsData?.claims?.sub ? (claimsData.claims.sub as string) : null;
    if (!userId) return json(401, { error: "Unauthorized" });

    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const body = (await req.json()) as Partial<RequestBody>;
    if (!body?.op) return json(400, { error: "Invalid payload" });

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

        // Logic for 0.00 revenue = Cancelled
        if (statuses) {
          if (statuses === "all") {
            // No specific filter
          } else {
            const statusList = Array.isArray(statuses) ? statuses.map(s => s.toLowerCase()) : [statuses.toLowerCase()];
            const isCancelledFilter = statusList.includes("cancelled");

            if (isCancelledFilter) {
              const sArr = Array.isArray(statuses) ? statuses : [statuses];
              const inValues = sArr.map(s => s.replace(/"/g, '')).join(',');
              q = q.or(`order_status.in.(${inValues}),total_amount.eq.0`);
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
              q = q.neq("total_amount", 0);
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
        return json(500, { error: "Failed to load orders" });
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


      // 2. Get Revenue Sum (filtered by SAME criteria as main list)
      // Note: PostgREST max_rows limit (usually 1000) applies even to Service Key via HTTP.
      // We must paginate to get all rows.
      let allRevenueRows: any[] = [];
      let batchSize = 1000;
      let hasMore = true;
      let batchPage = 0;

      while (hasMore) {
        // USE supabaseAdmin to be safe
        let q = supabaseAdmin.from("ebay_orders").select("total_amount");
        q = applyFilters(q, status);

        if (status === "all") {
          q = q
            .not("order_status", "ilike", "cancelled")
            .neq("total_amount", 0);
        }

        // Fetch batch
        q = q.range(batchPage * batchSize, (batchPage + 1) * batchSize - 1);

        const { data: batchData, error: batchError } = await q;

        if (batchError) {
          console.error("Revenue batch error:", batchError);
          break;
        }

        if (batchData && batchData.length > 0) {
          allRevenueRows = allRevenueRows.concat(batchData);
          if (batchData.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
        batchPage++;
        // Safety: Limit complexity to ~100k orders
        if (batchPage > 100) break;
      }

      const revenueData = allRevenueRows;
      const distinctRows = revenueData.length;
      const totalRevenue = revenueData.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0) || 0;

      // console.log(`[Revenue Debug] Status: ${status}, Rows: ${distinctRows}, Total: ${totalRevenue}`);


      // 3. Get Counts for tabs
      const countFor = async (statuses: string[] | null) => {
        // USE supabaseAdmin for accurate counts > 1000
        let q = supabaseAdmin.from("ebay_orders").select("id", { count: "exact", head: true });

        let base = q.eq("user_id", userId).is("deleted_at", null);

        if (statuses && statuses.length > 0) {
          const sList = statuses.map(s => s.toLowerCase());
          const isCancelled = sList.includes("cancelled");

          if (isCancelled) {
            const inTuple = `(${statuses.join(',')})`;
            base = base.or(`order_status.in.${inTuple},total_amount.eq.0`);
          } else {
            base = base.in("order_status", statuses);
            base = base.neq("total_amount", 0);
          }
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

      return json(200, {
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
      if (!Array.isArray(ids) || ids.length === 0) return json(400, { error: "ids is required" });
      if (ids.length > 1000) return json(400, { error: "Too many ids" });

      const cleaned = Array.from(new Set(ids.filter((id) => typeof id === "string" && uuidish.test(id))));
      if (cleaned.length === 0) return json(400, { error: "No valid ids" });

      // Hard-delete: permanently removes records from the database.
      const { data: deletedData, error: deleteError } = await supabase
        .from("ebay_orders")
        .delete()
        .eq("user_id", userId)
        .in("id", cleaned)
        .select("id");

      if (deleteError) {
        console.error("[ebay-orders] delete error", deleteError);
        return json(500, { error: "Failed to delete orders" });
      }

      return json(200, {
        deletedCount: Array.isArray(deletedData) ? deletedData.length : 0,
        deletedIds: Array.isArray(deletedData) ? deletedData.map((r: any) => r.id) : [],
      });
    }

    return json(400, { error: "Unknown op" });
  } catch (e) {
    console.error("[ebay-orders] unhandled", e);
    return json(500, { error: "Internal error" });
  }
});

import { resolveExtensionCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceActiveSubscription } from "../_shared/plan-middleware.ts";


type ListRequest = {
  op: "list";
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

type RequestBody = ListRequest;

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

Deno.serve(async (req) => {
  const corsHeaders = resolveExtensionCors(req);
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    const userId = !claimsError && claimsData?.claims?.sub ? (claimsData.claims.sub as string) : null;
    if (!userId) return json(401, { error: "Unauthorized" });

    const blockResponse = await enforceActiveSubscription(supabaseAdmin, userId);
    if (blockResponse) return blockResponse;

    if (req.method !== "POST") return json(405, { error: "Method not allowed" });
    const body = (await req.json()) as Partial<RequestBody>;
    if (body?.op !== "list") return json(400, { error: "Invalid payload" });

    const page = clampInt(body.page, 1, 1, 1_000_000);
    const limit = clampInt(body.limit, 50, 1, 200);
    const search = asTrimmedString(body.search, 200);
    const status = asTrimmedString(body.status, 30) ?? "all";
    const dateFrom = parseISODate(body.dateFrom);
    const dateTo = parseISODate(body.dateTo);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = supabase
      .from("ebay_orders")
      // FK-based relationship name is the table name.
      .select("*,order_enrichments(*)", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null);

    // status filter
    if (status && status !== "all") {
      const s = status.toLowerCase();
      q = q.in("order_status", [status, s, s.toUpperCase(), s[0]?.toUpperCase() + s.slice(1)]);
    }

    if (search) {
      const escaped = search.replaceAll("%", "\\%").replaceAll("_", "\\_");
      q = q.or(
        `ebay_order_id.ilike.%${escaped}%,buyer_name.ilike.%${escaped}%,buyer_email.ilike.%${escaped}%`,
      );
    }

    if (dateFrom) q = q.gte("order_date", dateFrom);
    if (dateTo) q = q.lte("order_date", dateTo);

    const { data, error, count } = await q
      .order("sales_record_number", { ascending: false, nullsFirst: false })
      .order("order_date", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[orders-dashboard] list error", error);
      return json(500, { error: "Failed to load orders" });
    }

    return json(200, {
      orders: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    console.error("[orders-dashboard] unhandled", e);
    return json(500, { error: "Internal error" });
  }
});

import { createServiceClient } from "../_shared/extension-session.ts";
import { resolveCorsHeaders } from "../_shared/cors.ts";

const START_TIME = Date.now();

Deno.serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createServiceClient();

  // Probe DB with the cheapest possible query (HEAD-only, no row data returned).
  let dbOk = false;
  let dbLatencyMs: number | null = null;
  try {
    const t0 = Date.now();
    const { error: probeError } = await supabase
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    dbLatencyMs = Date.now() - t0;
    dbOk = probeError == null;
  } catch {
    dbOk = false;
  }

  const uptimeMs = Date.now() - START_TIME;
  const status = dbOk ? "ok" : "degraded";
  const httpStatus = dbOk ? 200 : 503;

  return new Response(
    JSON.stringify({
      status,
      db: dbOk ? "ok" : "unreachable",
      dbLatencyMs,
      uptimeMs,
      version: Deno.env.get("FUNCTION_VERSION") ?? "unknown",
      timestamp: new Date().toISOString(),
    }),
    {
      status: httpStatus,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});

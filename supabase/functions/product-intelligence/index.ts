import { createServiceClient } from "../_shared/extension-session.ts";
import { resolveCorsHeaders } from "../_shared/cors.ts";

/**
 * Scheduled runner for the product intelligence engine.
 *
 * Recomputes product profitability scores, refreshes the data-driven
 * settings suggestion, and (re)generates must-sell recommendations by
 * calling the internal `product_engine_recompute` RPC with the service
 * role. Auto-apply only happens when the admin has disabled manual
 * approval in product_smart_settings — the engine enforces that.
 *
 * Invoke from a scheduler (or manually) with the internal secret:
 *   POST /functions/v1/product-intelligence
 *   X-Internal-Function-Secret: <INTERNAL_FUNCTION_SECRET>
 */
Deno.serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" });
  }

  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  const providedSecret = req.headers.get("X-Internal-Function-Secret");
  if (!internalSecret || providedSecret !== internalSecret) {
    return json(401, { success: false, error: "Unauthorized" });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("product_engine_recompute", {
    p_triggered_by: "cron",
  });

  if (error) {
    console.error("[product-intelligence] recompute failed:", error.message);
    return json(500, { success: false, error: error.message });
  }

  return json(200, { success: true, result: data });
});

// check-vero — screens a listing title against the owner-maintained protected
// brand list (description_config.exclusion_rules.vero_brands, edited in the
// admin "Description Config" page).
//
// POST { title } → { flagged: boolean, matches: [{ brand, risk, category }] }
//
// Auth: extension session token or legacy JWT. The list itself is not secret,
// but the endpoint is authenticated + rate limited so it cannot be scraped.

import { resolveExtensionCors } from "../_shared/cors.ts";
import { createServiceClient, resolveExtensionOrLegacyAuth } from "../_shared/extension-session.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { matchVeroBrands } from "../_shared/listing-checks.ts";

Deno.serve(async (req) => {
  const corsHeaders = resolveExtensionCors(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabase = createServiceClient();

    let auth;
    try {
      auth = await resolveExtensionOrLegacyAuth(supabase, req);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "Unauthorized" }, 401);
    }

    const limit = await checkRateLimit(supabase, {
      bucket: "check-vero:user", key: auth.userId, limit: 120, windowSeconds: 60,
    });
    if (!limit.allowed) return rateLimitResponse(limit, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.slice(0, 500) : "";
    if (!title.trim()) return json({ error: "title is required" }, 400);

    const { data: config, error } = await supabase
      .from("description_config")
      .select("exclusion_rules")
      .eq("scope", "global")
      .maybeSingle();

    if (error) {
      console.error("[check-vero] config read failed:", error.message);
      // The caller must know the screen did NOT run — never report "clean".
      return json({ error: "Brand list unavailable" }, 503);
    }

    const brands = (config?.exclusion_rules as { vero_brands?: unknown } | null)?.vero_brands ?? [];
    const matches = matchVeroBrands(title, brands);
    return json({ flagged: matches.length > 0, matches, checked: Array.isArray(brands) ? brands.length : 0 });
  } catch (error) {
    console.error("[check-vero] error:", error);
    return json({ error: "Internal error" }, 500);
  }
});

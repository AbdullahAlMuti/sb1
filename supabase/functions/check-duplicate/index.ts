// check-duplicate — has the AUTHENTICATED user already listed this supplier
// product? Used by the extension before every upload (panel + bulk).
//
// POST { asin, supplier? } → { duplicate: boolean, listing?: { id, title, status, ebay_item_id, created_at } }
//
// Only rows that reached eBay (draft created or published) count — a row that
// was merely scanned is not a duplicate. Always scoped to the caller's user id.

import { resolveExtensionCors } from "../_shared/cors.ts";
import { createServiceClient, resolveExtensionOrLegacyAuth } from "../_shared/extension-session.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { normalizeProductId } from "../_shared/listing-checks.ts";

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
      bucket: "check-duplicate:user", key: auth.userId, limit: 120, windowSeconds: 60,
    });
    if (!limit.allowed) return rateLimitResponse(limit, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const productId = normalizeProductId(body?.asin ?? body?.supplier_product_id);
    if (!productId) return json({ error: "asin is required" }, 400);

    const fields = "id, title, status, ebay_item_id, created_at";

    // Legacy Amazon key first, then the supplier-neutral key.
    const byAsin = await supabase
      .from("listings")
      .select(fields)
      .eq("user_id", auth.userId)
      .eq("amazon_asin", productId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byAsin.error) throw byAsin.error;

    let listing = byAsin.data;
    if (!listing) {
      const bySupplier = await supabase
        .from("listings")
        .select(fields)
        .eq("user_id", auth.userId)
        .eq("supplier_product_id", productId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (bySupplier.error) throw bySupplier.error;
      listing = bySupplier.data;
    }

    return json({ duplicate: !!listing, listing: listing ?? null });
  } catch (error) {
    console.error("[check-duplicate] error:", error);
    // 500 (not a fake "duplicate:false") so the client can tell the check did not run.
    return json({ error: "Duplicate check failed" }, 500);
  }
});

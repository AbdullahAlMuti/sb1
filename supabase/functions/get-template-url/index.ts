import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// ── CORS ──────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Plan hierarchy (mirrors store-design.types.ts) ────────────────────────────

const PLAN_HIERARCHY: Record<string, number> = {
  free:       0,
  trial:      0,
  starter:    1,
  growth:     2,
  pro:        2,  // alias
  agency:     3,
  enterprise: 3,
  custom:     4,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const log = (step: string, details?: Record<string, unknown>) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-TEMPLATE-URL] ${step}${d}`);
};

function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", 405);
  }

  const supabaseUrl        = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey    = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const storageBucket      = "store-design-images";

  // ── Parse request ────────────────────────────────────────────────────────

  let body: { design_id?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }

  const { design_id } = body;
  if (!design_id) {
    return errorResponse("Missing required field: design_id");
  }

  // ── Auth: validate caller JWT ────────────────────────────────────────────

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return errorResponse("Unauthorized — missing Bearer token.", 401);
  }

  // User-scoped client (validates JWT)
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: authError } = await userClient.auth.getUser();
  if (authError || !userData?.user) {
    log("Auth failed", { error: authError?.message });
    return errorResponse("Unauthorized — invalid token.", 401);
  }

  const userId = userData.user.id;
  log("User authenticated", { userId });

  // ── Service client for privileged reads ─────────────────────────────────

  const svc = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── Fetch design (service role to read template_url) ────────────────────

  const { data: design, error: designError } = await svc
    .from("store_designs")
    .select("id, title, slug, template_url, access_level, allowed_plans, is_free, is_published, is_visible")
    .eq("id", design_id)
    .single();

  if (designError || !design) {
    log("Design not found", { design_id, error: designError?.message });
    return errorResponse("Design not found.", 404);
  }

  // ── Check design is publicly accessible ─────────────────────────────────

  if (!design.is_published || !design.is_visible) {
    return errorResponse("This design is not available.", 403);
  }

  if (!design.template_url) {
    return errorResponse("No template URL is configured for this design.", 404);
  }

  // ── Free designs: always grant ───────────────────────────────────────────

  if (design.is_free || design.access_level === "free") {
    log("Free design — granting direct template URL", { design_id });
    return new Response(
      JSON.stringify({ url: design.template_url, signed: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  // ── Get user's active plan ───────────────────────────────────────────────

  const { data: planNameRow, error: planError } = await svc
    .rpc("get_user_plan_name", { check_user_id: userId });

  if (planError) {
    log("Failed to fetch user plan", { userId, error: planError.message });
    return errorResponse("Failed to verify subscription.", 500);
  }

  const userPlanName: string = (planNameRow as string | null) ?? "free";
  log("User plan resolved", { userId, userPlanName });

  // ── Plan access check ────────────────────────────────────────────────────

  const normalizedUserPlan  = userPlanName.toLowerCase();
  const normalizedDesignLevel = design.access_level.toLowerCase();

  const allowedPlans = (design.allowed_plans as string[] | null) ?? [];
  const isInAllowedList = allowedPlans.some(
    (p: string) => p.toLowerCase() === normalizedUserPlan
  );

  const userHierarchy   = PLAN_HIERARCHY[normalizedUserPlan]   ?? 0;
  const designHierarchy = PLAN_HIERARCHY[normalizedDesignLevel] ?? 0;

  const canAccess = isInAllowedList || (userHierarchy >= designHierarchy);

  if (!canAccess) {
    log("Access denied", { userId, userPlanName, designLevel: design.access_level });
    return errorResponse(
      `Your current plan (${userPlanName}) does not include access to this design. Please upgrade.`,
      403
    );
  }

  log("Access granted", { userId, userPlanName, designId: design_id });

  // ── Generate signed URL (if template_url is a Supabase Storage path) ─────
  // If template_url is an external URL (e.g. Shopify theme partner URL),
  // return it directly (it is protected by this access check).
  // If it's a storage path like "store-design-images/templates/xyz.zip",
  // generate a signed URL valid for 300 seconds (5 minutes).

  const templateUrl = design.template_url as string;
  const isStoragePath = !templateUrl.startsWith("http");

  if (isStoragePath) {
    // Strip bucket prefix if present
    const storagePath = templateUrl.replace(`${storageBucket}/`, "");

    const { data: signedData, error: signedError } = await svc.storage
      .from(storageBucket)
      .createSignedUrl(storagePath, 300); // 5 minutes

    if (signedError || !signedData?.signedUrl) {
      log("Signed URL generation failed", { error: signedError?.message });
      return errorResponse("Failed to generate download link. Please try again.", 500);
    }

    return new Response(
      JSON.stringify({ url: signedData.signedUrl, signed: true, expires_in: 300 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  // External URL — return directly (access already verified above)
  return new Response(
    JSON.stringify({ url: templateUrl, signed: false }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
});

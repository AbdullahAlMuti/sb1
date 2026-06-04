import {
  corsHeaders,
  createServiceClient,
  isExpired,
  jsonResponse,
  readJson,
  requireMethod,
  sha256,
  isFeatureEnabled,
  requireExtensionNewAuthEnabled,
} from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    const ipLimit = await checkRateLimit(supabase, {
      bucket: "extension-pairing-status:ip",
      key: getClientIp(req),
      limit: 120,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    await requireExtensionNewAuthEnabled(supabase);
    if (!(await isFeatureEnabled(supabase, "extension_pairing_fallback_enabled"))) {
      throw new Error("Extension pairing fallback is disabled");
    }

    const body = await readJson(req);
    const connectToken = typeof body.connectToken === "string" ? body.connectToken.trim() : "";
    const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";

    if (!connectToken || !clientSecret) {
      throw new Error("connectToken and clientSecret are required");
    }

    const connectTokenHash = await sha256(connectToken);
    const clientSecretHash = await sha256(clientSecret);

    const { data: requestRow } = await supabase
      .from("extension_pairing_codes")
      .select("status, expires_at")
      .eq("connect_token_hash", connectTokenHash)
      .eq("client_secret_hash", clientSecretHash)
      .maybeSingle();

    // If not found or deleted, treat as expired
    if (!requestRow) {
      return jsonResponse({ success: true, status: "expired" });
    }

    let status = requestRow.status;
    if (isExpired(requestRow.expires_at) && status === "pending") {
      status = "expired";
    }

    return jsonResponse({
      success: true,
      status: status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, 400);
  }
});

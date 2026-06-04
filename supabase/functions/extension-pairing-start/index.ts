import {
  addSeconds,
  corsHeaders,
  createOpaqueToken,
  createServiceClient,
  getClientIp,
  getUserAgent,
  jsonResponse,
  optionalString,
  readJson,
  requireMethod,
  requireString,
  sha256,
  isFeatureEnabled,
  requireExtensionNewAuthEnabled,
} from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp as getRateLimitIp, rateLimitResponse } from "../_shared/rate-limit.ts";

function generatePairingCode(): string {
  const codeSpace = 900_000;
  const maxUnbiased = Math.floor(0x100000000 / codeSpace) * codeSpace;
  const random = new Uint32Array(1);

  let value = 0;
  do {
    crypto.getRandomValues(random);
    value = random[0];
  } while (value >= maxUnbiased);

  return String(100_000 + (value % codeSpace));
}

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    const ipLimit = await checkRateLimit(supabase, {
      bucket: "extension-pairing-start:ip",
      key: getRateLimitIp(req),
      limit: 20,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    await requireExtensionNewAuthEnabled(supabase);
    if (!(await isFeatureEnabled(supabase, "extension_pairing_fallback_enabled"))) {
      throw new Error("Extension pairing fallback is disabled");
    }

    const body = await readJson(req);
    const installId = requireString(body, "installId");
    const installIdHash = await sha256(installId);

    // Rate limiting to prevent code request spam
    const rateWindowStart = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentRequestCount } = await supabase
      .from("extension_pairing_codes")
      .select("id", { count: "exact", head: true })
      .eq("install_id_hash", installIdHash)
      .gte("created_at", rateWindowStart);
      
    if ((recentRequestCount ?? 0) >= 5) {
      return jsonResponse({ success: false, error: "Rate limit exceeded. Try again later." }, 429);
    }

    const pairingCode = generatePairingCode();
    const connectToken = createOpaqueToken("ssct");
    const clientSecret = createOpaqueToken("sscs");
    const expiresAt = addSeconds(10 * 60); // 10 minutes

    const { data: requestRow, error: requestError } = await supabase
      .from("extension_pairing_codes")
      .insert({
        flow_type: "pairing",
        code_hash: await sha256(pairingCode),
        connect_token_hash: await sha256(connectToken),
        client_secret_hash: await sha256(clientSecret),
        install_id_hash: installIdHash,
        device_name: optionalString(body, "deviceName"),
        browser: optionalString(body, "browser"),
        extension_version: optionalString(body, "extensionVersion"),
        status: "pending",
        expires_at: expiresAt,
        metadata: {
          ip_address: getClientIp(req),
          user_agent: getUserAgent(req),
        },
      })
      .select("id, expires_at, status")
      .single();

    if (requestError || !requestRow) throw new Error(requestError?.message || "Failed to create pairing request");

    return jsonResponse({
      success: true,
      pairingCode,
      connectToken,
      clientSecret,
      expiresAt,
      requestId: requestRow.id,
      pollingInterval: 5000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, 400);
  }
});

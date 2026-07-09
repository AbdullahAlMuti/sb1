import {
  corsHeaders,
  createServiceClient,
  getFeatureFlags,
  jsonResponse,
  requireMethod,
} from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["GET", "POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    const ipLimit = await checkRateLimit(supabase, {
      bucket: "extension-auth-config:ip",
      key: getClientIp(req),
      limit: 120,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    const flags = await getFeatureFlags(supabase);
    const pick = (key: string) => {
      const value = flags[key] as { enabled?: boolean; rolloutPercentage?: number } | undefined;
      return {
        enabled: Boolean(value?.enabled) && Number(value?.rolloutPercentage ?? 0) > 0,
        rolloutPercentage: Number(value?.rolloutPercentage ?? 0),
      };
    };

    return jsonResponse(req, {
      success: true,
      flags: {
        extensionNewAuthEnabled: pick("extension_new_auth_enabled"),
        extensionAutoConnectEnabled: pick("extension_auto_connect_enabled"),
        extensionLegacyFallbackEnabled: pick("extension_legacy_fallback_enabled"),
        extensionPairingFallbackEnabled: pick("extension_pairing_fallback_enabled"),
        extensionBootstrapV2Enabled: pick("extension_bootstrap_v2_enabled"),
      },
      storageKeys: {
        deviceId: "extensionDeviceId",
        accessToken: "extensionAccessToken",
        refreshToken: "extensionRefreshToken",
        accessTokenExpiresAt: "extensionAccessTokenExpiresAt",
        refreshTokenExpiresAt: "extensionRefreshTokenExpiresAt",
        bootstrapCache: "extensionBootstrapCache",
        legacyBackup: "legacyExtensionStorageBackup_v1",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse(req, { success: false, error: message }, 500);
  }
});

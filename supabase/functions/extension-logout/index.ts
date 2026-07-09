import {
  corsHeaders,
  createServiceClient,
  getClientIp,
  getUserAgent,
  jsonResponse,
  logAudit,
  logExtensionActivity,
  readJson,
  requireMethod,
  requireExtensionNewAuthEnabled,
  revokeSession,
  sha256,
  validateExtensionAccessToken,
} from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp as getRateLimitIp, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    const ipLimit = await checkRateLimit(supabase, {
      bucket: "extension-logout:ip",
      key: getRateLimitIp(req),
      limit: 60,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    await requireExtensionNewAuthEnabled(supabase);
    let context;
    try {
      context = await validateExtensionAccessToken(supabase, req);
    } catch {
      const body = await readJson(req);
      const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : null;
      if (!refreshToken) throw new Error("Missing active extension session");
      const { data: refreshRow } = await supabase
        .from("extension_session_refresh_tokens")
        .select("session_id")
        .eq("token_hash", await sha256(refreshToken))
        .maybeSingle();
      if (!refreshRow) throw new Error("Invalid refresh token");
      const { data: session } = await supabase.from("extension_sessions").select("*").eq("id", refreshRow.session_id).maybeSingle();
      if (!session) throw new Error("Extension session not found");
      context = { session, device: { id: session.device_id }, workspace: { id: session.workspace_id }, profile: { id: session.user_id } };
    }

    const userLimit = await checkRateLimit(supabase, {
      bucket: "extension-logout:user",
      key: context.session.user_id,
      limit: 60,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    await revokeSession(supabase, context.session.id, "extension_logout", context.profile.id);
    await logExtensionActivity(supabase, {
      deviceId: context.session.device_id,
      sessionId: context.session.id,
      workspaceId: context.session.workspace_id,
      userId: context.session.user_id,
      eventType: "extension_logout",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
    await logAudit(supabase, {
      actorUserId: context.session.user_id,
      action: "EXTENSION_LOGOUT",
      entityType: "extension_session",
      entityId: context.session.id,
    });

    return jsonResponse(req, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse(req, { success: false, error: message }, 401);
  }
});

import {
  corsHeaders,
  createServiceClient,
  getClientIp,
  getUserAgent,
  isAdmin,
  jsonResponse,
  logAudit,
  logExtensionActivity,
  optionalString,
  readJson,
  requireMethod,
  requireString,
  requireExtensionNewAuthEnabled,
  revokeSession,
  validateExtensionAccessToken,
  verifyWebUser,
} from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp as getRateLimitIp, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    const ipLimit = await checkRateLimit(supabase, {
      bucket: "extension-device-revoke:ip",
      key: getRateLimitIp(req),
      limit: 60,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    await requireExtensionNewAuthEnabled(supabase);
    const body = await readJson(req);
    const reason = optionalString(body, "reason") || "revoked";
    let actorUserId: string | null = null;
    let deviceId = typeof body.deviceId === "string" ? body.deviceId : null;
    let canRevokeAny = false;

    try {
      const webUser = await verifyWebUser(supabase, req);
      actorUserId = webUser.id;
      canRevokeAny = await isAdmin(supabase, webUser.id);
    } catch {
      const context = await validateExtensionAccessToken(supabase, req);
      actorUserId = context.profile.id;
      deviceId = deviceId || context.device.id;
    }

    if (!deviceId) deviceId = requireString(body, "deviceId");

    const { data: device } = await supabase.from("extension_devices").select("*").eq("id", deviceId).maybeSingle();
    if (!device) throw new Error("Extension device not found");
    if (!canRevokeAny && device.user_id !== actorUserId) throw new Error("Not authorized to revoke this device");

    await supabase
      .from("extension_devices")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: actorUserId,
        revoke_reason: reason,
      })
      .eq("id", device.id);

    const { data: sessions } = await supabase.from("extension_sessions").select("id").eq("device_id", device.id).eq("status", "active");
    for (const session of sessions || []) {
      await revokeSession(supabase, session.id, "device_revoked", actorUserId);
    }

    await logExtensionActivity(supabase, {
      deviceId: device.id,
      workspaceId: device.workspace_id,
      userId: device.user_id,
      eventType: "extension_device_revoked",
      severity: "warning",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { reason, revoked_by: actorUserId },
    });
    await logAudit(supabase, {
      actorUserId,
      action: "EXTENSION_DEVICE_REVOKED",
      entityType: "extension_device",
      entityId: device.id,
      oldValues: { status: device.status },
      newValues: { status: "revoked", reason },
    });

    return jsonResponse({ success: true, deviceId: device.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, message.includes("authorized") ? 403 : 400);
  }
});

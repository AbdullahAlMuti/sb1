import {
  addSeconds,
  corsHeaders,
  createOpaqueToken,
  createServiceClient,
  getClientIp,
  getUserAgent,
  isExpired,
  jsonResponse,
  logAudit,
  logExtensionActivity,
  readJson,
  requireMethod,
  requireString,
  SESSION_GRANT_TTL_SECONDS,
  sha256,
  requireExtensionNewAuthEnabled,
  verifyWebUser,
  verifyWorkspaceMembership,
} from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp as getRateLimitIp, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    const ipLimit = await checkRateLimit(supabase, {
      bucket: "extension-connect-approve:ip",
      key: getRateLimitIp(req),
      limit: 30,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    await requireExtensionNewAuthEnabled(supabase);
    const user = await verifyWebUser(supabase, req);
    const userLimit = await checkRateLimit(supabase, {
      bucket: "extension-connect-approve:user",
      key: user.id,
      limit: 30,
      windowSeconds: 300,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    const body = await readJson(req);
    const requestId = requireString(body, "requestId");

    const { data: requestRow } = await supabase
      .from("extension_pairing_codes")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (!requestRow) throw new Error("Connect request not found");
    if (requestRow.status !== "pending") throw new Error("Connect request is not pending");
    if (isExpired(requestRow.expires_at)) throw new Error("Connect request expired");
    if (!requestRow.device_id) throw new Error("Connect request is missing a device");

    const metadata = (requestRow.metadata ?? {}) as Record<string, unknown>;
    const workspaceId = String(metadata.workspace_id || requestRow.approved_workspace_id || "");
    if (!workspaceId) throw new Error("Connect request is missing a workspace");

    const { workspace } = await verifyWorkspaceMembership(supabase, user.id, workspaceId);

    const { data: device } = await supabase
      .from("extension_devices")
      .select("*")
      .eq("id", requestRow.device_id)
      .maybeSingle();

    if (!device) throw new Error("Extension device not found");
    if (["revoked", "blocked"].includes(device.status)) throw new Error("Extension device is blocked");

    await supabase
      .from("extension_devices")
      .update({
        user_id: user.id,
        workspace_id: workspace.id,
        status: "active",
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", device.id);

    await supabase
      .from("extension_pairing_codes")
      .update({
        status: "approved",
        approved_by_user_id: user.id,
        approved_workspace_id: workspace.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestRow.id);

    const grantToken = createOpaqueToken("ssgt");
    const grantExpiresAt = addSeconds(SESSION_GRANT_TTL_SECONDS);
    const { data: grant, error: grantError } = await supabase
      .from("extension_session_grants")
      .insert({
        device_id: device.id,
        workspace_id: workspace.id,
        user_id: user.id,
        request_id: requestRow.id,
        grant_token_hash: await sha256(grantToken),
        status: "pending",
        expires_at: grantExpiresAt,
        metadata: { flow_type: requestRow.flow_type },
      })
      .select("id, expires_at")
      .single();

    if (grantError || !grant) throw new Error(grantError?.message || "Failed to create session grant");

    await logExtensionActivity(supabase, {
      deviceId: device.id,
      workspaceId: workspace.id,
      userId: user.id,
      eventType: "extension_connect_approved",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { request_id: requestRow.id, grant_id: grant.id },
    });
    await logAudit(supabase, {
      actorUserId: user.id,
      action: "EXTENSION_CONNECT_APPROVED",
      entityType: "extension_device",
      entityId: device.id,
      newValues: { request_id: requestRow.id, grant_id: grant.id, workspace_id: workspace.id },
    });

    return jsonResponse({
      success: true,
      deviceId: device.id,
      workspaceId: workspace.id,
      grantId: grant.id,
      grantToken,
      grantExpiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, message.includes("session") ? 401 : 400);
  }
});

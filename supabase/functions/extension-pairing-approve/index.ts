import {
  corsHeaders,
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
  sha256,
  verifyWebUser,
  ensureDefaultWorkspace,
  isFeatureEnabled,
  requireExtensionNewAuthEnabled,
  optionalString,
  verifyWorkspaceMembership,
} from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp as getRateLimitIp, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    const ipLimit = await checkRateLimit(supabase, {
      bucket: "extension-pairing-approve:ip",
      key: getRateLimitIp(req),
      limit: 30,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    await requireExtensionNewAuthEnabled(supabase);
    if (!(await isFeatureEnabled(supabase, "extension_pairing_fallback_enabled"))) {
      throw new Error("Extension pairing fallback is disabled");
    }

    const user = await verifyWebUser(supabase, req);
    const userLimit = await checkRateLimit(supabase, {
      bucket: "extension-pairing-approve:user",
      key: user.id,
      limit: 30,
      windowSeconds: 300,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    const body = await readJson(req);
    const pairingCode = requireString(body, "pairingCode");
    const requestedWorkspaceId = optionalString(body, "workspaceId");

    // Explicit workspace selection must prove membership; otherwise use the caller's default workspace.
    const { workspace } = requestedWorkspaceId 
      ? { workspace: await verifyWorkspaceMembership(supabase, user.id, requestedWorkspaceId) }
      : await ensureDefaultWorkspace(supabase, user.id);

    const pairingCodeHash = await sha256(pairingCode);

    const { data: requestRow } = await supabase
      .from("extension_pairing_codes")
      .select("*")
      .eq("code_hash", pairingCodeHash)
      .eq("flow_type", "pairing")
      .maybeSingle();

    if (!requestRow) throw new Error("Invalid or expired pairing code");
    if (requestRow.status !== "pending") throw new Error("Pairing code is already used or expired");
    if (isExpired(requestRow.expires_at)) {
      await supabase.from("extension_pairing_codes").update({ status: "expired" }).eq("id", requestRow.id);
      throw new Error("Pairing code has expired");
    }

    // Now we must create or link the extension_devices record
    const { data: existingDevice } = await supabase
      .from("extension_devices")
      .select("*")
      .eq("install_id_hash", requestRow.install_id_hash)
      .maybeSingle();

    if (existingDevice && ["revoked", "blocked"].includes(existingDevice.status)) {
      throw new Error("Extension device is blocked");
    }

    const deviceWrite = {
      workspace_id: workspace.id,
      user_id: user.id,
      device_name: requestRow.device_name || "Unknown Device",
      browser: requestRow.browser,
      extension_version: requestRow.extension_version,
      status: "active", // Approve immediately
      last_seen_at: new Date().toISOString(),
      metadata: { ...(existingDevice?.metadata ?? {}), connect_source: "pairing_fallback" },
    };

    const { data: device, error: deviceError } = existingDevice
      ? await supabase.from("extension_devices").update(deviceWrite).eq("id", existingDevice.id).select("*").single()
      : await supabase
          .from("extension_devices")
          .insert({ ...deviceWrite, install_id_hash: requestRow.install_id_hash })
          .select("*")
          .single();

    if (deviceError || !device) throw new Error(deviceError?.message || "Failed to register extension device");

    // Approve the pairing code
    const { error: updateError } = await supabase
      .from("extension_pairing_codes")
      .update({
        status: "approved",
        approved_by_user_id: user.id,
        approved_workspace_id: workspace.id,
        approved_at: new Date().toISOString(),
        device_id: device.id,
      })
      .eq("id", requestRow.id);

    if (updateError) throw new Error(updateError.message || "Failed to approve pairing code");

    await logExtensionActivity(supabase, {
      deviceId: device.id,
      workspaceId: workspace.id,
      userId: user.id,
      eventType: "extension_pairing_approved",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { request_id: requestRow.id },
    });

    await logAudit(supabase, {
      actorUserId: user.id,
      action: "EXTENSION_PAIRING_APPROVED",
      entityType: "extension_device",
      entityId: device.id,
      newValues: { request_id: requestRow.id, workspace_id: workspace.id },
    });

    return jsonResponse(req, {
      success: true,
      deviceId: device.id,
      workspaceId: workspace.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse(req, 
      { success: false, error: message },
      message.includes("authorization") || message.includes("session") ? 401 : 400
    );
  }
});

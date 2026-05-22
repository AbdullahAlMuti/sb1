import {
  addSeconds,
  CONNECT_REQUEST_TTL_SECONDS,
  createOpaqueToken,
  createServiceClient,
  getClientIp,
  getUserAgent,
  jsonResponse,
  logAudit,
  logExtensionActivity,
  optionalString,
  readJson,
  requireMethod,
  requireString,
  sha256,
  verifyWebUser,
  verifyWorkspaceMembership,
  ensureDefaultWorkspace,
  isFeatureEnabled,
  requireExtensionNewAuthEnabled,
} from "../_shared/extension-session.ts";

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    await requireExtensionNewAuthEnabled(supabase);
    if (!(await isFeatureEnabled(supabase, "extension_auto_connect_enabled"))) {
      throw new Error("Extension auto-connect is disabled");
    }

    const user = await verifyWebUser(supabase, req);
    const body = await readJson(req);
    const installId = requireString(body, "installId");
    const installIdHash = await sha256(installId);
    const requestedWorkspaceId = optionalString(body, "workspaceId");

    const rateWindowStart = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentRequestCount } = await supabase
      .from("extension_pairing_codes")
      .select("id", { count: "exact", head: true })
      .eq("install_id_hash", installIdHash)
      .gte("created_at", rateWindowStart);
    if ((recentRequestCount ?? 0) >= 10) {
      return jsonResponse({ success: false, error: "Rate limit exceeded" }, 429);
    }

    const { workspace } = requestedWorkspaceId
      ? await verifyWorkspaceMembership(supabase, user.id, requestedWorkspaceId)
      : await ensureDefaultWorkspace(supabase, user.id);

    const deviceMetadata = {
      connect_source: "website_auto_connect",
      ip_address: getClientIp(req),
      user_agent: getUserAgent(req),
    };

    const { data: existingDevice } = await supabase
      .from("extension_devices")
      .select("*")
      .eq("install_id_hash", installIdHash)
      .maybeSingle();

    if (existingDevice && ["revoked", "blocked"].includes(existingDevice.status)) {
      throw new Error("Extension device is blocked");
    }

    const deviceWrite = {
      workspace_id: workspace.id,
      user_id: user.id,
      device_name: optionalString(body, "deviceName"),
      browser: optionalString(body, "browser"),
      browser_version: optionalString(body, "browserVersion"),
      os: optionalString(body, "os"),
      extension_version: optionalString(body, "extensionVersion"),
      status: existingDevice?.status === "active" ? "active" : "pending",
      last_seen_at: new Date().toISOString(),
      metadata: { ...(existingDevice?.metadata ?? {}), ...deviceMetadata },
    };

    const { data: device, error: deviceError } = existingDevice
      ? await supabase.from("extension_devices").update(deviceWrite).eq("id", existingDevice.id).select("*").single()
      : await supabase
          .from("extension_devices")
          .insert({ ...deviceWrite, install_id_hash: installIdHash })
          .select("*")
          .single();

    if (deviceError || !device) throw new Error(deviceError?.message || "Failed to register extension device");

    const connectToken = createOpaqueToken("ssct");
    const clientSecret = createOpaqueToken("sscs");
    const expiresAt = addSeconds(CONNECT_REQUEST_TTL_SECONDS);

    const { data: requestRow, error: requestError } = await supabase
      .from("extension_pairing_codes")
      .insert({
        flow_type: "auto",
        connect_token_hash: await sha256(connectToken),
        client_secret_hash: await sha256(clientSecret),
        install_id_hash: installIdHash,
        device_name: deviceWrite.device_name,
        browser: deviceWrite.browser,
        extension_version: deviceWrite.extension_version,
        status: "pending",
        expires_at: expiresAt,
        device_id: device.id,
        metadata: { workspace_id: workspace.id, user_id: user.id },
      })
      .select("id, expires_at, status")
      .single();

    if (requestError || !requestRow) throw new Error(requestError?.message || "Failed to create connect request");

    await logExtensionActivity(supabase, {
      deviceId: device.id,
      workspaceId: workspace.id,
      userId: user.id,
      eventType: "extension_connect_start",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { request_id: requestRow.id },
    });
    await logAudit(supabase, {
      actorUserId: user.id,
      action: "EXTENSION_CONNECT_STARTED",
      entityType: "extension_device",
      entityId: device.id,
      newValues: { request_id: requestRow.id, workspace_id: workspace.id },
    });

    return jsonResponse({
      success: true,
      requestId: requestRow.id,
      deviceId: device.id,
      workspaceId: workspace.id,
      connectToken,
      clientSecret,
      expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, message.includes("authorization") || message.includes("session") ? 401 : 400);
  }
});

import {
  createServiceClient,
  isAdmin,
  jsonResponse,
  readJson,
  requireMethod,
  requireString,
  verifyWebUser,
} from "../_shared/extension-session.ts";

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    const webUser = await verifyWebUser(supabase, req);
    const isUserAdmin = await isAdmin(supabase, webUser.id);
    if (!isUserAdmin) throw new Error("Unauthorized");

    const body = await readJson(req);
    const deviceId = requireString(body, "deviceId");

    // Fetch device details
    const { data: device, error: deviceError } = await supabase
      .from("extension_devices")
      .select("*, profiles!extension_devices_user_id_fkey!inner(id, email), workspaces!inner(id, name)")
      .eq("id", deviceId)
      .single();

    if (deviceError || !device) throw new Error("Device not found");

    // Fetch active sessions
    const { data: sessions } = await supabase
      .from("extension_sessions")
      .select("id, status, created_at, last_seen_at, revoked_at, ip_address, user_agent, metadata")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch recent activity logs
    const { data: activityLogs } = await supabase
      .from("extension_activity_logs")
      .select("id, event_type, severity, created_at, metadata")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch audit logs related to this device
    const { data: auditLogs } = await supabase
      .from("audit_logs")
      .select("id, action, created_at, user_id, profiles(email)")
      .eq("entity_type", "extension_device")
      .eq("entity_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(10);

    const safeDevice = {
      id: device.id,
      userId: device.user_id,
      userEmail: device.profiles?.email || "Unknown",
      workspaceId: device.workspace_id,
      workspaceName: device.workspaces?.name || "Unknown",
      deviceName: device.device_name,
      browser: device.browser,
      extensionVersion: device.extension_version,
      status: device.status,
      createdAt: device.created_at,
      lastSeenAt: device.last_seen_at,
      revokedAt: device.revoked_at,
      revokeReason: device.revoke_reason,
      migrationStatus: device.migration_status,
      // Omit hashes
    };

    return jsonResponse({
      success: true,
      data: {
        device: safeDevice,
        sessions: sessions || [],
        activityLogs: activityLogs || [],
        auditLogs: (auditLogs || []).map((log: any) => ({
          id: log.id,
          action: log.action,
          createdAt: log.created_at,
          actorUserId: log.user_id,
          actorEmail: log.profiles?.email || "System",
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 403 : 400);
  }
});

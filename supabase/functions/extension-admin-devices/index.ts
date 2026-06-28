import {
  createServiceClient,
  isAdmin,
  jsonResponse,
  readJson,
  requireMethod,
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
    const page = Math.max(1, parseInt(String(body.page ?? "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(body.pageSize ?? "50"), 10) || 50));
    const offset = (page - 1) * pageSize;
    
    // Filters
    const search = typeof body.search === "string" ? body.search.trim() : "";
    const status = typeof body.status === "string" && body.status ? body.status : null;
    const version = typeof body.version === "string" && body.version ? body.version : null;

    let query = supabase
      .from("extension_devices")
      .select("*, profiles!extension_devices_user_id_fkey!inner(id, email), workspaces!inner(id, name)", { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    }
    
    if (version) {
      query = query.eq("extension_version", version);
    }
    
    if (search) {
      // Basic search on email or device ID
      query = query.or(`id.eq.${search},profiles.email.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);

    // Map safely, never expose secrets
    const safeData = (data || []).map((device: any) => ({
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
      // explicitly omit install_id_hash
    }));

    return jsonResponse({
      success: true,
      data: safeData,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 403 : 400);
  }
});

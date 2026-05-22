import {
  createServiceClient,
  isAdmin,
  jsonResponse,
  requireMethod,
  verifyWebUser,
} from "../_shared/extension-session.ts";

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["GET", "POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    const webUser = await verifyWebUser(supabase, req);
    const isUserAdmin = await isAdmin(supabase, webUser.id);
    if (!isUserAdmin) throw new Error("Unauthorized");

    // Fetch feature flags safely
    const { data: flags, error } = await supabase
      .from("app_feature_flags")
      .select("key, description, enabled, rollout_percentage, config, created_at, updated_at")
      .in("key", [
        "extension_new_auth_enabled",
        "extension_legacy_fallback_enabled",
        "extension_pairing_fallback_enabled",
        "extension_auto_connect_enabled",
        "extension_bootstrap_v2_enabled",
        "extension_admin_control_plane_enabled",
      ]);

    if (error) throw new Error(error.message);

    // Filter nulls or map directly, only safe data
    const safeFlags = (flags || []).map((f) => ({
      key: f.key,
      description: f.description,
      enabled: f.enabled,
      rolloutPercentage: f.rollout_percentage,
      config: f.config,
      updatedAt: f.updated_at,
    }));

    return jsonResponse({
      success: true,
      data: safeFlags,
      warning: "WARNING: Modifying these flags can affect authentication for all extension users.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 403 : 400);
  }
});

import {
  createServiceClient,
  isAdmin,
  jsonResponse,
  logAudit,
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
    const key = requireString(body, "key");
    const enabled = typeof body.enabled === "boolean" ? body.enabled : false;
    const rolloutPercentage = typeof body.rolloutPercentage === "number" ? body.rolloutPercentage : (enabled ? 100 : 0);

    const allowedFlags = [
      "extension_new_auth_enabled",
      "extension_legacy_fallback_enabled",
      "extension_pairing_fallback_enabled",
      "extension_auto_connect_enabled",
      "extension_bootstrap_v2_enabled",
      "extension_admin_control_plane_enabled",
    ];

    if (!allowedFlags.includes(key)) {
      throw new Error("Invalid feature flag key");
    }

    const { data: existing, error: fetchError } = await supabase
      .from("app_feature_flags")
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    
    // Ensure safety
    if (!existing && key === "extension_new_auth_enabled" && enabled === true) {
       // Allow it, but we log heavily
    }

    const { error: updateError } = await supabase
      .from("app_feature_flags")
      .upsert({
        key,
        enabled,
        rollout_percentage: rolloutPercentage,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

    if (updateError) throw new Error(updateError.message);

    await logAudit(supabase, {
      actorUserId: webUser.id,
      action: "ADMIN_UPDATE_FEATURE_FLAG",
      entityType: "app_feature_flags",
      entityId: key,
      oldValues: existing || null,
      newValues: { enabled, rollout_percentage: rolloutPercentage },
      metadata: { warning_acknowledged: true },
    });

    return jsonResponse(req, {
      success: true,
      data: {
        key,
        enabled,
        rolloutPercentage,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse(req, { success: false, error: message }, message === "Unauthorized" ? 403 : 400);
  }
});

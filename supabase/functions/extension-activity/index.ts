import {
  createServiceClient,
  getClientIp,
  getUserAgent,
  jsonResponse,
  logExtensionActivity,
  readJson,
  requireMethod,
  requireString,
  requireExtensionNewAuthEnabled,
  validateExtensionAccessToken,
} from "../_shared/extension-session.ts";

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    await requireExtensionNewAuthEnabled(supabase);
    const context = await validateExtensionAccessToken(supabase, req);
    const body = await readJson(req);
    const eventType = requireString(body, "eventType");
    const severity = typeof body.severity === "string" ? body.severity : "info";
    const featureKey = typeof body.featureKey === "string" ? body.featureKey : null;
    const requestId = typeof body.requestId === "string" ? body.requestId : null;
    const metadata = typeof body.metadata === "object" && body.metadata !== null ? body.metadata as Record<string, unknown> : {};

    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const { count } = await supabase
      .from("extension_activity_logs")
      .select("id", { count: "exact", head: true })
      .eq("session_id", context.session.id)
      .gte("created_at", since);

    if ((count ?? 0) > 120) {
      return jsonResponse({ success: false, error: "Rate limit exceeded" }, 429);
    }

    await logExtensionActivity(supabase, {
      deviceId: context.device.id,
      sessionId: context.session.id,
      workspaceId: context.workspace.id,
      userId: context.profile.id,
      eventType,
      severity,
      featureKey,
      requestId,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, 401);
  }
});

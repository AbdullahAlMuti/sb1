import {
  createSessionTokens,
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
  requireExtensionNewAuthEnabled,
  sha256,
  verifyWorkspaceMembership,
} from "../_shared/extension-session.ts";

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    await requireExtensionNewAuthEnabled(supabase);
    const body = await readJson(req);
    const grantToken = typeof body.grantToken === "string" ? body.grantToken.trim() : "";
    const connectToken = typeof body.connectToken === "string" ? body.connectToken.trim() : "";
    const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";

    let redeemContext:
      | {
          grantId: string | null;
          requestId: string | null;
          deviceId: string;
          workspaceId: string;
          userId: string;
        }
      | null = null;

    if (grantToken) {
      const { data: grant } = await supabase
        .from("extension_session_grants")
        .select("*")
        .eq("grant_token_hash", await sha256(grantToken))
        .maybeSingle();

      if (!grant) throw new Error("Invalid session grant");
      if (grant.status !== "pending") throw new Error("Session grant is not pending");
      if (isExpired(grant.expires_at)) throw new Error("Session grant expired");

      redeemContext = {
        grantId: grant.id,
        requestId: grant.request_id,
        deviceId: grant.device_id,
        workspaceId: grant.workspace_id,
        userId: grant.user_id,
      };
    } else {
      if (!connectToken || !clientSecret) throw new Error("grantToken or connectToken/clientSecret is required");

      const { data: requestRow } = await supabase
        .from("extension_pairing_codes")
        .select("*")
        .eq("connect_token_hash", await sha256(connectToken))
        .eq("client_secret_hash", await sha256(clientSecret))
        .maybeSingle();

      if (!requestRow) throw new Error("Invalid connect token");
      if (requestRow.status !== "approved") throw new Error("Connect request is not approved");
      if (isExpired(requestRow.expires_at)) throw new Error("Connect request expired");
      if (!requestRow.device_id || !requestRow.approved_by_user_id || !requestRow.approved_workspace_id) {
        throw new Error("Approved connect request is incomplete");
      }

      redeemContext = {
        grantId: null,
        requestId: requestRow.id,
        deviceId: requestRow.device_id,
        workspaceId: requestRow.approved_workspace_id,
        userId: requestRow.approved_by_user_id,
      };
    }

    if (!redeemContext) throw new Error("Invalid redeem request");

    const { data: device } = await supabase.from("extension_devices").select("*").eq("id", redeemContext.deviceId).maybeSingle();
    if (!device) throw new Error("Extension device not found");
    if (device.status !== "active") throw new Error("Extension device is not active");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_active, account_status")
      .eq("id", redeemContext.userId)
      .maybeSingle();
    if (!profile) throw new Error("User profile not found");
    if (profile.is_active === false || profile.account_status === "Suspended" || profile.account_status === "Banned") {
      throw new Error("User account is not active");
    }

    await verifyWorkspaceMembership(supabase, redeemContext.userId, redeemContext.workspaceId);

    const tokenSet = await createSessionTokens(supabase, {
      deviceId: redeemContext.deviceId,
      workspaceId: redeemContext.workspaceId,
      userId: redeemContext.userId,
      requestId: redeemContext.requestId,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { redeemed_from_grant_id: redeemContext.grantId },
    });

    if (redeemContext.grantId) {
      await supabase
        .from("extension_session_grants")
        .update({ status: "redeemed", used_at: new Date().toISOString() })
        .eq("id", redeemContext.grantId);
    }

    if (redeemContext.requestId) {
      await supabase
        .from("extension_pairing_codes")
        .update({ status: "used", used_at: new Date().toISOString() })
        .eq("id", redeemContext.requestId);
    }

    await logExtensionActivity(supabase, {
      deviceId: redeemContext.deviceId,
      sessionId: tokenSet.session.id,
      workspaceId: redeemContext.workspaceId,
      userId: redeemContext.userId,
      eventType: "extension_token_redeemed",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { grant_id: redeemContext.grantId, request_id: redeemContext.requestId },
    });
    await logAudit(supabase, {
      actorUserId: redeemContext.userId,
      action: "EXTENSION_TOKEN_REDEEMED",
      entityType: "extension_session",
      entityId: tokenSet.session.id,
      newValues: { device_id: redeemContext.deviceId, workspace_id: redeemContext.workspaceId },
    });

    return jsonResponse({
      success: true,
      tokenType: "Bearer",
      accessToken: tokenSet.accessToken,
      accessTokenExpiresAt: tokenSet.accessTokenExpiresAt,
      refreshToken: tokenSet.refreshToken,
      refreshTokenExpiresAt: tokenSet.refreshTokenExpiresAt,
      sessionId: tokenSet.session.id,
      deviceId: redeemContext.deviceId,
      workspaceId: redeemContext.workspaceId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, 401);
  }
});

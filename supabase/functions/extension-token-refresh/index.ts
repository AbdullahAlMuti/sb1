import {
  addSeconds,
  ACCESS_TOKEN_TTL_SECONDS,
  createOpaqueToken,
  createServiceClient,
  getClientIp,
  getUserAgent,
  isExpired,
  jsonResponse,
  logAudit,
  logExtensionActivity,
  readJson,
  REFRESH_TOKEN_TTL_SECONDS,
  requireMethod,
  requireString,
  requireExtensionNewAuthEnabled,
  revokeSession,
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
    const refreshToken = requireString(body, "refreshToken");
    const refreshTokenHash = await sha256(refreshToken);

    const { data: refreshRow } = await supabase
      .from("extension_session_refresh_tokens")
      .select("*")
      .eq("token_hash", refreshTokenHash)
      .maybeSingle();

    if (!refreshRow) throw new Error("Invalid refresh token");

    const { data: session } = await supabase
      .from("extension_sessions")
      .select("*")
      .eq("id", refreshRow.session_id)
      .maybeSingle();

    if (!session) throw new Error("Extension session not found");

    const isReplay =
      refreshRow.used_at ||
      refreshRow.revoked_at ||
      refreshRow.id !== session.current_refresh_token_id;

    if (isReplay) {
      await supabase
        .from("extension_session_refresh_tokens")
        .update({ replay_detected_at: new Date().toISOString() })
        .eq("id", refreshRow.id);
      await revokeSession(supabase, session.id, "refresh_token_replay_detected");
      await supabase.from("extension_sessions").update({ status: "replay_detected" }).eq("id", session.id);
      await logExtensionActivity(supabase, {
        deviceId: session.device_id,
        sessionId: session.id,
        workspaceId: session.workspace_id,
        userId: session.user_id,
        eventType: "extension_refresh_replay_detected",
        severity: "critical",
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        metadata: { refresh_token_id: refreshRow.id },
      });
      await logAudit(supabase, {
        actorUserId: session.user_id,
        action: "EXTENSION_REFRESH_REPLAY_DETECTED",
        entityType: "extension_session",
        entityId: session.id,
        metadata: { refresh_token_id: refreshRow.id },
      });
      throw new Error("Refresh token replay detected");
    }

    if (refreshRow.revoked_at || isExpired(refreshRow.expires_at)) throw new Error("Refresh token expired");
    if (session.status !== "active") throw new Error("Extension session is not active");

    const { data: device } = await supabase
      .from("extension_devices")
      .select("*")
      .eq("id", session.device_id)
      .maybeSingle();
    if (!device || device.status !== "active") throw new Error("Extension device is not active");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_active, account_status")
      .eq("id", session.user_id)
      .maybeSingle();
    if (!profile) throw new Error("User profile not found");
    if (profile.is_active === false || profile.account_status === "Suspended" || profile.account_status === "Banned") {
      throw new Error("User account is not active");
    }

    await verifyWorkspaceMembership(supabase, session.user_id, session.workspace_id);

    const accessToken = createOpaqueToken("ssat");
    const nextRefreshToken = createOpaqueToken("ssrt");
    const accessTokenExpiresAt = addSeconds(ACCESS_TOKEN_TTL_SECONDS);
    const refreshTokenExpiresAt = addSeconds(REFRESH_TOKEN_TTL_SECONDS);

    const { data: nextRefreshRow, error: nextRefreshError } = await supabase
      .from("extension_session_refresh_tokens")
      .insert({
        session_id: session.id,
        device_id: session.device_id,
        token_hash: await sha256(nextRefreshToken),
        token_family_id: session.refresh_token_family_id,
        parent_token_id: refreshRow.id,
        expires_at: refreshTokenExpiresAt,
      })
      .select("*")
      .single();

    if (nextRefreshError || !nextRefreshRow) throw new Error(nextRefreshError?.message || "Failed to rotate refresh token");

    await supabase
      .from("extension_session_refresh_tokens")
      .update({ used_at: new Date().toISOString(), replaced_by_token_id: nextRefreshRow.id })
      .eq("id", refreshRow.id);

    await supabase
      .from("extension_sessions")
      .update({
        access_token_hash: await sha256(accessToken),
        access_token_expires_at: accessTokenExpiresAt,
        current_refresh_token_id: nextRefreshRow.id,
        last_seen_at: new Date().toISOString(),
        ip_address: getClientIp(req),
        user_agent: getUserAgent(req),
      })
      .eq("id", session.id);

    await logExtensionActivity(supabase, {
      deviceId: session.device_id,
      sessionId: session.id,
      workspaceId: session.workspace_id,
      userId: session.user_id,
      eventType: "extension_token_refreshed",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { previous_refresh_token_id: refreshRow.id, next_refresh_token_id: nextRefreshRow.id },
    });

    return jsonResponse({
      success: true,
      tokenType: "Bearer",
      accessToken,
      accessTokenExpiresAt,
      refreshToken: nextRefreshToken,
      refreshTokenExpiresAt,
      sessionId: session.id,
      deviceId: session.device_id,
      workspaceId: session.workspace_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, 401);
  }
});

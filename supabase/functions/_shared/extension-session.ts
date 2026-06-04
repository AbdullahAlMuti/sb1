import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const CONNECT_REQUEST_TTL_SECONDS = 10 * 60;
export const SESSION_GRANT_TTL_SECONDS = 5 * 60;

export type JsonRecord = Record<string, unknown>;

export function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function requireMethod(req: Request, allowed: string[]): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (!allowed.includes(req.method)) {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }
  return null;
}

export async function readJson(req: Request): Promise<JsonRecord> {
  if (req.method === "GET") return {};
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export function getAuthToken(req: Request): string | null {
  const bearer = getBearerToken(req);
  if (bearer) return bearer;
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) return apiKey.trim();
  return null;
}

export function getClientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip")
  );
}

export function getUserAgent(req: Request): string | null {
  return req.headers.get("user-agent");
}

export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export function addSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function isExpired(value: string | null | undefined): boolean {
  if (!value) return true;
  return new Date(value).getTime() <= Date.now();
}

export function requireString(body: JsonRecord, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

export function optionalString(body: JsonRecord, field: string): string | null {
  const value = body[field];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function createOpaqueToken(prefix: string): string {
  return `${prefix}_${base64Url(randomBytes(32))}`;
}

export async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return base64Url(new Uint8Array(digest));
}

export async function verifyWebUser(supabase: SupabaseClient, req: Request) {
  const token = getBearerToken(req);
  if (!token) throw new Error("Missing authorization");

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid web session");
  return data.user;
}

export async function isAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"]);

  if (error) return false;
  return (data || []).length > 0;
}

export async function ensureDefaultWorkspace(supabase: SupabaseClient, userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_active, account_status, default_workspace_id, plan_id, credits")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) throw new Error("User profile not found");

  if (profile.default_workspace_id) {
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", profile.default_workspace_id)
      .maybeSingle();

    if (workspace) {
      await ensureWorkspaceMembership(supabase, workspace.id, userId, "owner");
      return { profile, workspace };
    }
  }

  const { data: existingWorkspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_user_id", userId)
    .is("slug", null)
    .maybeSingle();

  if (existingWorkspace) {
    await ensureWorkspaceMembership(supabase, existingWorkspace.id, userId, "owner");
    if (!profile.default_workspace_id) {
      await supabase.from("profiles").update({ default_workspace_id: existingWorkspace.id }).eq("id", userId);
    }
    return { profile: { ...profile, default_workspace_id: existingWorkspace.id }, workspace: existingWorkspace };
  }

  const { data: insertedWorkspace, error: insertError } = await supabase
    .from("workspaces")
    .insert({
      owner_user_id: userId,
      name: "Default Workspace",
      slug: null,
      status: "active",
      metadata: { created_by: "extension_session_foundation" },
    })
    .select("*")
    .single();

  if (insertError || !insertedWorkspace) throw new Error(insertError?.message || "Failed to create workspace");

  await ensureWorkspaceMembership(supabase, insertedWorkspace.id, userId, "owner");
  await supabase.from("profiles").update({ default_workspace_id: insertedWorkspace.id }).eq("id", userId);
  return { profile: { ...profile, default_workspace_id: insertedWorkspace.id }, workspace: insertedWorkspace };
}

export async function ensureWorkspaceMembership(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  role = "owner",
) {
  await supabase
    .from("workspace_members")
    .upsert(
      { workspace_id: workspaceId, user_id: userId, role, status: "active" },
      { onConflict: "workspace_id,user_id" },
    );
}

export async function verifyWorkspaceMembership(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
) {
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .neq("status", "deleted")
    .maybeSingle();

  if (!workspace) throw new Error("Workspace not found");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership && workspace.owner_user_id !== userId) {
    throw new Error("User does not belong to workspace");
  }

  return { workspace, membership };
}

export async function logAudit(
  supabase: SupabaseClient,
  args: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValues?: JsonRecord | null;
    newValues?: JsonRecord | null;
    metadata?: JsonRecord;
  },
) {
  try {
    await supabase.from("audit_logs").insert({
      user_id: args.actorUserId ?? null,
      action: args.action,
      entity_type: args.entityType,
      entity_id: args.entityId ?? null,
      old_values: args.oldValues ?? null,
      new_values: args.newValues ?? null,
      metadata: args.metadata ?? {},
    });
  } catch (error) {
    console.error("[extension-session] audit log failed", error);
  }
}

export async function logExtensionActivity(
  supabase: SupabaseClient,
  args: {
    deviceId?: string | null;
    sessionId?: string | null;
    workspaceId?: string | null;
    userId?: string | null;
    eventType: string;
    severity?: string;
    featureKey?: string | null;
    requestId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: JsonRecord;
  },
) {
  try {
    await supabase.from("extension_activity_logs").insert({
      device_id: args.deviceId ?? null,
      session_id: args.sessionId ?? null,
      workspace_id: args.workspaceId ?? null,
      user_id: args.userId ?? null,
      event_type: args.eventType,
      severity: args.severity ?? "info",
      feature_key: args.featureKey ?? null,
      request_id: args.requestId ?? null,
      ip_address: args.ipAddress ?? null,
      user_agent: args.userAgent ?? null,
      metadata: args.metadata ?? {},
    });
  } catch (error) {
    console.error("[extension-session] activity log failed", error);
  }
}

export async function getFeatureFlags(supabase: SupabaseClient): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from("app_feature_flags")
    .select("key, enabled, rollout_percentage, config");

  const flags: Record<string, unknown> = {};
  for (const flag of data || []) {
    flags[flag.key] = {
      enabled: flag.enabled,
      rolloutPercentage: flag.rollout_percentage,
      config: flag.config ?? {},
    };
  }
  return flags;
}

export async function isFeatureEnabled(supabase: SupabaseClient, key: string): Promise<boolean> {
  const { data } = await supabase
    .from("app_feature_flags")
    .select("enabled, rollout_percentage")
    .eq("key", key)
    .maybeSingle();

  return Boolean(data?.enabled) && Number(data?.rollout_percentage ?? 0) > 0;
}

export async function requireExtensionNewAuthEnabled(supabase: SupabaseClient) {
  const enabled = await isFeatureEnabled(supabase, "extension_new_auth_enabled");
  if (!enabled) throw new Error("New extension authentication is disabled");
}

export async function createSessionTokens(
  supabase: SupabaseClient,
  args: {
    deviceId: string;
    workspaceId: string;
    userId: string;
    requestId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: JsonRecord;
  },
) {
  const accessToken = createOpaqueToken("ssat");
  const refreshToken = createOpaqueToken("ssrt");
  const accessTokenHash = await sha256(accessToken);
  const refreshTokenHash = await sha256(refreshToken);
  const accessTokenExpiresAt = addSeconds(ACCESS_TOKEN_TTL_SECONDS);
  const refreshTokenExpiresAt = addSeconds(REFRESH_TOKEN_TTL_SECONDS);
  const familyId = crypto.randomUUID();

  const { data: session, error: sessionError } = await supabase
    .from("extension_sessions")
    .insert({
      device_id: args.deviceId,
      workspace_id: args.workspaceId,
      user_id: args.userId,
      access_token_hash: accessTokenHash,
      access_token_expires_at: accessTokenExpiresAt,
      refresh_token_family_id: familyId,
      status: "active",
      ip_address: args.ipAddress,
      user_agent: args.userAgent,
      last_seen_at: new Date().toISOString(),
      metadata: {
        ...(args.metadata ?? {}),
        request_id: args.requestId ?? null,
      },
    })
    .select("*")
    .single();

  if (sessionError || !session) throw new Error(sessionError?.message || "Failed to create extension session");

  const { data: refreshRow, error: refreshError } = await supabase
    .from("extension_session_refresh_tokens")
    .insert({
      session_id: session.id,
      device_id: args.deviceId,
      token_hash: refreshTokenHash,
      token_family_id: familyId,
      expires_at: refreshTokenExpiresAt,
    })
    .select("*")
    .single();

  if (refreshError || !refreshRow) {
    await supabase.from("extension_sessions").update({ status: "revoked", revoke_reason: "refresh_token_insert_failed" }).eq("id", session.id);
    throw new Error(refreshError?.message || "Failed to create refresh token");
  }

  await supabase
    .from("extension_sessions")
    .update({ current_refresh_token_id: refreshRow.id })
    .eq("id", session.id);

  return {
    session: { ...session, current_refresh_token_id: refreshRow.id },
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  };
}

export async function validateExtensionAccessToken(supabase: SupabaseClient, req: Request) {
  const accessToken = getBearerToken(req);
  if (!accessToken) throw new Error("Missing extension access token");

  const accessTokenHash = await sha256(accessToken);
  const { data: session, error: sessionError } = await supabase
    .from("extension_sessions")
    .select("*")
    .eq("access_token_hash", accessTokenHash)
    .maybeSingle();

  if (sessionError || !session) throw new Error("Invalid extension access token");
  if (session.status !== "active") throw new Error("Extension session is not active");
  if (isExpired(session.access_token_expires_at)) {
    throw new Error("Extension access token expired");
  }

  const { data: device } = await supabase
    .from("extension_devices")
    .select("*")
    .eq("id", session.device_id)
    .maybeSingle();

  if (!device) throw new Error("Extension device not found");
  if (!["active", "pending"].includes(device.status)) throw new Error("Extension device is not allowed");
  if (device.status !== "active") throw new Error("Extension device is not approved");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_active, account_status, plan_id, credits")
    .eq("id", session.user_id)
    .maybeSingle();

  if (!profile) throw new Error("User profile not found");
  if (profile.is_active === false || profile.account_status === "Suspended" || profile.account_status === "Banned") {
    throw new Error("User account is not active");
  }

  const { workspace } = await verifyWorkspaceMembership(supabase, session.user_id, session.workspace_id);

  await supabase
    .from("extension_sessions")
    .update({ last_seen_at: new Date().toISOString(), ip_address: getClientIp(req), user_agent: getUserAgent(req) })
    .eq("id", session.id);

  await supabase
    .from("extension_devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  return { session, device, profile, workspace };
}

export async function revokeSession(
  supabase: SupabaseClient,
  sessionId: string,
  reason: string,
  revokedBy?: string | null,
) {
  await supabase
    .from("extension_sessions")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy ?? null,
      revoke_reason: reason,
    })
    .eq("id", sessionId);

  await supabase
    .from("extension_session_refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .is("revoked_at", null);
}

export async function getSubscriptionSnapshot(supabase: SupabaseClient, userId: string, workspaceId: string) {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: userPlan } = await supabase
    .from("user_plans")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const planId = subscription?.plan_id || userPlan?.plan_id;
  let plan = null;
  if (planId) {
    const { data } = await supabase.from("plans").select("*").eq("id", planId).maybeSingle();
    plan = data;
  }

  return {
    subscription: subscription || {
      status: userPlan?.status || "unknown",
      current_period_end: userPlan?.current_period_end || null,
    },
    userPlan,
    plan: plan || null,
  };
}

export type ResolvedAuthContext = {
  authMode: "legacy_jwt" | "extension_session";
  userId: string;
  workspaceId: string | null;
  deviceId?: string;
  sessionId?: string;
  profile?: any;
  workspace?: any;
};

export async function resolveExtensionOrLegacyAuth(
  supabase: SupabaseClient,
  req: Request
): Promise<ResolvedAuthContext> {
  const token = getAuthToken(req);
  if (!token) throw new Error("Missing authorization");

  // Strictly check token format for routing
  if (token.startsWith("ssat_")) {
    // Treat as new extension session token
    // We must pass a mock Request because validateExtensionAccessToken uses getBearerToken internally, 
    // but the token might be in x-api-key. So we inject it into the Authorization header to reuse the logic.
    const mockReq = new Request(req.url, {
      method: req.method,
      headers: new Headers(req.headers),
    });
    mockReq.headers.set("Authorization", `Bearer ${token}`);

    const { session, device, profile, workspace } = await validateExtensionAccessToken(supabase, mockReq);

    await logExtensionActivity(supabase, {
      deviceId: device.id,
      sessionId: session.id,
      workspaceId: workspace.id,
      userId: profile.id,
      eventType: "extension_api_called",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: { path: new URL(req.url).pathname },
    });

    return {
      authMode: "extension_session",
      userId: profile.id,
      workspaceId: workspace.id,
      deviceId: device.id,
      sessionId: session.id,
      profile,
      workspace,
    };
  } else {
    // Treat as legacy Supabase JWT
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new Error("Invalid legacy auth token");

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.is_active === false || profile?.account_status === "Suspended" || profile?.account_status === "Banned") {
      throw new Error("User account is not active");
    }

    let workspaceId = profile?.default_workspace_id || null;
    let workspace = null;

    if (!workspaceId) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_user_id", data.user.id)
        .is("slug", null)
        .maybeSingle();
      if (ws) {
        workspaceId = ws.id;
        workspace = ws;
      }
    } else {
      const { data: ws } = await supabase.from("workspaces").select("*").eq("id", workspaceId).maybeSingle();
      if (ws) workspace = ws;
    }

    return {
      authMode: "legacy_jwt",
      userId: data.user.id,
      workspaceId,
      profile,
      workspace,
    };
  }
}

export async function requireFeatureEntitlement(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string | null,
  featureKey: string
) {
  let overrideQuery = supabase
    .from("feature_overrides")
    .select("enabled, expires_at")
    .eq("feature_key", featureKey);

  overrideQuery = workspaceId
    ? overrideQuery.or(`user_id.eq.${userId},workspace_id.eq.${workspaceId}`)
    : overrideQuery.eq("user_id", userId);

  const { data: overrides } = await overrideQuery;
  for (const override of overrides || []) {
    if (override.expires_at && new Date(override.expires_at).getTime() <= Date.now()) continue;
    if (override.enabled === false) return false;
    if (override.enabled === true) return true;
  }

  if (!workspaceId) return false;

  const { subscription, userPlan, plan } = await getSubscriptionSnapshot(supabase, userId, workspaceId);

  // If sub is active or trialing
  const isActive = subscription.status === "active" || subscription.status === "trialing" || userPlan?.status === "active";
  if (!isActive) return false;

  if (!plan || !plan.features) return false;

  const { data: entitlement } = await supabase
    .from("feature_entitlements")
    .select("enabled")
    .eq("feature_key", featureKey)
    .eq("plan_id", plan.id)
    .maybeSingle();

  if (entitlement) return Boolean(entitlement.enabled);

  const features = plan.features as any;
  if (Array.isArray(features)) return features.includes(featureKey);
  return Boolean(features[featureKey]);
}

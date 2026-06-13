import {
  corsHeaders,
  createServiceClient,
  getFeatureFlags,
  getSubscriptionSnapshot,
  jsonResponse,
  logExtensionActivity,
  requireMethod,
  requireExtensionNewAuthEnabled,
  validateExtensionAccessToken,
} from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

function getLimits(plan: Record<string, unknown> | null, userPlan: Record<string, unknown> | null) {
  const overrides = (userPlan?.admin_override_limits ?? {}) as Record<string, number>;
  const value = (key: string, fallback = 0) => overrides[key] ?? Number(plan?.[key] ?? fallback);
  return {
    creditsPerMonth: value("credits_per_month", 0),
    maxListings: value("max_listings", 10),
    maxAutoOrders: value("max_auto_orders", 0),
    maxSeoTitles: value("max_seo_titles", 0),
    maxSeoDescriptions: value("max_seo_descriptions", 0),
  };
}

Deno.serve(async (req) => {
  const methodResponse = requireMethod(req, ["GET", "POST"]);
  if (methodResponse) return methodResponse;

  const supabase = createServiceClient();
  try {
    const ipLimit = await checkRateLimit(supabase, {
      bucket: "extension-bootstrap:ip",
      key: getClientIp(req),
      limit: 120,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    await requireExtensionNewAuthEnabled(supabase);
    const context = await validateExtensionAccessToken(supabase, req);
    const userLimit = await checkRateLimit(supabase, {
      bucket: "extension-bootstrap:user",
      key: context.session.user_id,
      limit: 120,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    const flags = await getFeatureFlags(supabase);
    const { subscription, userPlan, plan } = await getSubscriptionSnapshot(
      supabase,
      context.session.user_id,
      context.session.workspace_id,
    );

    const { data: ebayConnection } = await supabase
      .from("ebay_connections")
      .select("id, status, ebay_user_id, ebay_username, scopes, token_storage_status, access_token_expires_at, last_verified_at, last_error")
      .eq("workspace_id", context.session.workspace_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: entitlements } = await supabase
      .from("feature_entitlements")
      .select("feature_key, enabled, limits, requirements")
      .eq("plan_id", plan?.id ?? "00000000-0000-0000-0000-000000000000");

    const { data: overrides } = await supabase
      .from("feature_overrides")
      .select("feature_key, enabled, reason, expires_at")
      .or(`user_id.eq.${context.session.user_id},workspace_id.eq.${context.session.workspace_id}`);

    const enabledFeatures = new Set<string>();
    const disabledFeatures: { key: string; reason: string }[] = [];

    for (const row of entitlements || []) {
      if (row.enabled) enabledFeatures.add(row.feature_key);
      else disabledFeatures.push({ key: row.feature_key, reason: "Plan entitlement disabled" });
    }

    for (const row of overrides || []) {
      if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) continue;
      if (row.enabled) {
        enabledFeatures.add(row.feature_key);
      } else {
        enabledFeatures.delete(row.feature_key);
        disabledFeatures.push({ key: row.feature_key, reason: row.reason || "Feature disabled by override" });
      }
    }

    const subscriptionStatus = String(subscription?.status || "unknown");
    const requiredActions: string[] = [];
    const warnings: string[] = [];

    if (!["active", "trialing"].includes(subscriptionStatus)) {
      requiredActions.push("resolve_subscription");
    }
    if (!ebayConnection || ebayConnection.status !== "active") {
      requiredActions.push("connect_ebay");
    }
    if (context.device.migration_status !== "completed") {
      warnings.push("extension_auth_migration_not_completed");
    }

    await logExtensionActivity(supabase, {
      deviceId: context.device.id,
      sessionId: context.session.id,
      workspaceId: context.workspace.id,
      userId: context.profile.id,
      eventType: "extension_bootstrap",
      metadata: { subscription_status: subscriptionStatus },
    });

    return jsonResponse({
      success: true,
      user: {
        id: context.profile.id,
        email: context.profile.email,
        fullName: context.profile.full_name,
        accountStatus: context.profile.account_status || (context.profile.is_active ? "Active" : "Suspended"),
        credits: context.profile.credits ?? 0,
      },
      workspace: {
        id: context.workspace.id,
        name: context.workspace.name,
        status: context.workspace.status,
      },
      subscription: {
        status: subscriptionStatus,
        currentPeriodEnd: subscription?.current_period_end ?? null,
      },
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            displayName: plan.display_name,
          }
        : null,
      enabledFeatures: Array.from(enabledFeatures),
      disabledFeatures,
      usageLimits: getLimits(plan, userPlan),
      sellerConnections: {
        ebay: ebayConnection
          ? {
              id: ebayConnection.id,
              status: ebayConnection.status,
              username: ebayConnection.ebay_username,
              tokenStorageStatus: ebayConnection.token_storage_status,
              lastVerifiedAt: ebayConnection.last_verified_at,
              lastError: ebayConnection.last_error,
            }
          : { status: "not_connected" },
      },
      extensionDevice: {
        id: context.device.id,
        status: context.device.status,
        trustScore: context.device.trust_score,
        extensionVersion: context.device.extension_version,
        lastSeenAt: context.device.last_seen_at,
      },
      migrationStatus: context.device.migration_status,
      requiredActions,
      warnings,
      featureFlags: flags,
      versionCompatibility: {
        compatible: true,
        minimumVersion: "1.3.1",
        currentVersion: context.device.extension_version || null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, 401);
  }
});

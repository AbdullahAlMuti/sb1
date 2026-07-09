import { resolveExtensionCors } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


type Resource = "plans" | "plan_prices" | "plan_features";
type Action = "create" | "update" | "delete";

const ALLOWED_COLUMNS: Record<Resource, Set<string>> = {
  plans: new Set([
    "name",
    "display_name",
    "price_monthly",
    "price_yearly",
    "credits_per_month",
    "max_listings",
    "max_auto_orders",
    "features",
    "is_active",
    "stripe_price_id_monthly",
    "stripe_price_id_yearly",
    "stripe_price_id_one_time",
    "feature_flags",
    "sort_order",
    "is_trial",
    "is_popular",
    "trial_duration_days",
    "auto_orders_enabled",
    "seo_enabled",
    "max_seo_titles",
    "max_seo_descriptions",
    "order_reset_frequency",
    "slug",
    "short_description",
    "long_description",
    "best_for",
    "badge_text",
    "cta_text",
    "is_public",
    "trial_requires_card",
    "stripe_product_id",
    "archived_at",
  ]),
  plan_prices: new Set([
    "plan_id",
    "interval",
    "currency",
    "amount",
    "compare_at_amount",
    "stripe_price_id",
    "is_active",
    "updated_at",
  ]),
  plan_features: new Set([
    "plan_id",
    "group_name",
    "title",
    "description",
    "display_value",
    "included",
    "tooltip",
    "is_highlighted",
    "sort_order",
    "updated_at",
  ]),
};
const RESOURCE_NAMES = new Set<Resource>(["plans", "plan_prices", "plan_features"]);

function sanitizePayload(resource: Resource, payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const allowed = ALLOWED_COLUMNS[resource];
  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).filter(([key]) => allowed.has(key)),
  );
}

function isResource(value: unknown): value is Resource {
  return typeof value === "string" && RESOURCE_NAMES.has(value as Resource);
}

serve(async (req) => {
  const corsHeaders = resolveExtensionCors(req);
  function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json(500, { error: "Supabase env not configured" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "No authorization header" });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return json(401, { error: "Unauthorized" });
    }
    const adminId = userData.user.id;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .in("role", ["admin", "super_admin"]);

    if (rolesErr || !roles || roles.length === 0) {
      return json(403, { error: "Admin access required" });
    }

    const body = await req.json().catch(() => ({}));
    const resourceRaw = body.resource;
    const action = body.action as Action;
    const id = typeof body.id === "string" ? body.id : "";

    if (!isResource(resourceRaw)) return json(400, { error: "Invalid resource" });
    const resource = resourceRaw;
    if (!action || !["create", "update", "delete"].includes(action)) return json(400, { error: "Invalid action" });
    if ((action === "update" || action === "delete") && !id) return json(400, { error: "id is required" });

    const payload = sanitizePayload(resource, body.payload);
    if ((action === "create" || action === "update") && Object.keys(payload).length === 0) {
      return json(400, { error: "No valid fields provided" });
    }

    let oldValue: Record<string, unknown> | null = null;
    if (action === "update" || action === "delete") {
      const { data: existing, error: existingErr } = await supabaseAdmin
        .from(resource)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (existingErr) {
        console.error("admin-plan-config existing row lookup failed", existingErr);
        return json(500, { error: "Unable to load current record" });
      }
      if (!existing) return json(404, { error: "Record not found" });
      oldValue = existing;
    }

    let result: Record<string, unknown> | null = null;
    if (action === "create") {
      const { data, error } = await supabaseAdmin.from(resource).insert(payload).select("*").single();
      if (error) {
        console.error("admin-plan-config create failed", error);
        return json(500, { error: "Unable to create record" });
      }
      result = data;
    } else if (action === "update") {
      const { data, error } = await supabaseAdmin.from(resource).update(payload).eq("id", id).select("*").single();
      if (error) {
        console.error("admin-plan-config update failed", error);
        return json(500, { error: "Unable to update record" });
      }
      result = data;
    } else {
      const { error } = await supabaseAdmin.from(resource).delete().eq("id", id);
      if (error) {
        console.error("admin-plan-config delete failed", error);
        return json(500, { error: "Unable to delete record" });
      }
      result = oldValue;
    }

    const entityId = action === "create" ? String(result?.id ?? "") : id;
    const { error: auditErr } = await supabaseAdmin.from("audit_logs").insert({
      user_id: adminId,
      action: `ADMIN_${resource.toUpperCase()}_${action.toUpperCase()}`,
      entity_type: resource,
      entity_id: entityId,
      old_values: oldValue,
      new_values: action === "delete" ? null : result,
      metadata: {
        resource,
        action,
      },
    });
    if (auditErr) console.error("admin-plan-config audit log failed", auditErr);

    return json(200, { success: true, data: result, auditLogged: !auditErr });
  } catch (error) {
    console.error("admin-plan-config error", error);
    return json(500, { error: "Unable to update plan configuration" });
  }
});

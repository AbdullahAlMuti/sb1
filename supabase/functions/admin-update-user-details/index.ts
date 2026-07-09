import { resolveExtensionCors } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


serve(async (req) => {
  const corsHeaders = resolveExtensionCors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminRoles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"]);

    if (roleError || !adminRoles || adminRoles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { userId, updates } = body;

    if (!userId || !updates) {
      return new Response(
        JSON.stringify({ error: "User ID and updates are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow specific fields to be updated
    const allowedFields = [
      'platform_access',
      'onboarding_status',
      'account_status',
      'ebay_connected',
      'shopify_connected',
      'admin_notes',
      'is_active'
    ];

    const safeUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    }

    // Handle is_active sync if account_status changes
    if (safeUpdates.account_status !== undefined) {
      safeUpdates.is_active = safeUpdates.account_status === 'Active';
    }

    // Get original profile for audit log
    const { data: originalProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!originalProfile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(safeUpdates)
      .eq("id", userId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      action: "USER_DETAILS_UPDATED",
      entity_type: "user",
      entity_id: userId,
      old_values: Object.keys(safeUpdates).reduce((acc, key) => ({ ...acc, [key]: originalProfile[key] }), {}),
      new_values: safeUpdates,
      metadata: {
        updated_by: user.email
      }
    });

    return new Response(
      JSON.stringify({ success: true, message: "User details updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

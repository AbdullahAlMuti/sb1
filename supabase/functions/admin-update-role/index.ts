import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsHeaders } from "../_shared/cors.ts";


const VALID_ROLES = ["user", "admin", "super_admin"] as const;
type AppRole = typeof VALID_ROLES[number];

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  // Handle CORS preflight
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

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin (they might have multiple roles)
    const { data: adminRoles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"]);

    if (roleError || !adminRoles || adminRoles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required", details: roleError }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const isCallerSuperAdmin = adminRoles.some((r) => r.role === "super_admin");

    // Get the user ID and new role to update from request body
    const { userId, newRole } = await req.json();

    if (!userId || !newRole) {
      return new Response(
        JSON.stringify({ error: "User ID and newRole are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_ROLES.includes(newRole)) {
      return new Response(
        JSON.stringify({ error: "Invalid role specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetNewRole = newRole as AppRole;

    const { data: targetUser, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetUserError || !targetUser?.user) {
      return new Response(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only super admins may grant super admin.
    if (targetNewRole === "super_admin" && !isCallerSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Only a super admin can grant the super admin role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check target roles before deleting anything.
    const { data: targetRoles, error: targetRolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (targetRolesError) {
      return new Response(
        JSON.stringify({ error: targetRolesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oldRoles = (targetRoles || []).map((row) => row.role as AppRole);
    const targetIsSuperAdmin = oldRoles.includes("super_admin");

    // Only super admins may modify existing super admins.
    if (targetIsSuperAdmin && !isCallerSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Cannot modify a super admin unless you are a super admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent modifying your own role to prevent accidental lockouts
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot modify your own role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetIsSuperAdmin && targetNewRole !== "super_admin") {
      const { count: superAdminCount, error: countError } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "super_admin");

      if (countError) {
        return new Response(
          JSON.stringify({ error: countError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if ((superAdminCount || 0) <= 1) {
        return new Response(
          JSON.stringify({ error: "Cannot remove the last super admin" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (oldRoles.length === 1 && oldRoles[0] === targetNewRole) {
      return new Response(
        JSON.stringify({ success: true, message: "User already has this role" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete all existing roles for the target user using Admin API to prevent multiple overlapping roles
    const { error: deleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error deleting old roles:", deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the new role
    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: targetNewRole,
      });

    if (insertError) {
      console.error("Error inserting new role:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetEmail = targetUser?.user?.email || "unknown";

    // Log the role change in audit_logs
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      action: "USER_ROLE_UPDATED",
      entity_type: "user",
      entity_id: userId,
      old_values: { roles: oldRoles },
      new_values: { role: targetNewRole },
      metadata: { 
        updated_user_email: targetEmail,
        new_role: targetNewRole,
        updated_by: user.email 
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: "User role updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in admin-update-role:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

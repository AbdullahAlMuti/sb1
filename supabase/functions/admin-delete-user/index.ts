import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsHeaders } from "../_shared/cors.ts";


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
      .in("role", ["admin"]);

    if (roleError || !adminRoles || adminRoles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user ID or user IDs to delete from request body
    const body = await req.json();
    const userIds: string[] = body.userIds 
      ? (Array.isArray(body.userIds) ? body.userIds : [body.userIds])
      : (body.userId ? [body.userId] : []);

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "User ID or User IDs are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];
    const errors = [];

    for (const id of userIds) {
      try {
        // Prevent self-deletion
        if (id === user.id) {
          errors.push({ id, error: "Cannot delete your own account" });
          continue;
        }

        // Get user email for audit log before deletion
        const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(id);
        const targetEmail = targetUser?.user?.email || "unknown";

        // Delete the user using Admin API
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (deleteError) {
          console.error(`Error deleting user ${id}:`, deleteError.message);
          errors.push({ id, error: `Failed to delete user: ${deleteError.message}` });
          continue;
        }

        // Log the deletion in audit_logs
        await supabaseAdmin.from("audit_logs").insert({
          user_id: user.id,
          action: "USER_DELETED",
          entity_type: "user",
          entity_id: id,
          metadata: { 
            deleted_user_email: targetEmail,
            deleted_by: user.email 
          },
        });

        results.push({ id, email: targetEmail });
      } catch (e: any) {
        errors.push({ id, error: e.message || "Unknown error" });
      }
    }

    if (results.length === 0 && errors.length > 0) {
      return new Response(
        JSON.stringify({ error: "Failed to delete any users", details: errors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${results.length} user(s)`, 
        deleted: results, 
        failed: errors.length > 0 ? errors : undefined 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in admin-delete-user:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

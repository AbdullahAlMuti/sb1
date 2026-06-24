import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get the authorization header to verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with user context to verify the token
    // NOTE: In Supabase Edge Functions, auth-js can throw AuthSessionMissingError if you use
    // session-based methods. Always validate the incoming Bearer token explicitly.
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);

    if (userError || !userData?.user?.id) {
      console.error("Token verification error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestingUserId = userData.user.id;

    // Create admin client with service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if requesting user is an admin
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUserId)
      .in("role", ["admin"]);

    if (rolesError || !adminRoles || adminRoles.length === 0) {
      console.error("Roles error or not admin:", rolesError);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user IDs from request body
    const { userIds } = await req.json();
    
    if (!userIds || !Array.isArray(userIds)) {
      return new Response(
        JSON.stringify({ error: "User IDs array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${requestingUserId} fetching verification status for ${userIds.length} users`);

    // Fetch users from auth.users using admin API
    const verificationStatuses: Record<string, boolean> = {};
    const userEmails: Record<string, string> = {};
    
    for (const userId of userIds) {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (userError) {
          console.error(`Error fetching user ${userId}:`, userError);
          verificationStatuses[userId] = false;
          userEmails[userId] = '';
        } else {
          verificationStatuses[userId] = userData.user.email_confirmed_at != null;
          userEmails[userId] = userData.user.email || '';
        }
      } catch (e) {
        console.error(`Error fetching user ${userId}:`, e);
        verificationStatuses[userId] = false;
        userEmails[userId] = '';
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        verificationStatuses,
        userEmails,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in admin-get-users-verification function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

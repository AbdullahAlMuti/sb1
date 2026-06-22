// trigger-marketing-deploy — admin-only. POSTs to the Vercel Deploy Hook so a newly
// published blog post is statically prerendered and goes live (~1-2 min). Best-effort:
// if the VERCEL_DEPLOY_HOOK_URL secret is not set, returns { triggered: false } with a
// reason instead of erroring, so publishing never fails on a missing hook.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsHeaders } from "../_shared/cors.ts";


function json(ch: Record<string,string>, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...ch, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json(corsHeaders, 500, { error: "Supabase env not configured" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(corsHeaders, 401, { error: "No authorization header" });
    const token = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json(corsHeaders, 401, { error: "Unauthorized" });

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "super_admin"]);
    if (!roles || roles.length === 0) return json(corsHeaders, 403, { error: "Admin access required" });

    const hookUrl = Deno.env.get("VERCEL_DEPLOY_HOOK_URL") ?? "";
    if (!hookUrl) {
      return json(corsHeaders, 200, { triggered: false, reason: "VERCEL_DEPLOY_HOOK_URL not configured" });
    }

    const res = await fetch(hookUrl, { method: "POST" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return json(corsHeaders, 200, { triggered: false, reason: `deploy hook returned ${res.status} ${text}`.trim() });
    }

    return json(corsHeaders, 200, { triggered: true });
  } catch (e) {
    console.error("trigger-marketing-deploy error:", e);
    return json(corsHeaders, 500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

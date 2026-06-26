/**
 * homepage-content — public GET endpoint for the marketing site.
 *
 * Reads the `homepage_content` table (scope='global') and returns the
 * structured JSON content. No auth required — this is a public read.
 * The admin app writes directly to the table via browser→Postgres (is_admin RLS).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsHeaders } from "../_shared/cors.ts";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = resolveCorsHeaders(req, { publicEndpoint: true, methods: ["GET", "OPTIONS"] });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = serviceClient();

    const { data, error } = await supabase
      .from("homepage_content")
      .select("content, version, updated_at")
      .eq("scope", "global")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return new Response(JSON.stringify({ error: "Content not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        content: data.content,
        version: data.version,
        updatedAt: data.updated_at,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          // Cache at CDN for 5 minutes; stale-while-revalidate for 1 hour.
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[homepage-content]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

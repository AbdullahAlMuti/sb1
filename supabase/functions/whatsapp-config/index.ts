// Lightweight config endpoint for WhatsApp Click-to-Chat.
// Exposes ONLY non-sensitive WhatsApp settings stored in admin_settings.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
import { resolveCorsHeaders } from "../_shared/cors.ts";


const KEYS = [
  "support_whatsapp_number",
  "sales_whatsapp_number",
  "order_whatsapp_number",
  "admin_whatsapp_number",
  "whatsapp_dashboard_enabled",
  "whatsapp_dashboard_template",
] as const;

function parseBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes";
  }
  if (typeof val === "number") return val === 1;
  return false;
}

Deno.serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceRole) {
      console.error("Missing backend env vars for whatsapp-config");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(url, serviceRole, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("admin_settings")
      .select("key,value")
      .in("key", [...KEYS]);

    if (error) {
      console.error("admin_settings select failed", error);
      return new Response(JSON.stringify({ error: "Failed to load settings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const map: Record<string, string | null> = {};
    for (const row of data ?? []) {
      map[row.key] = row.value ?? null;
    }

    const payload = {
      support_whatsapp_number: map.support_whatsapp_number ?? null,
      sales_whatsapp_number: map.sales_whatsapp_number ?? null,
      order_whatsapp_number: map.order_whatsapp_number ?? null,
      admin_whatsapp_number: map.admin_whatsapp_number ?? null,
      whatsapp_dashboard_enabled: parseBool(map.whatsapp_dashboard_enabled),
      whatsapp_dashboard_template: map.whatsapp_dashboard_template ?? null,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-config unexpected error", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

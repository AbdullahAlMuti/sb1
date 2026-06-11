import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const authHeader = req.headers.get("Authorization");

        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const { sku } = await req.json();
        if (!sku) {
            return new Response(JSON.stringify({ error: "SKU is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Clean SKU: remove "custom label" prefix if commonly used, or just trim
        // For now, simple trim.
        const cleanSku = sku.trim();

        // 1. Try matching directly in listings table by sku (parent SKU match)
        let { data, error } = await supabase
            .from("listings")
            .select("sku, amazon_url, amazon_asin")
            .eq("user_id", user.id)
            .eq("sku", cleanSku)
            .maybeSingle();

        // 2. If not found, look up in listing_variations (either by readable sku or legacy encoded sku)
        if (!data && !error) {
            let { data: varData, error: varError } = await supabase
                .from("listing_variations")
                .select("listing_id")
                .eq("user_id", user.id)
                .eq("sku", cleanSku)
                .maybeSingle();

            // If not found by readable variation SKU, check by legacy encoded SKU
            if (!varData && !varError) {
                const { data: varDataEncoded, error: varErrorEncoded } = await supabase
                    .from("listing_variations")
                    .select("listing_id")
                    .eq("user_id", user.id)
                    .eq("ebay_sku_encoded", cleanSku)
                    .maybeSingle();
                varData = varDataEncoded;
                varError = varErrorEncoded;
            }

            if (varData && !varError) {
                const { data: parentData, error: parentError } = await supabase
                    .from("listings")
                    .select("sku, amazon_url, amazon_asin")
                    .eq("user_id", user.id)
                    .eq("id", varData.listing_id)
                    .maybeSingle();
                
                data = parentData;
                error = parentError;
            } else if (varError) {
                error = varError;
            }
        }

        if (error) {
            console.error("Match error:", error);
            return new Response(JSON.stringify({ error: "Database error" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ found: !!data, listing: data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (e) {
        console.error("Internal error:", e);
        const message = e instanceof Error ? e.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("get-calculator-settings: Request received");

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("get-calculator-settings: No authorization header");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with the user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("get-calculator-settings: User authentication failed", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("get-calculator-settings: Fetching settings for user", user.id);

    // Fetch calculator settings for the user
    const { data: settings, error: settingsError } = await supabase
      .from("calculator_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) {
      console.error("get-calculator-settings: Error fetching settings", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return default values if no settings exist
    const defaultSettings = {
      tax_percent: 9.0,
      tracking_fee: 0.20,
      ebay_fee_percent: 20.0,
      promotional_fee_percent: 10.0,
      desired_profit_percent: 15.0,
    };

    const responseData = settings ? {
      tax_percent: Number(settings.tax_percent),
      tracking_fee: Number(settings.tracking_fee),
      ebay_fee_percent: Number(settings.ebay_fee_percent),
      promotional_fee_percent: Number(settings.promotional_fee_percent),
      desired_profit_percent: Number(settings.desired_profit_percent),
    } : defaultSettings;

    console.log("get-calculator-settings: Returning settings", responseData);

    return new Response(
      JSON.stringify({ success: true, settings: responseData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("get-calculator-settings: Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

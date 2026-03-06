import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept",
};

interface TitleGenerationRequest {
  title?: string;
  description?: string;
  category?: string;
  price?: string;
  brand?: string;
  specifications?: any;
  bulletPoints?: string[];
  provider?: "lovable" | "openai";
  test?: boolean;
}

interface RankedTitle {
  rank: string;
  title: string;
}

const DEFAULT_PROMPT = `Generate 3 distinct, keyword-optimized eBay titles (under 80 chars each).
Return ONLY a JSON object exactly like this:
{"titles":[{"rank":"best","title":"..."},{"rank":"recommended","title":"..."},{"rank":"powerful","title":"..."}]}

DATA:
Title: {title}
Brand: {brand}
Category: {category}
Bullet Points: {bulletPoints}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    // SECURITY: Authenticate user before processing
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[generate-titles] No auth header provided");
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create client with user's auth token to validate authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      console.error("[generate-titles] Auth error:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[generate-titles] User authenticated: ${user.id}`);

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.json();
    console.log("[generate-titles] Received body:", JSON.stringify(rawBody));

    // Handle both old format (productInfo) and new format (direct fields)
    const requestData: TitleGenerationRequest = rawBody.productInfo
      ? {
          title: rawBody.productInfo.title,
          description: rawBody.productInfo.description,
          category: rawBody.productInfo.category,
          brand: rawBody.productInfo.brand,
          bulletPoints:
            rawBody.productInfo.keywords || rawBody.productInfo.bulletPoints,
        }
      : rawBody;

    // SECURITY: Input validation and sanitization
    const title = String(requestData.title || "").slice(0, 500);
    const category = String(requestData.category || "").slice(0, 200);
    const brand = String(requestData.brand || "").slice(0, 200);
    // Limit to 3 bullet points for speed
    const bulletPoints = Array.isArray(requestData.bulletPoints)
      ? requestData.bulletPoints
          .slice(0, 3)
          .map((bp) => String(bp).slice(0, 200))
      : [];
    const provider = requestData.provider === "openai" ? "openai" : "lovable";
    const test = Boolean(requestData.test);

    console.log("Generating titles for:", {
      title: title.slice(0, 50),
      brand,
      category,
      provider,
    });

    // Default settings
    let promptTemplate = DEFAULT_PROMPT;
    let model = "gpt-4o-mini"; // Changed to ultra-fast model
    let adminApiKey = "";
    let apiProvider = "openai"; // default to openai
    let titleCount = 3;

    // Fetch AI settings from admin_settings (ext_* keys from AdminExtension page)
    try {
      const { data: settingsData } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", [
          "ext_ai_provider",
          "ext_ai_api_key",
          "ext_ai_model",
          "ext_title_prompt",
          "ext_title_count",
        ]);

      if (settingsData) {
        settingsData.forEach((item: { key: string; value: string | null }) => {
          if (item.key === "ext_ai_provider" && item.value) {
            apiProvider = item.value;
          }
          if (item.key === "ext_ai_model" && item.value) {
            model = item.value;
          }
          if (item.key === "ext_title_prompt" && item.value) {
            promptTemplate = item.value;
          }
          if (item.key === "ext_ai_api_key" && item.value) {
            adminApiKey = item.value;
          }
          if (item.key === "ext_title_count" && item.value) {
            titleCount = parseInt(item.value, 10) || 3;
          }
        });
      }
    } catch (dbError) {
      console.log(
        "Using default settings (admin_settings not available):",
        dbError,
      );
    }

    // Fallback if the user's config was still pointing to an old slow model or gpt-4o-mini
    if (model === "gpt-5-nano") {
      model = "gpt-4o-mini";
    }

    // Determine if we should use direct OpenAI or Lovable AI Gateway
    // Use direct OpenAI if provider is 'openai' and a valid API key is provided
    const useDirectOpenAI =
      apiProvider === "openai" &&
      adminApiKey &&
      adminApiKey.startsWith("sk-") &&
      adminApiKey.length > 20;

    console.log(
      `[generate-titles] Using ${useDirectOpenAI ? "Direct OpenAI" : "Lovable AI Gateway"} with model: ${model}`,
    );

    // Prepare data strings for prompt replacement
    const bulletsStr = bulletPoints.join("\n- ");

    // Replace placeholders in prompt
    const prompt = promptTemplate
      .replace(/{title}/g, title)
      .replace(/{category}/g, category)
      .replace(/{brand}/g, brand)
      .replace(/{bulletPoints}/g, bulletsStr);

    let responseContent = "";

    if (useDirectOpenAI) {
      // Use admin's OpenAI API key directly
      console.log(
        "[generate-titles] Calling OpenAI directly with admin API key",
      );

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model.startsWith("openai/")
              ? model.replace("openai/", "")
              : model,
            messages: [
              {
                role: "system",
                content:
                  `You are an expert eBay product title generator. You MUST follow ALL instructions in the user's prompt exactly. Do not add conversational filler. Always respond with valid JSON only, exactly matching the requested structure. You must generate EXACTLY ${titleCount} titles.`,
              },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            max_tokens: 800,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", response.status, errorText);

        if (response.status === 401) {
          throw new Error(
            "Invalid OpenAI API key. Please update your API key in Admin Settings.",
          );
        }
        if (response.status === 429) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "OpenAI rate limit exceeded. Please try again.",
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      responseContent = data.choices?.[0]?.message?.content || "";
    } else {
      // Fallback to Lovable AI Gateway
      if (!lovableApiKey) {
        console.error("LOVABLE_API_KEY not configured and no admin OpenAI key");
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "AI service not configured. Please add an OpenAI API key in Admin Settings.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log("[generate-titles] Using Lovable AI Gateway as fallback");

      const gatewayModel = model.startsWith("gpt") ? `openai/${model}` : model;

      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: gatewayModel,
            messages: [
              {
                role: "system",
                content:
                  `You are an expert eBay product title generator. Always respond with valid JSON only, no markdown or code blocks. Just the raw JSON object. You must generate EXACTLY ${titleCount} titles.`,
              },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            max_tokens: 800,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Lovable AI Gateway error:", response.status, errorText);

        if (response.status === 429) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Rate limit exceeded. Please try again in a moment.",
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({
              success: false,
              error:
                "AI credits exhausted. Please add an OpenAI API key in Admin Settings.",
            }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      responseContent = data.choices?.[0]?.message?.content || "";
    }

    console.log("AI response content:", responseContent);

    let aiResponse: RankedTitle[] = [];

    // Parse the JSON response
    try {
      // Remove any markdown code blocks if present
      const cleanContent = responseContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiResponse = parsed.titles || [];
        console.log("Parsed titles:", aiResponse);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.log("Raw content:", responseContent);

      // Fallback titles if parsing fails
      const baseTitle = title || "Product";
      aiResponse = Array.from({ length: titleCount }).map((_, i) => ({
        rank: i === 0 ? "best" : i === 1 ? "recommended" : "powerful",
        title: i === 0 
          ? `${brand ? brand + " " : ""}${baseTitle} - Premium Quality Free Shipping`
          : i === 1
          ? `${baseTitle}${category ? " " + category : ""} Brand New Top Rated`
          : `NEW ${baseTitle} ${brand ? brand : ""} Limited Stock Best Deal`,
      }));
    }

    // Handle case where aiResponse is still empty
    if (!Array.isArray(aiResponse) || aiResponse.length === 0) {
      const baseTitle = title || "Product";
      aiResponse = Array.from({ length: titleCount }).map((_, i) => ({
        rank: i === 0 ? "best" : i === 1 ? "recommended" : "powerful",
        title: i === 0 
          ? `${brand ? brand + " " : ""}${baseTitle} - Premium Quality Free Shipping`
          : i === 1
          ? `${baseTitle}${category ? " " + category : ""} Brand New Top Rated`
          : `NEW ${baseTitle} ${brand ? brand : ""} Limited Stock Best Deal`,
      }));
    }

    // Map AI response to ranked structure up to titleCount
    const rankedTitles = aiResponse.slice(0, titleCount).map((t, idx) => ({
      rank: t.rank || (idx === 0 ? "best" : idx === 1 ? "recommended" : "powerful"),
      title: t.title || t || "",
    }));

    // Format response for frontend compatibility
    const apiName = "openai";
    const titlesArray = rankedTitles.map((t) => t.title);

    return new Response(
      JSON.stringify({
        success: true,
        results: [
          {
            api: apiName,
            titles: titlesArray,
            success: true,
          },
        ],
        titles: rankedTitles,
        provider: useDirectOpenAI ? "openai" : "lovable",
        model,
        test,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in generate-titles function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate titles. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveExtensionOrLegacyAuth, createServiceClient } from '../_shared/extension-session.ts';
import { checkRateLimit, getClientIp, rateLimitResponse } from '../_shared/rate-limit.ts';
import { enforceActiveSubscription } from '../_shared/plan-middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const ipLimit = await checkRateLimit(supabase, {
      bucket: 'ai-product-research:ip',
      key: getClientIp(req),
      limit: 20,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    const authContext = await resolveExtensionOrLegacyAuth(supabase, req);
    const userId = authContext.userId;

    const blockResponse = await enforceActiveSubscription(supabase, userId);
    if (blockResponse) return blockResponse;

    const userLimit = await checkRateLimit(supabase, {
      bucket: 'ai-product-research:user',
      key: userId,
      limit: 30,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    console.log(`[ai-product-research] User authenticated: ${userId} (${authContext.authMode})`);

    // Server-side feature flag check
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_id')
      .eq('id', userId)
      .single();

    if (profile?.plan_id) {
      const { data: plan } = await supabase
        .from('plans')
        .select('feature_flags')
        .eq('id', profile.plan_id)
        .single();

      const flags = (plan?.feature_flags ?? {}) as Record<string, unknown>;
      const enabled = flags['ai_product_research'];
      const hasAccess = typeof enabled === 'boolean' ? enabled : typeof enabled === 'number' ? enabled > 0 : Boolean(enabled);

      if (!hasAccess) {
        return new Response(JSON.stringify({ error: 'This feature requires an eligible plan.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'No active plan.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    
    // SECURITY: Input validation and sanitization
    const query = String(requestBody.query || '').slice(0, 500);
    const category = String(requestBody.category || '').slice(0, 200);
    const priceRange = String(requestBody.priceRange || '').slice(0, 100);
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing AI product research for: "${query.slice(0, 50)}", category: ${category || 'any'}, priceRange: ${priceRange || 'any'}`);

    const systemPrompt = `You are an expert eBay product research analyst specializing in dropshipping and arbitrage. Your job is to analyze product opportunities and provide actionable insights.

When given a product query, you should:
1. Identify profitable product opportunities in this niche
2. Analyze market demand and competition levels
3. Suggest specific products with estimated profit margins
4. Provide sourcing recommendations (Amazon, Walmart, AliExpress)
5. Highlight trending variations and seasonal considerations

Always respond with structured JSON containing exactly 5 product recommendations.`;

    const userPrompt = `Analyze the following product niche for eBay dropshipping opportunities:

Product/Niche: ${query}
${category ? `Category: ${category}` : ''}
${priceRange ? `Price Range: ${priceRange}` : ''}

Provide 5 specific product recommendations with the following JSON structure:
{
  "analysis": {
    "marketDemand": "high/medium/low",
    "competitionLevel": "high/medium/low",
    "profitPotential": "high/medium/low",
    "trendingStatus": "trending up/stable/trending down",
    "summary": "Brief 2-3 sentence summary of the niche"
  },
  "products": [
    {
      "title": "Specific product title",
      "estimatedSellPrice": 29.99,
      "estimatedSourcePrice": 15.99,
      "estimatedProfit": 8.00,
      "profitMargin": 27,
      "demandScore": 85,
      "competitionScore": 60,
      "sourceRecommendation": "Amazon/Walmart/AliExpress",
      "keyFeatures": ["feature1", "feature2"],
      "tips": "Brief selling tip"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received successfully");

    // Parse JSON from response (handle markdown code blocks)
    let parsedContent;
    try {
      // Remove markdown code blocks if present
      let jsonString = content;
      if (content.includes('```json')) {
        jsonString = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (content.includes('```')) {
        jsonString = content.replace(/```\n?/g, '');
      }
      parsedContent = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Return raw content if parsing fails
      parsedContent = { 
        analysis: { 
          summary: content,
          marketDemand: "medium",
          competitionLevel: "medium",
          profitPotential: "medium",
          trendingStatus: "stable"
        }, 
        products: [] 
      };
    }

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-product-research function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof Error && /(authorization|auth token|session)/i.test(error.message) ? 401 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

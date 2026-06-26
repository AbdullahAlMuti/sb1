import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveExtensionOrLegacyAuth, requireFeatureEntitlement, createServiceClient } from "../_shared/extension-session.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { resolveCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const ipLimit = await checkRateLimit(supabase, {
      bucket: 'test-ai-generation:ip',
      key: getClientIp(req),
      limit: 10,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    const authContext = await resolveExtensionOrLegacyAuth(supabase, req);
    const userLimit = await checkRateLimit(supabase, {
      bucket: 'test-ai-generation:user',
      key: authContext.userId,
      limit: 10,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    // Entitlement gate — this endpoint burns real LLM credits.
    // Require at least one AI entitlement so free/expired accounts cannot use it.
    const hasAccess = await requireFeatureEntitlement(
      supabase, authContext.userId, authContext.workspaceId, 'description_generation'
    );
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ success: false, error: 'Feature not available on your current plan' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count against the shared daily LLM budget (2 calls per invocation)
    const llmDailyLimit = await checkRateLimit(supabase, {
      bucket: 'llm:daily',
      key: authContext.userId,
      limit: 200,
      windowSeconds: 86400,
    });
    if (!llmDailyLimit.allowed) return rateLimitResponse(llmDailyLimit, corsHeaders);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'LOVABLE_API_KEY not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[test-ai-generation] Starting AI test...');

    // Test title generation
    const titlePrompt = `You are an expert eBay SEO specialist. Generate 3 optimized eBay titles for this product:
    
Product: Sony WH-1000XM5 Wireless Noise Canceling Headphones
Brand: Sony
Category: Electronics > Headphones

Return ONLY a JSON object:
{
  "titles": [
    {"rank": "best", "title": "Title 1"},
    {"rank": "recommended", "title": "Title 2"},
    {"rank": "powerful", "title": "Title 3"}
  ]
}`;

    const titleResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert eBay product title generator. Always respond with valid JSON only.' },
          { role: 'user', content: titlePrompt }
        ],
      }),
    });

    console.log('[test-ai-generation] Title API response status:', titleResponse.status);

    if (!titleResponse.ok) {
      const errorText = await titleResponse.text();
      console.error('[test-ai-generation] Title API error:', errorText);
      
      if (titleResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (titleResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: `AI gateway error: ${titleResponse.status}`,
        details: errorText.substring(0, 200)
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const titleData = await titleResponse.json();
    const titleContent = titleData.choices?.[0]?.message?.content || '';
    
    console.log('[test-ai-generation] Title response received, length:', titleContent.length);

    // Test description generation
    const descPrompt = `Generate a short eBay product description (3-4 sentences) for:
Product: Sony WH-1000XM5 Wireless Noise Canceling Headphones
Features: Industry-leading noise cancellation, 30-hour battery life

Output clean text only, no HTML.`;

    const descResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a professional eBay copywriter.' },
          { role: 'user', content: descPrompt }
        ],
      }),
    });

    console.log('[test-ai-generation] Description API response status:', descResponse.status);

    if (!descResponse.ok) {
      const errorText = await descResponse.text();
      console.error('[test-ai-generation] Description API error:', errorText);
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Description AI error: ${descResponse.status}`,
        titleTest: { success: true, content: titleContent.substring(0, 300) }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const descData = await descResponse.json();
    const descContent = descData.choices?.[0]?.message?.content || '';

    console.log('[test-ai-generation] Both tests completed successfully');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'AI generation is working correctly!',
      titleTest: {
        success: true,
        model: 'google/gemini-2.5-flash',
        response: titleContent.substring(0, 500)
      },
      descriptionTest: {
        success: true,
        model: 'google/gemini-2.5-flash',
        response: descContent.substring(0, 500)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[test-ai-generation] Error:', error);
    const status = error instanceof Error && /(authorization|auth token|session)/i.test(error.message) ? 401 : 500;
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

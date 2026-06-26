// DEPRECATED — superseded by `generate-description-v2` (identical contract,
// plus per-user rate limiting + OpenAI env-key fallback). All current source
// callers point at v2. This function is RETAINED AND DEPLOYED only because
// already-installed extension builds still dispatch GENERATE_DESCRIPTION to it.
// SAFE TO DELETE once the v2-targeting extension build has fully rolled out via
// the Chrome Web Store (no v1 traffic in edge logs). Do NOT undeploy before then.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveExtensionOrLegacyAuth, requireFeatureEntitlement, createServiceClient } from '../_shared/extension-session.ts';
import { checkRateLimit, getClientIp, rateLimitResponse } from '../_shared/rate-limit.ts';
import { buildPrompt, renderSections, sanitize, DescriptionConfig } from '../_shared/description.ts';
import { resolveCorsHeaders } from '../_shared/cors.ts';

interface DescriptionRequest {
  title?: string;
  description?: string;
  bulletPoints?: string[];
  category?: string;
  price?: string;
  brand?: string;
  features?: string[];
  specifications?: Record<string, string>;
  condition?: string;
}

serve(async (req) => {
  const corsHeaders = resolveCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    // Create service role client for database operations
    const supabase = createServiceClient();
    const ipLimit = await checkRateLimit(supabase, {
      bucket: 'generate-description:ip',
      key: getClientIp(req),
      limit: 30,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    // Authenticate user before processing using dual-auth
    const authContext = await resolveExtensionOrLegacyAuth(supabase, req);
    const userId = authContext.userId;

    console.log(`[generate-description] User authenticated: ${userId} (${authContext.authMode})`);

    const userLimit = await checkRateLimit(supabase, {
      bucket: 'generate-description:user',
      key: userId,
      limit: 60,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    // Global per-user daily LLM budget across all generate-* endpoints.
    const llmDailyLimit = await checkRateLimit(supabase, {
      bucket: 'llm:daily',
      key: userId,
      limit: 200,
      windowSeconds: 86400,
    });
    if (!llmDailyLimit.allowed) return rateLimitResponse(llmDailyLimit, corsHeaders);

    // Verify feature entitlement
    const hasAccess = await requireFeatureEntitlement(supabase, userId, authContext.workspaceId, "description_generation");
    if (!hasAccess) {
      console.warn(`[generate-description] User ${userId} missing description_generation entitlement`);
      return new Response(JSON.stringify({ success: false, error: 'Feature not entitled or subscription inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1) Fetch database-driven description config (global)
    const { data: configData, error: configError } = await supabase
      .from('description_config')
      .select('*')
      .eq('scope', 'global')
      .maybeSingle();

    if (configError) {
      console.error('[generate-description] Database error reading config:', configError);
    }

    // Fetch user's AI settings from their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .single();

    const userSettings = (profile?.settings as Record<string, unknown>) || {};
    const userProvider = userSettings.ai_provider as string || 'lovable';
    const userModel = userSettings.ai_model as string || 'google/gemini-2.5-flash';

    console.log(`[generate-description] User AI config: provider=${userProvider}, model=${userModel}`);

    const requestData: DescriptionRequest = await req.json();
    
    // SECURITY: Input validation and sanitization.
    // Single-line fields have newlines collapsed to spaces to prevent prompt injection.
    const nl = (s: string) => s.replace(/[\r\n]+/g, ' ');
    const title = nl(String(requestData.title || '')).slice(0, 1000);
    const description = String(requestData.description || '').slice(0, 10000);
    const bulletPoints = Array.isArray(requestData.bulletPoints)
      ? requestData.bulletPoints.slice(0, 20).map(bp => String(bp).slice(0, 1000))
      : [];
    const brand = nl(String(requestData.brand || '')).slice(0, 200);
    const category = nl(String(requestData.category || '')).slice(0, 500);
    const price = nl(String(requestData.price || '')).slice(0, 50);
    const condition = nl(String(requestData.condition || 'New')).slice(0, 50);
    const features = Array.isArray(requestData.features) 
      ? requestData.features.slice(0, 20).map(f => String(f).slice(0, 1000))
      : [];
    const specifications = typeof requestData.specifications === 'object' && requestData.specifications !== null
      ? Object.fromEntries(
          Object.entries(requestData.specifications).slice(0, 30).map(([k, v]) => [String(k).slice(0, 100), String(v).slice(0, 500)])
        )
      : {};

    console.log('Generating description for:', { title: title.slice(0, 50), brand });

    // Fallback default config if DB config is missing
    const defaultSections = [
      { key: "title", type: "opening", order: 1, title: "Title", enabled: true, ai_guidance: "Format the title as a clean heading.", static_html: null },
      { key: "opening", type: "opening", order: 2, title: "Introduction", enabled: true, ai_guidance: "1-2 compelling sentences describing the product.", static_html: null },
      { key: "features", type: "features", order: 3, title: "✨ Key Features", enabled: true, ai_guidance: "List key features in short, punchy bullet points.", static_html: null },
      { key: "specifications", type: "specifications", order: 4, title: "📋 Specifications", enabled: true, ai_guidance: "Create key/value pairs of technical specifications.", static_html: null },
      { key: "shipping", type: "shipping", order: 5, title: "📦 Shipping & Handling", enabled: true, ai_guidance: null, static_html: "<p>• Fast & Free Shipping on all orders</p><p>• Tracking number provided within 24 hours</p><p>• Professionally packaged for safe delivery</p>" },
      { key: "returns", type: "returns", order: 6, title: "✅ Returns Policy", enabled: true, ai_guidance: null, static_html: "<p>30-day hassle-free returns. If you're not satisfied, return for a full refund.</p>" },
      { key: "contact", type: "contact", order: 7, title: "⭐ Thank you for shopping with us! ⭐", enabled: true, ai_guidance: null, static_html: "<p style=\"margin: 0; color: #e65100;\"><strong>⭐ Thank you for shopping with us! ⭐</strong></p><p style=\"margin: 5px 0 0 0; font-size: 12px;\">Questions? Message us anytime - we respond within 24 hours!</p>" }
    ];

    const defaultExclusions = {
      strip_supplier_names: true,
      supplier_names: ["Amazon", "Walmart", "AliExpress"],
      strip_product_ids: true,
      strip_prices: true,
      strip_urls: true,
      strip_images: true,
      blocked_terms: ["Prime", "Subscribe & Save", "Amazon's Choice", "Sold by", "Fulfilled by", "Available at", "ASIN", "UPC", "ISBN", "Seller Rank", "Sales Rank"],
      banned_claim_phrases: ["lifetime warranty", "100% satisfaction guaranteed", "100% guaranteed"],
      vero_brands: ["Apple", "Nike", "Adidas", "Sony"]
    };

    const config: DescriptionConfig = configData || {
      sections: defaultSections,
      exclusion_rules: defaultExclusions,
      prompt_skeleton: `You are a professional eBay listing description copywriter.
Generate structured description data for the product: {title}.

You MUST return ONLY a valid JSON object matching the requested structure.
Do not wrap in markdown code blocks or return HTML. Return a JSON object with keys corresponding to the AI-generated sections.

SECTION REQUIREMENTS:
{sections_guidance}

EXCLUSIONS & POLICY RULES:
- DO NOT mention any of the following terms or brands: {blocked_terms}
- DO NOT include unsupported claims or phrases: {banned_claim_phrases}

PRODUCT DATA:
Title: {title}
Brand: {brand}
Category: {category}
Original Description: {description}
Bullet Points: {bulletPoints}
Features: {features}
Specifications: {specifications}
Condition: {condition}
Price: {price}`,
      output_format: 'html_ebay_safe'
    };

    // Initialize model & provider variables
    let model = 'gpt-4o-mini';
    let adminApiKey = '';
    let apiProvider = 'openai';

    // Fetch Admin AI credentials from admin_settings
    try {
      const { data: settingsData } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['ext_ai_provider', 'ext_ai_api_key', 'ext_ai_model']);

      if (settingsData) {
        settingsData.forEach((item) => {
          if (item.key === 'ext_ai_provider' && item.value) apiProvider = item.value;
          if (item.key === 'ext_ai_model' && item.value) model = item.value;
          if (item.key === 'ext_ai_api_key' && item.value) adminApiKey = item.value;
        });
      }
    } catch (dbError) {
      console.log('Using default settings:', dbError);
    }
    
    if (model === 'gpt-5-nano') {
      model = 'gpt-4o-mini';
    }

    // 2) Build description generation prompt via shared module
    const normalizedProduct = {
      title,
      description,
      bulletPoints,
      brand,
      category,
      price,
      condition,
      features,
      specifications
    };

    const prompt = buildPrompt(config, normalizedProduct);

    const useDirectOpenAI = apiProvider === 'openai' && adminApiKey && adminApiKey.startsWith('sk-') && adminApiKey.length > 20;
    console.log(`[generate-description] Using ${useDirectOpenAI ? 'Direct OpenAI' : 'Lovable AI Gateway'} with model: ${model}`);

    let responseContent = '';

    if (useDirectOpenAI) {
      console.log('[generate-description] Calling OpenAI directly');
      let response;
      let retries = 2;
      
      while (retries >= 0) {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model.startsWith('openai/') ? model.replace('openai/', '') : model,
            messages: [
              { 
                role: 'system', 
                content: 'You are an expert product listing generator. You MUST follow ALL instructions in the user\'s prompt exactly. Always respond with valid JSON only, exactly matching the requested structure. NEVER output markdown code blocks or wrapper backticks.' 
              },
              { role: 'user', content: prompt }
            ],
            response_format: { type: "json_object" },
            max_tokens: 1000
          }),
        });

        if (response.ok) break;

        if (response.status >= 500 && retries > 0) {
          await new Promise(r => setTimeout(r, 1000));
          retries--;
        } else {
          break;
        }
      }

      if (!response || !response.ok) {
        const errorText = await (response ? response.text() : 'No response');
        console.error('OpenAI API error:', response?.status, errorText);
        throw new Error(`OpenAI API error: ${response?.status}`);
      }

      const data = await response.json();
      responseContent = data.choices?.[0]?.message?.content || '';
    } else {
      // Lovable AI Gateway
      if (!lovableApiKey) {
        throw new Error('AI gateway credentials not configured.');
      }

      console.log('[generate-description] Calling Lovable AI Gateway');
      const gatewayModel = model.startsWith('gpt') ? `openai/${model}` : model;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: gatewayModel,
          messages: [
            { role: 'user', content: prompt }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1000
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lovable AI Gateway error:', response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      responseContent = data.choices?.[0]?.message?.content || '';
    }

    // 3) Process and render sections
    let aiJson: Record<string, any> = {};
    try {
      // Remove any potential code block wrapper formatting from AI response
      const cleanJsonStr = responseContent
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/gi, '')
        .trim();
      aiJson = JSON.parse(cleanJsonStr);
    } catch (e) {
      console.warn('[generate-description] JSON parsing failed, using safe fallback:', e);
      // Fallback: Populate active AI keys using input data
      aiJson = {
        opening: description?.slice(0, 500) || 'Premium product, high quality.',
        features: bulletPoints.length > 0 ? bulletPoints : features,
        specifications: specifications
      };
    }

    // 4) Render sections via shared module (HTML or Plaintext)
    const renderedDescription = renderSections(config, aiJson, normalizedProduct);

    // 5) Post-generation sanitation via shared module
    const finalDescription = sanitize(renderedDescription, config.exclusion_rules, config.output_format);

    return new Response(JSON.stringify({ 
      success: true, 
      description: finalDescription,
      provider: useDirectOpenAI ? 'openai' : 'lovable',
      model,
      length: finalDescription.length,
      config_version: config.version
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-description function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate description.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

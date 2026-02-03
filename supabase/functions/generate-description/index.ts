import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
};

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

const DEFAULT_DESCRIPTION_PROMPT = `Transform the following Amazon product data into a professional eBay listing description.

REQUIREMENTS:
- Remove all Amazon-specific terms (Prime, Subscribe & Save, Amazon's Choice, etc.)
- Create a compelling, professional description
- Use HTML formatting for eBay (allowed tags: <b>, <br>, <ul>, <li>, <p>)
- Include all key product features and specifications
- Add standard seller sections at the bottom

STRUCTURE YOUR RESPONSE AS:
1. Opening hook (1-2 sentences)
2. Key Features (bullet points)
3. Product Specifications
4. What's Included
5. Shipping & Handling
6. Returns Policy
7. Contact Information

PRODUCT DATA:
Title: {title}
Brand: {brand}
Category: {category}
Original Description: {description}
Bullet Points: {bulletPoints}
Features: {features}
Specifications: {specifications}
Condition: {condition}
Price: {price}

Generate the eBay description in clean HTML format. Do not include any markdown code blocks, just raw HTML.`;

const DEFAULT_TEMPLATE = `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h2 style="color: #333;">{title}</h2>
  
  <div style="margin: 15px 0;">
    <p>{opening}</p>
  </div>
  
  <div style="margin: 15px 0;">
    <h3 style="color: #0066c0; border-bottom: 2px solid #0066c0; padding-bottom: 5px;">✨ Key Features</h3>
    <ul style="line-height: 1.8;">
      {features}
    </ul>
  </div>
  
  <div style="margin: 15px 0;">
    <h3 style="color: #0066c0; border-bottom: 2px solid #0066c0; padding-bottom: 5px;">📋 Specifications</h3>
    <table style="width: 100%; border-collapse: collapse;">
      {specifications}
    </table>
  </div>
  
  <div style="background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px;">
    <h3 style="color: #333;">📦 Shipping & Handling</h3>
    <p>• Fast & Free Shipping on all orders</p>
    <p>• Tracking number provided within 24 hours</p>
    <p>• Professionally packaged for safe delivery</p>
  </div>
  
  <div style="background: #e8f5e9; padding: 15px; margin: 15px 0; border-radius: 5px;">
    <h3 style="color: #2e7d32;">✅ Returns Policy</h3>
    <p>30-day hassle-free returns. If you're not satisfied, return for a full refund.</p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 15px; background: #fff3e0; border-radius: 5px;">
    <p style="margin: 0; color: #e65100;"><strong>⭐ Thank you for shopping with us! ⭐</strong></p>
    <p style="margin: 5px 0 0 0; font-size: 12px;">Questions? Message us anytime - we respond within 24 hours!</p>
  </div>
</div>
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    // SECURITY: Authenticate user before processing
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[generate-description] No auth header provided');
      return new Response(JSON.stringify({ success: false, error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user's auth token to validate authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error('[generate-description] Auth error:', userError);
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[generate-description] User authenticated: ${user.id}`);

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's AI settings from their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single();

    const userSettings = (profile?.settings as Record<string, unknown>) || {};
    const userApiKey = userSettings.ai_api_key as string || '';
    const userProvider = userSettings.ai_provider as string || 'lovable';
    const userModel = userSettings.ai_model as string || 'google/gemini-2.5-flash';

    console.log(`[generate-description] User AI config: provider=${userProvider}, model=${userModel}`);

    const requestData: DescriptionRequest = await req.json();
    
    // SECURITY: Input validation and sanitization
    const title = String(requestData.title || '').slice(0, 500);
    const description = String(requestData.description || '').slice(0, 5000);
    const bulletPoints = Array.isArray(requestData.bulletPoints) 
      ? requestData.bulletPoints.slice(0, 20).map(bp => String(bp).slice(0, 500))
      : [];
    const category = String(requestData.category || '').slice(0, 200);
    const price = String(requestData.price || '').slice(0, 50);
    const brand = String(requestData.brand || '').slice(0, 200);
    const features = Array.isArray(requestData.features) 
      ? requestData.features.slice(0, 20).map(f => String(f).slice(0, 500))
      : [];
    const specifications = typeof requestData.specifications === 'object' && requestData.specifications !== null
      ? Object.fromEntries(
          Object.entries(requestData.specifications).slice(0, 50).map(([k, v]) => [String(k).slice(0, 100), String(v).slice(0, 500)])
        )
      : {};
    const condition = String(requestData.condition || 'New').slice(0, 50);

    console.log('Generating description for:', { title: title.slice(0, 50), brand, category });

    // Initialize defaults
    let promptTemplate = DEFAULT_DESCRIPTION_PROMPT;
    let htmlTemplate = DEFAULT_TEMPLATE;
    let model = 'gpt-5-nano';
    let adminApiKey = '';
    let apiProvider = 'lovable';

    // Fetch AI settings from admin_settings (ext_* keys from AdminExtension page)
    try {
      const { data: settingsData } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['ext_ai_provider', 'ext_ai_api_key', 'ext_ai_model', 'ext_description_prompt']);

      if (settingsData) {
        settingsData.forEach((item: { key: string; value: string | null }) => {
          if (item.key === 'ext_ai_provider' && item.value) {
            apiProvider = item.value;
          }
          if (item.key === 'ext_ai_model' && item.value) {
            model = item.value;
          }
          if (item.key === 'ext_description_prompt' && item.value) {
            promptTemplate = item.value;
          }
          if (item.key === 'ext_ai_api_key' && item.value) {
            adminApiKey = item.value;
          }
        });
      }
    } catch (dbError) {
      console.log('Using default settings:', dbError);
    }

    // Determine if we should use direct OpenAI or Lovable AI Gateway
    // Use direct OpenAI if provider is 'openai' and a valid API key is provided
    const useDirectOpenAI = apiProvider === 'openai' && adminApiKey && adminApiKey.startsWith('sk-') && adminApiKey.length > 20;

    console.log(`[generate-description] Using ${useDirectOpenAI ? 'Direct OpenAI' : 'Lovable AI Gateway'} with model: ${model}`);

    // Replace placeholders in prompt
    const bulletPointsText = bulletPoints.length > 0 ? bulletPoints.join('\n- ') : 'Not provided';
    const featuresText = features.length > 0 ? features.join('\n- ') : 'Not provided';
    const specsText = Object.entries(specifications).length > 0 
      ? Object.entries(specifications).map(([k, v]) => `${k}: ${v}`).join('\n') 
      : 'Not provided';

    const prompt = promptTemplate
      .replace(/{title}/g, title)
      .replace(/{description}/g, description)
      .replace(/{bulletPoints}/g, bulletPointsText)
      .replace(/{category}/g, category)
      .replace(/{price}/g, price)
      .replace(/{brand}/g, brand)
      .replace(/{features}/g, featuresText)
      .replace(/{specifications}/g, specsText)
      .replace(/{condition}/g, condition);

    let responseContent = '';

    if (useDirectOpenAI) {
      // Use admin's OpenAI API key directly
      console.log('[generate-description] Calling OpenAI directly with admin API key');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model.startsWith('openai/') ? model.replace('openai/', '') : model,
          messages: [
            { role: 'system', content: 'You are an expert eBay listing copywriter. Generate professional, compelling product descriptions in clean HTML format. Do not wrap in markdown code blocks. Output raw HTML only.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key. Please update your API key in Admin Settings.');
        }
        if (response.status === 429) {
          return new Response(JSON.stringify({ success: false, error: 'OpenAI rate limit exceeded. Please try again.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      responseContent = data.choices?.[0]?.message?.content || '';
    } else {
      // Fallback to Lovable AI Gateway
      if (!lovableApiKey) {
        console.error('LOVABLE_API_KEY not configured and no admin OpenAI key');
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'AI service not configured. Please add an OpenAI API key in Admin Settings.' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[generate-description] Using Lovable AI Gateway as fallback');

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
            { role: 'system', content: 'You are an expert eBay listing copywriter. Generate professional, compelling product descriptions in clean HTML format. Do not wrap in markdown code blocks. Output raw HTML only.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lovable AI Gateway error:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted. Please add an OpenAI API key in Admin Settings.' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      responseContent = data.choices?.[0]?.message?.content || '';
    }

    console.log('Generated description length:', responseContent.length);

    // Clean up the response - remove markdown code blocks if present
    let cleanedDescription = responseContent
      .replace(/```html\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // If response is empty or too short, use template fallback
    if (cleanedDescription.length < 50) {
      console.log('Using template fallback');
      
      const featuresList = bulletPoints.length > 0 
        ? bulletPoints.map(bp => `<li>${bp}</li>`).join('\n')
        : features.map(f => `<li>${f}</li>`).join('\n') || '<li>High quality product</li>';
      
      const specsTable = Object.entries(specifications).length > 0
        ? Object.entries(specifications).map(([k, v]) => 
            `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>${k}</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${v}</td></tr>`
          ).join('\n')
        : '<tr><td colspan="2" style="padding: 8px;">See product details above</td></tr>';

      cleanedDescription = htmlTemplate
        .replace(/{title}/g, title || 'Premium Product')
        .replace(/{opening}/g, description?.slice(0, 200) || 'High quality product, brand new and ready to ship!')
        .replace(/{features}/g, featuresList)
        .replace(/{specifications}/g, specsTable);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      description: cleanedDescription,
      provider: useDirectOpenAI ? 'openai' : 'lovable',
      model,
      length: cleanedDescription.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-description function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate description. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

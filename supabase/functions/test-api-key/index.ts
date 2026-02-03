import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[test-api-key] Request received');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[test-api-key] Request body:', { provider: body.provider, model: body.model, hasApiKey: !!body.apiKey });
    
    const { provider, apiKey, model } = body;

    if (!provider) {
      throw new Error('Provider is required');
    }

    if (!apiKey && provider !== 'lovable') {
      throw new Error('API key is required');
    }

    let isValid = false;
    let errorMessage = '';

    switch (provider) {
      case 'openai': {
        // Use provided model or default to gpt-5-nano
        const testModel = model || 'gpt-5-nano';
        console.log(`[test-api-key] Testing OpenAI with model: ${testModel}`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: testModel,
            messages: [{ role: 'user', content: 'Say hello' }],
            max_tokens: 10,
          }),
        });
        
        if (response.ok) {
          isValid = true;
          console.log(`[test-api-key] OpenAI API key valid for model: ${testModel}`);
        } else {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || 'Invalid API key or model';
          console.log(`[test-api-key] OpenAI test failed: ${errorMessage}`);
        }
        break;
      }

      case 'anthropic': {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model || 'claude-3-5-haiku-20241022',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say hello' }],
          }),
        });
        
        if (response.ok) {
          isValid = true;
        } else {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || 'Invalid API key';
        }
        break;
      }

      case 'gemini': {
        const testModel = 'gemini-1.5-flash';
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Say hello' }] }],
            }),
          }
        );
        
        if (response.ok) {
          isValid = true;
        } else {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || 'Invalid API key';
        }
        break;
      }

      case 'lovable': {
        isValid = true;
        break;
      }

      default:
        throw new Error('Unknown provider');
    }

    if (isValid) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: errorMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error testing API key:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

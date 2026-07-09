import { resolveExtensionCors } from "../_shared/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';


Deno.serve(async (req) => {
  const corsHeaders = resolveExtensionCors(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Support both Authorization header and x-api-key (extension compatibility)
    let authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const apiKey = req.headers.get('x-api-key');
    if (!authToken && apiKey && apiKey.includes('.')) authToken = apiKey;

    if (!authToken) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Only delete rows clearly marked as demo.
    const { data: demoRows, error: listError } = await supabaseAdmin
      .from('ebay_orders')
      .select('id')
      .eq('user_id', user.id)
      .like('ebay_order_id', 'DEMO-%');

    if (listError) {
      console.error('[delete-demo-ebay-orders] List error:', listError);
      return new Response(JSON.stringify({ success: false, error: 'Failed to list demo orders' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ids = (demoRows ?? []).map((r: any) => r.id).filter(Boolean);

    if (ids.length === 0) {
      return new Response(JSON.stringify({ success: true, deleted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('ebay_orders')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error('[delete-demo-ebay-orders] Delete error:', deleteError);
      return new Response(JSON.stringify({ success: false, error: 'Failed to delete demo orders' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, deleted: ids.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[delete-demo-ebay-orders] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

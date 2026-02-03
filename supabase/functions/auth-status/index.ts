import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Support both Authorization header and x-api-key (for extension compatibility)
    let authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const apiKey = req.headers.get('x-api-key');
    
    // If x-api-key is provided and looks like a JWT, use it
    if (!authToken && apiKey && apiKey.includes('.')) {
      authToken = apiKey;
    }
    
    if (!authToken) {
      console.log('[auth-status] No auth token found');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[auth-status] Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[auth-status] User authenticated: ${user.id} (${user.email})`);

    // Fetch user profile with plan info - use maybeSingle to handle missing profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        plans (
          name,
          display_name,
          credits_per_month,
          max_listings,
          max_auto_orders
        )
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[auth-status] Profile error:', profileError);
    }

    const planName = profile?.plans?.name || 'free';
    const planDisplayName = profile?.plans?.display_name || 'Free';

    const response = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        plan: planName,
        plan_display_name: planDisplayName,
        credits: profile?.credits || 0,
        max_credits: profile?.plans?.credits_per_month || 5,
        max_listings: profile?.plans?.max_listings || 10,
        max_auto_orders: profile?.plans?.max_auto_orders || 0,
        is_active: profile?.is_active ?? true,
      }
    };

    console.log(`[auth-status] Returning user data for ${user.email}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[auth-status] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

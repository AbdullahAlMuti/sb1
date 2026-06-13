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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Support both Authorization header and x-api-key (for extension compatibility)
    let authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const apiKey = req.headers.get('x-api-key');

    if (!authToken && apiKey && apiKey.includes('.')) {
      authToken = apiKey;
    }

    if (!authToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingProfile, error: profileReadError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileReadError) {
      console.error('[ensure-profile] Read profile error:', profileReadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingProfile) {
      return new Response(
        JSON.stringify({ success: true, profile: existingProfile }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fullName =
      (user.user_metadata && (user.user_metadata as any).full_name) ||
      user.email ||
      null;

    const goal = (user.user_metadata && (user.user_metadata as any).goal) || null;

    // New signups have no plan; trial is chosen explicitly from /choose-plan.
    // handle_new_user() trigger sets the same defaults — this is the safety net
    // for users who authenticate before the trigger fires.
    const { data: created, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        full_name: fullName,
        credits: 0,
        is_active: true,
        plan_id: null,
        settings: goal ? { goal } : {},
      })
      .select('*')
      .single();

    if (createError) {
      console.error('[ensure-profile] Create profile error:', createError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, profile: created }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ensure-profile] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

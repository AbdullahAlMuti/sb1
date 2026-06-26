import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveExtensionOrLegacyAuth, createServiceClient, extCorsHeaders } from '../_shared/extension-session.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: extCorsHeaders(req) });
  }

  try {
    const supabase = createServiceClient();
    
    // Resolve auth
    const authContext = await resolveExtensionOrLegacyAuth(supabase, req);
    const userId = authContext.userId;

    console.log(`[auth-status] User authenticated: ${userId} (${authContext.authMode})`);

    // Fetch user profile with plan info
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
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('[auth-status] Profile error:', profileError);
    }

    const planName = profile?.plans?.name || 'none';
    const planDisplayName = profile?.plans?.display_name || 'No Plan';

    const response = {
      success: true,
      user: {
        id: userId,
        email: profile?.email || '',
        full_name: profile?.full_name || '',
        plan: planName,
        plan_display_name: planDisplayName,
        credits: profile?.credits || 0,
        max_credits: profile?.plans?.credits_per_month || 5,
        max_listings: profile?.plans?.max_listings || 10,
        max_auto_orders: profile?.plans?.max_auto_orders || 0,
        is_active: profile?.is_active ?? true,
      }
    };

    console.log(`[auth-status] Returning user data for ${profile?.email || userId}`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...extCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[auth-status] Error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication failed' }),
      { status: 401, headers: { ...extCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});

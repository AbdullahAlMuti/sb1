import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateUserPlan } from '../_shared/plan-middleware.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface ListingPayload {
  title: string;
  sku?: string;
  ebayPrice?: number;
  ebay_price?: number;
  amazonPrice?: number;
  amazon_price?: number;
  amazonUrl?: string;
  amazon_url?: string;
  amazonAsin?: string;
  amazon_asin?: string;
  ebayItemId?: string;
  ebay_item_id?: string;
  status?: string;
  auto_order_enabled?: boolean;
  amazon_data?: unknown;
  ebay_data?: unknown;
}

function safeParseJson(val: unknown) {
  if (!val) return null;
  if (typeof val === 'object') return val as Record<string, unknown>;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function extractAsinFromAmazonUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    return m?.[1]?.toUpperCase() ?? null;
  } catch {
    const m = String(url).match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    return m?.[1]?.toUpperCase() ?? null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Support both Authorization header and x-api-key
    let authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const apiKey = req.headers.get('x-api-key');

    if (!authToken && apiKey && apiKey.includes('.')) {
      authToken = apiKey;
    }

    if (!authToken) {
      console.log('[create-listing] No auth token found');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from token
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      console.error('[create-listing] Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[create-listing] User authenticated: ${user.id} (${user.email})`);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ListingPayload = await req.json();

    const amazonData = safeParseJson((body as any).amazon_data) ?? {};
    const ebayData = safeParseJson((body as any).ebay_data) ?? {};

    const inferredTitle =
      (typeof body.title === 'string' ? body.title : '') ||
      ((ebayData as any)?.title as string) ||
      ((ebayData as any)?.ebayTitle as string) ||
      ((amazonData as any)?.title as string) ||
      ((amazonData as any)?.productTitle as string) ||
      '';

    // Validate required fields
    if (!inferredTitle || inferredTitle.trim().length === 0) {
      console.log('[create-listing] Missing title');
      return new Response(
        JSON.stringify({ success: false, error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ensure user profile exists and get credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, plan_id')
      .eq('id', user.id)
      .maybeSingle();

    let userCredits = profile?.credits ?? 0;
    let planId = profile?.plan_id;

    // Auto-create profile if missing
    if (!profile) {
      console.log('[create-listing] Profile missing, creating...');
      const { data: freePlan } = await supabase
        .from('plans')
        .select('id')
        .eq('name', 'free')
        .single();

      const { data: created, error: createErr } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email ?? '',
          full_name: (user.user_metadata as any)?.full_name ?? user.email ?? null,
          credits: 5,
          is_active: true,
          plan_id: freePlan?.id ?? null,
        })
        .select('credits, plan_id')
        .single();

      if (createErr) {
        console.error('[create-listing] Profile creation error:', createErr);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to initialize profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userCredits = created?.credits ?? 5;
      planId = created?.plan_id;
    }

    // Check listing limit BEFORE credit check (for new listings only)
    const normalizedSku = body.sku?.trim().substring(0, 100) || null;
    const normalizedAsin =
      (body.amazon_asin ?? body.amazonAsin)?.trim().substring(0, 20) ||
      extractAsinFromAmazonUrl(body.amazonUrl ?? body.amazon_url ?? null)?.substring(0, 20) ||
      null;

    // Check if this is an update (existing listing)
    let existingId: string | null = null;
    if (normalizedSku) {
      const { data } = await supabase
        .from('listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('sku', normalizedSku)
        .maybeSingle();
      if (data) existingId = data.id;
    }

    if (!existingId && normalizedAsin) {
      const { data } = await supabase
        .from('listings')
        .select('id')
        .eq('user_id', user.id)
        .eq('amazon_asin', normalizedAsin)
        .maybeSingle();
      if (data) existingId = data.id;
    }

    // Only check limits for NEW listings (backend authoritative)
    if (!existingId) {
      const listingValidation = await validateUserPlan(supabase, user.id, 'listing', 1);
      if (!listingValidation.allowed) {
        console.log('[create-listing] Listing validation blocked:', listingValidation);
        return new Response(
          JSON.stringify({
            success: false,
            error: listingValidation.reason ?? 'Listing not allowed',
            limitType: 'listings',
            current: listingValidation.current,
            limit: listingValidation.limit,
            upgradeRequired: true,
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const creditValidation = await validateUserPlan(supabase, user.id, 'credit', 1);
      if (!creditValidation.allowed) {
        console.log('[create-listing] Credit validation blocked:', creditValidation);
        return new Response(
          JSON.stringify({
            success: false,
            error: creditValidation.reason ?? 'Insufficient credits',
            limitType: 'credits',
            current: creditValidation.current,
            limit: creditValidation.limit,
            upgradeRequired: true,
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Normalize payload
    const normalizedListing = {
      user_id: user.id,
      title: inferredTitle.trim().substring(0, 500),
      sku: normalizedSku,
      ebay_price: body.ebayPrice ?? body.ebay_price ?? null,
      amazon_price: body.amazonPrice ?? body.amazon_price ?? null,
      amazon_url: body.amazonUrl ?? body.amazon_url ?? null,
      amazon_asin: normalizedAsin,
      ebay_item_id: (body.ebay_item_id ?? body.ebayItemId)?.trim().substring(0, 50) || null,
      status: body.status || 'active',
      auto_order_enabled: body.auto_order_enabled ?? false,
      amazon_data: (body as any).amazon_data ?? amazonData,
      ebay_data: (body as any).ebay_data ?? ebayData,
    };

    if (existingId) {
      // Update existing listing (no credit deduction)
      const { data: updated, error: updateErr } = await supabase
        .from('listings')
        .update({
          ...normalizedListing,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingId)
        .select()
        .single();

      if (updateErr) {
        console.error('[create-listing] Update error:', updateErr);
        return new Response(
          JSON.stringify({ success: false, error: updateErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[create-listing] Updated existing listing: ${existingId}`);
      return new Response(
        JSON.stringify({ success: true, action: 'updated', listing: updated }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new listing
    const { data: created, error: insertErr } = await supabase
      .from('listings')
      .insert(normalizedListing)
      .select()
      .single();

    if (insertErr) {
      console.error('[create-listing] Insert error:', insertErr);
      return new Response(
        JSON.stringify({ success: false, error: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct 1 credit
    const newCredits = Math.max(0, userCredits - 1);
    await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', user.id);

    // Log credit transaction for audit trail
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: -1,
      transaction_type: 'usage',
      balance_after: newCredits,
      description: `Created listing: ${created.title?.substring(0, 50)}`,
      metadata: {
        listing_id: created.id,
        action: 'create_listing',
      },
    });

    // Log usage
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action: 'create_listing',
      credits_used: 1,
      metadata: {
        listing_id: created.id,
        title: created.title,
      },
    });

    console.log(`[create-listing] Created listing: ${created.id}, deducted 1 credit`);

    return new Response(
      JSON.stringify({
        success: true,
        action: 'created',
        listing: created,
        creditsRemaining: newCredits,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[create-listing] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

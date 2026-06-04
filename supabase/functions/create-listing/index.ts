import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateUserPlan } from '../_shared/plan-middleware.ts';
import { resolveExtensionOrLegacyAuth, requireFeatureEntitlement, createServiceClient, corsHeaders } from '../_shared/extension-session.ts';
import { checkRateLimit, getClientIp as getRateLimitIp, rateLimitResponse } from '../_shared/rate-limit.ts';

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate using shared resolver
    const supabaseService = createServiceClient();
    const ipLimit = await checkRateLimit(supabaseService, {
      bucket: 'create-listing:ip',
      key: getRateLimitIp(req),
      limit: 60,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);

    const authContext = await resolveExtensionOrLegacyAuth(supabaseService, req);
    const userId = authContext.userId;

    console.log(`[create-listing] User authenticated: ${userId} (${authContext.authMode})`);

    const userLimit = await checkRateLimit(supabaseService, {
      bucket: 'create-listing:user',
      key: userId,
      limit: 120,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    // Verify feature entitlement
    const hasAccess = await requireFeatureEntitlement(supabaseService, userId, authContext.workspaceId, "ebay_listing_create");
    if (!hasAccess) {
      console.warn(`[create-listing] User ${userId} missing ebay_listing_create entitlement`);
      return new Response(
        JSON.stringify({ success: false, error: "Feature not entitled or subscription inactive" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    // Auto-create profile if missing
    if (!profile) {
      console.log('[create-listing] Profile missing, creating...');
      const { data: freePlan } = await supabase
        .from('plans')
        .select('id')
        .eq('name', 'free')
        .maybeSingle();

      const { error: createErr } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: authContext.profile?.email || '',
          full_name: authContext.profile?.full_name || '',
          credits: 20,
          is_active: true,
          plan_id: freePlan?.id ?? null,
        })
        .select('id')
        .single();

      if (createErr) {
        console.error('[create-listing] Profile creation error:', createErr);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to initialize profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
        .eq('user_id', userId)
        .eq('sku', normalizedSku)
        .maybeSingle();
      if (data) existingId = data.id;
    }

    if (!existingId && normalizedAsin) {
      const { data } = await supabase
        .from('listings')
        .select('id')
        .eq('user_id', userId)
        .eq('amazon_asin', normalizedAsin)
        .maybeSingle();
      if (data) existingId = data.id;
    }

    if (!existingId) {
      const listingValidation = await validateUserPlan(supabase, userId, 'listing', 1);
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

      const creditValidation = await validateUserPlan(supabase, userId, 'credit', 1);
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
      user_id: userId,
      title: inferredTitle.trim().substring(0, 500),
      sku: normalizedSku,
      ebay_price: body.ebayPrice ?? body.ebay_price ?? null,
      amazon_price: body.amazonPrice ?? body.amazon_price ?? null,
      amazon_url: body.amazonUrl ?? body.amazon_url ?? null,
      amazon_asin: normalizedAsin,
      ebay_item_id: (body.ebay_item_id ?? body.ebayItemId)?.trim().substring(0, 50) || null,
      status: body.status || 'active',
      auto_order_enabled: body.auto_order_enabled ?? false,
      amazon_data: amazonData,
      ebay_data: ebayData,
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

    const { data: rpcResult, error: rpcErr } = await supabase.rpc('create_listing_with_usage', {
      p_user_id: userId,
      p_listing: normalizedListing,
    });

    if (rpcErr || !rpcResult) {
      const message = rpcErr?.message || 'Failed to create listing';
      const status = /(limit|credit|subscription|blocked|plan)/i.test(message) ? 402 : 500;
      console.error('[create-listing] Atomic create error:', { message });
      return new Response(
        JSON.stringify({ success: false, error: message, upgradeRequired: status === 402 }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const created = rpcResult.listing;
    const action = rpcResult.action === 'existing' ? 'existing' : 'created';
    const responseStatus = action === 'existing' ? 200 : 201;

    console.log(`[create-listing] ${action} listing: ${created?.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        action,
        listing: created,
        creditsRemaining: rpcResult.credits_remaining,
      }),
      { status: responseStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[create-listing] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = /(authorization|auth token|session)/i.test(errorMessage) ? 401 : 500;
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

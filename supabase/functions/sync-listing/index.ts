import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateUserPlan } from '../_shared/plan-middleware.ts';
import { checkRateLimit, getClientIp, rateLimitResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface ListingPayload {
  // Support both formats: extension format and direct format
  title: string;
  sku?: string;
  ebayPrice?: number;
  ebay_price?: number;
  amazonPrice?: number;
  amazon_price?: number;
  amazonUrl?: string;
  amazon_url?: string;
  amazon_asin?: string;
  ebay_item_id?: string;
  status?: string;

  // Raw metadata blobs (for dashboard backfill/debug)
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const ipLimit = await checkRateLimit(supabase, {
      bucket: 'sync-listing:ip',
      key: getClientIp(req),
      limit: 30,
      windowSeconds: 60,
    });
    if (!ipLimit.allowed) return rateLimitResponse(ipLimit, corsHeaders);
    
    // Support both Authorization header and x-api-key (for extension compatibility)
    let authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const apiKey = req.headers.get('x-api-key');
    
    // If x-api-key is provided and looks like a JWT, use it
    if (!authToken && apiKey && apiKey.includes('.')) {
      authToken = apiKey;
    }
    
    if (!authToken) {
      console.log('[sync-listing] No auth token found');
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get user ID
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error('[sync-listing] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-listing] User authenticated: ${user.id} (${user.email})`);

    const userLimit = await checkRateLimit(supabase, {
      bucket: 'sync-listing:user',
      key: user.id,
      limit: 60,
      windowSeconds: 60,
    });
    if (!userLimit.allowed) return rateLimitResponse(userLimit, corsHeaders);

    if (req.method === 'POST') {
      const body = await req.json();
      
      // Handle single listing or batch
      const listings: ListingPayload[] = Array.isArray(body) ? body : [body];
      
      console.log(`[sync-listing] Processing ${listings.length} listings`);

      // Count how many new listings will be created (not updates)
      let newListingsCount = 0;
      const results = [];
      
      // First pass: check which are new vs updates
      const listingsToProcess = [];
      for (const listing of listings) {
        const amazonData = safeParseJson((listing as any).amazon_data) ?? {};
        const ebayData = safeParseJson((listing as any).ebay_data) ?? {};

        const inferredTitle =
          (typeof listing.title === 'string' ? listing.title : '') ||
          ((ebayData as any)?.title as string) ||
          ((ebayData as any)?.ebayTitle as string) ||
          ((amazonData as any)?.title as string) ||
          ((amazonData as any)?.productTitle as string) ||
          '';

        const normalizedListing = {
          title: inferredTitle,
          sku: listing.sku || null,
          ebay_price: listing.ebayPrice ?? listing.ebay_price ?? null,
          amazon_price: listing.amazonPrice ?? listing.amazon_price ?? null,
          amazon_url: listing.amazonUrl ?? listing.amazon_url ?? null,
          amazon_asin:
            listing.amazon_asin ||
            extractAsinFromAmazonUrl(listing.amazonUrl ?? listing.amazon_url ?? null) ||
            null,
          ebay_item_id: listing.ebay_item_id || null,
          status: listing.status || 'active',

          // Persist blobs for backfill/debug
          amazon_data: (listing as any).amazon_data ?? amazonData,
          ebay_data: (listing as any).ebay_data ?? ebayData,
        };

        if (!normalizedListing.title) {
          results.push({ error: 'Title is required', listing });
          continue;
        }

        // Check if listing already exists
        let existingListing = null;
        
        if (normalizedListing.sku) {
          const { data } = await supabase
            .from('listings')
            .select('id')
            .eq('user_id', user.id)
            .eq('sku', normalizedListing.sku)
            .maybeSingle();
          existingListing = data;
        }
        
        if (!existingListing && normalizedListing.amazon_asin) {
          const { data } = await supabase
            .from('listings')
            .select('id')
            .eq('user_id', user.id)
            .eq('amazon_asin', normalizedListing.amazon_asin)
            .maybeSingle();
          existingListing = data;
        }

        if (!existingListing && normalizedListing.amazon_url) {
          const { data } = await supabase
            .from('listings')
            .select('id')
            .eq('user_id', user.id)
            .eq('amazon_url', normalizedListing.amazon_url)
            .maybeSingle();
          existingListing = data;
        }

        listingsToProcess.push({ normalizedListing, existingListing, original: listing });
        
        if (!existingListing) {
          newListingsCount++;
        }
      }

      // Check user credits for new listings
      if (newListingsCount > 0) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('credits, plan_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('[sync-listing] Error fetching profile:', profileError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch user profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let userCredits = profile?.credits ?? 0;

        // If the user has no profile yet (common for brand-new accounts), create it now.
        if (!profile) {
          const { data: createdProfile, error: createProfileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email ?? '',
              full_name: (user.user_metadata as any)?.full_name ?? user.email ?? null,
              credits: 0,
              is_active: true,
              plan_id: null,
            })
            .select('credits, plan_id')
            .single();

          if (createProfileError) {
            console.error('[sync-listing] Error creating profile:', createProfileError);
            return new Response(
              JSON.stringify({ error: 'Failed to initialize user profile' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          userCredits = createdProfile?.credits ?? 0;
        }

        console.log(`[sync-listing] User credits: ${userCredits}, new listings: ${newListingsCount}`);

        // Backend authoritative plan enforcement (listing + credits)
        const listingValidation = await validateUserPlan(supabase, user.id, 'listing', newListingsCount);
        if (!listingValidation.allowed) {
          console.log('[sync-listing] Listing validation blocked:', listingValidation);
          return new Response(
            JSON.stringify({
              success: false,
              error: listingValidation.reason ?? 'Listing limit reached',
              limitType: 'listings',
              current: listingValidation.current,
              limit: listingValidation.limit,
              upgradeRequired: true,
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const creditValidation = await validateUserPlan(supabase, user.id, 'credit', newListingsCount);
        if (!creditValidation.allowed) {
          console.log('[sync-listing] Credit validation blocked:', creditValidation);
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

        // Keep legacy credit check response for compatibility (should be redundant due to middleware)
        if (userCredits < newListingsCount) {
          console.log('[sync-listing] Insufficient credits (legacy check)');
          return new Response(
            JSON.stringify({
              success: false,
              error: 'You do not have enough credits to create a listing.',
              limitType: 'credits',
              current: userCredits,
              limit: newListingsCount,
              upgradeRequired: true,
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Process all listings
      let creditsDeducted = 0;
      
      for (const { normalizedListing, existingListing, original } of listingsToProcess) {
        console.log(`[sync-listing] Processing: ${normalizedListing.title}`);

        if (existingListing) {
          // Update existing listing
          const { data, error } = await supabase
            .from('listings')
            .update({
              ...normalizedListing,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingListing.id)
            .select()
            .single();

          if (error) {
            console.error('[sync-listing] Update error:', error);
            results.push({ error: error.message, listing: original });
          } else {
            console.log(`[sync-listing] Updated listing: ${data.id}`);
            results.push({ success: true, action: 'updated', data });
          }
        } else {
          // Create new listing
          const { data, error } = await supabase
            .from('listings')
            .insert({
              user_id: user.id,
              ...normalizedListing,
            })
            .select()
            .single();

          if (error) {
            console.error('[sync-listing] Insert error:', error);
            results.push({ error: error.message, listing: original });
          } else {
            console.log(`[sync-listing] Created listing: ${data.id}`);
            results.push({ success: true, action: 'created', data });
            creditsDeducted++;
          }
        }
      }

      // Deduct credits for successfully created listings
      if (creditsDeducted > 0) {
        const { error: creditError } = await supabase.rpc('deduct_credits', {
          user_id_param: user.id,
          amount: creditsDeducted
        });
        
        // Fallback to direct update if RPC doesn't exist
        if (creditError) {
          console.log('[sync-listing] RPC not available, using direct update');
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single();
          
          if (currentProfile) {
            await supabase
              .from('profiles')
              .update({ credits: Math.max(0, (currentProfile.credits || 0) - creditsDeducted) })
              .eq('id', user.id);
          }
        }
        
        console.log(`[sync-listing] Deducted ${creditsDeducted} credits from user`);
      }

      const response = { 
        success: true, 
        results,
        summary: {
          total: listings.length,
          created: results.filter(r => r.action === 'created').length,
          updated: results.filter(r => r.action === 'updated').length,
          errors: results.filter(r => r.error).length,
          creditsDeducted,
        }
      };

      console.log(`[sync-listing] Complete:`, response.summary);

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-listing] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

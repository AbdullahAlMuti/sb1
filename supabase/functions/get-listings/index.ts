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
    
    if (!authToken && apiKey && apiKey.includes('.')) {
      authToken = apiKey;
    }
    
    if (!authToken) {
      console.log('[get-listings] No auth token found');
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
      console.error('[get-listings] Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-listings] Fetching listings for user: ${user.id}`);

    // Parse query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');

    // Build query
    let query = supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: listings, error: listingsError, count } = await query;

    if (listingsError) {
      console.error('[get-listings] Query error:', listingsError);
      return new Response(
        JSON.stringify({ success: false, error: listingsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform listings to match extension format (camelCase)
    const transformedListings = (listings || []).map((listing: any) => ({
      id: listing.id,
      title: listing.title,
      sku: listing.sku,
      ebayPrice: listing.ebay_price,
      amazonPrice: listing.amazon_price,
      amazonUrl: listing.amazon_url,
      amazonAsin: listing.amazon_asin || listing.asin,
      ebayItemId: listing.ebay_item_id,
      status: listing.status,
      inventoryStatus: listing.inventory_status,
      autoOrderEnabled: listing.auto_order_enabled,
      amazonStockQuantity: listing.amazon_stock_quantity,
      amazonStockStatus: listing.amazon_stock_status,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
      lastChecked: listing.last_checked,
      priceLastUpdated: listing.price_last_updated,
      inventoryLastUpdated: listing.inventory_last_updated,
      // Calculate profit
      profit: listing.ebay_price && listing.amazon_price 
        ? listing.ebay_price - listing.amazon_price 
        : null,
    }));

    console.log(`[get-listings] Found ${listings?.length || 0} listings`);

    return new Response(
      JSON.stringify({
        success: true,
        listings: transformedListings,
        total: count || 0,
        limit,
        offset,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-listings] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

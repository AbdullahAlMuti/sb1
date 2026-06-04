import { resolveExtensionOrLegacyAuth, requireFeatureEntitlement, createServiceClient, corsHeaders } from '../_shared/extension-session.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();

    // Authenticate using the shared dual-auth resolver
    const authContext = await resolveExtensionOrLegacyAuth(supabase, req);
    const userId = authContext.userId;

    console.log(`[get-listings] Fetching listings for user: ${userId} (Mode: ${authContext.authMode})`);

    // Verify feature entitlement
    const hasAccess = await requireFeatureEntitlement(supabase, userId, authContext.workspaceId, "listing_access");
    if (!hasAccess) {
      console.warn(`[get-listings] User ${userId} missing listing_access entitlement`);
      return new Response(
        JSON.stringify({ success: false, error: "Feature not entitled or subscription inactive" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');

    // Build query
    let query = supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
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

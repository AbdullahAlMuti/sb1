import { resolveExtensionOrLegacyAuth, requireFeatureEntitlement, createServiceClient, extCorsHeaders } from '../_shared/extension-session.ts';

function getSourceMarketplace(listing: any): string | null {
  if (!listing) return null;

  // 1. Check direct URL field
  const url = listing.amazon_url || "";
  if (url) {
    if (url.toLowerCase().includes('walmart.')) return 'walmart';
    if (url.toLowerCase().includes('amazon.')) return 'amazon';
  }

  // 2. Check direct marketplace/source/supplier fields
  const rawSource = listing.supplier_marketplace || listing.source || listing.supplier || listing.source_marketplace || listing.sourceMarketplace || "";
  if (rawSource) {
    const valLower = String(rawSource).toLowerCase();
    if (valLower.includes('walmart') || valLower === 'wal' || valLower === 'wmt') return 'walmart';
    if (valLower.includes('amazon') || valLower === 'amz') return 'amazon';
  }

  // 3. Check inside amazon_data JSON/object
  try {
    const data = typeof listing.amazon_data === 'string'
      ? JSON.parse(listing.amazon_data)
      : listing.amazon_data;
    if (data) {
      const dataUrl = data.url || data.amazonUrl || data.productUrl || data.productURL || data.supplierUrl || data.supplierURL || "";
      if (dataUrl) {
        if (dataUrl.toLowerCase().includes('walmart.')) return 'walmart';
        if (dataUrl.toLowerCase().includes('amazon.')) return 'amazon';
      }
      const dataMarketplace = data.sourceMarketplace || data.supplierMarketplace || data.marketplace || data.source || data.supplier || "";
      if (dataMarketplace) {
        const valLower = String(dataMarketplace).toLowerCase();
        if (valLower.includes('walmart') || valLower === 'wal' || valLower === 'wmt') return 'walmart';
        if (valLower.includes('amazon') || valLower === 'amz') return 'amazon';
      }
    }
  } catch (_) {}

  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: extCorsHeaders(req) });
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
        { status: 403, headers: { ...extCorsHeaders(req), "Content-Type": "application/json" } }
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
        { status: 500, headers: { ...extCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Fetch associated variations for all listings in the page
    const listingIds = (listings || []).map((l: any) => l.id);
    const variationsGrouped: Record<string, any[]> = {};
    if (listingIds.length > 0) {
      const { data: variationsData, error: varError } = await supabase
        .from('listing_variations')
        .select('*')
        .in('listing_id', listingIds)
        .order('created_at', { ascending: true });

      if (varError) {
        console.error('[get-listings] Variations query error:', varError);
      } else if (variationsData) {
        for (const v of variationsData) {
          if (!variationsGrouped[v.listing_id]) {
            variationsGrouped[v.listing_id] = [];
          }
          variationsGrouped[v.listing_id].push({
            id: v.id,
            listingId: v.listing_id,
            sku: v.sku,
            ebaySkuEncoded: v.ebay_sku_encoded,
            rawSupplierPrice: v.raw_supplier_price ? Number(v.raw_supplier_price) : null,
            finalPrice: Number(v.final_price) || 0,
            currency: v.currency,
            stockQuantity: v.stock_quantity,
            attributes: v.attributes,
            createdAt: v.created_at,
            updatedAt: v.updated_at,
          });
        }
      }
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
      sourceMarketplace: getSourceMarketplace(listing),
      hasVariations: listing.has_variations || false,
      variationCount: listing.variation_count || 0,
      priceLow: listing.price_low ? Number(listing.price_low) : null,
      priceHigh: listing.price_high ? Number(listing.price_high) : null,
      variations: variationsGrouped[listing.id] || [],
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
      { headers: { ...extCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-listings] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...extCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});

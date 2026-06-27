import { useQuery } from "@tanstack/react-query";
import { supabase } from "@repo/api-client/supabase/client";

export interface Listing {
  id: string;
  created_at: string;
  title: string | null;
  sku: string | null;
  ebay_item_id: string | null;
  ebay_price: number | null;
  amazon_price: number | null;
  amazon_asin: string | null;
  amazon_url: string | null;
  image_url: string | null;
  status: string | null;
  auto_order_enabled: boolean | null;
  sourceMarketplace?: string | null;
  source_marketplace?: string | null;
  has_variations?: boolean | null;
  variation_count?: number | null;
  price_low?: number | null;
  price_high?: number | null;
  // Legacy/backfill fields
  asin?: string | null;
  price?: number | null;
  amazon_data?: any;
  ebay_data?: any;
  amazon_stock_quantity?: number | null;
  amazon_stock_status?: string | null;
  price_last_updated?: string | null;
  inventory_last_updated?: string | null;
  sync_error?: string | null;
}

function safeParseJson(val: unknown) {
  if (!val) return null;
  if (typeof val === 'object') return val as any;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return null;
}

export function normalizeListingRow(row: any): Listing {
  const amazonData = safeParseJson(row?.amazon_data) ?? {};
  const ebayData = safeParseJson(row?.ebay_data) ?? {};

  const title =
    row?.title ??
    ebayData?.title ??
    ebayData?.ebayTitle ??
    amazonData?.title ??
    amazonData?.productTitle ??
    null;

  const sku = row?.sku ?? ebayData?.sku ?? ebayData?.ebaySku ?? null;

  const amazonAsin =
    row?.amazon_asin ??
    row?.asin ??
    amazonData?.asin ??
    amazonData?.amazonAsin ??
    amazonData?.ASIN ??
    null;

  const amazonUrl =
    row?.amazon_url ??
    amazonData?.url ??
    amazonData?.amazonUrl ??
    amazonData?.productURL ??
    amazonData?.productUrl ??
    null;

  const ebayPrice =
    row?.ebay_price ??
    row?.sell_price ??
    ebayData?.price ??
    ebayData?.finalPrice ??
    row?.price ??
    null;

  const amazonPrice =
    row?.amazon_price ??
    row?.source_price ??
    amazonData?.price ??
    amazonData?.amazonPrice ??
    null;

  let imageUrl =
    amazonData?.image ??
    amazonData?.imageUrl ??
    amazonData?.mainImage ??
    amazonData?.productImage ??
    amazonData?.images?.[0] ??
    ebayData?.image ??
    ebayData?.imageUrl ??
    ebayData?.galleryURL ??
    null;

  let sourceMarketplace: string | null = null;
  const rawSource = row?.sourceMarketplace ?? row?.source_marketplace ?? row?.supplierMarketplace ?? row?.supplier_marketplace ?? null;
  if (rawSource) {
    const s = String(rawSource).toLowerCase();
    if (s.includes('walmart') || s === 'wal' || s === 'wmt') {
      sourceMarketplace = 'walmart';
    } else if (s.includes('amazon') || s === 'amz') {
      sourceMarketplace = 'amazon';
    }
  }

  if (!sourceMarketplace && amazonUrl) {
    const urlLower = amazonUrl.toLowerCase();
    if (urlLower.includes('walmart.')) {
      sourceMarketplace = 'walmart';
    } else if (urlLower.includes('amazon.')) {
      sourceMarketplace = 'amazon';
    }
  }

  return {
    ...row,
    title,
    sku,
    amazon_asin: amazonAsin,
    amazon_url: amazonUrl,
    image_url: imageUrl,
    ebay_price: typeof ebayPrice === 'number' ? ebayPrice : (ebayPrice ? Number(ebayPrice) : null),
    amazon_price: typeof amazonPrice === 'number' ? amazonPrice : (amazonPrice ? Number(amazonPrice) : null),
    source_marketplace: sourceMarketplace,
    sourceMarketplace: sourceMarketplace,
  } as Listing;
}

export function useListings(userId: string | undefined) {
  return useQuery({
    queryKey: ['listings', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("[useListings] Query error:", error);
        throw error;
      }
      
      return (data || []).map(normalizeListingRow);
    },
    enabled: !!userId,
    // By default, react-query will refetch on window focus. 
    // We can let it do its magic or configure staleTime.
    staleTime: 1000 * 60 * 5, // 5 minutes (Realtime handles updates)
  });
}

export type MarketplaceProvider = "ebay" | "shopify" | "amazon";

export interface MarketplaceScoped {
  provider: MarketplaceProvider;
}

export interface NormalizedMarketplaceProduct extends MarketplaceScoped {
  id: string;
  title: string;
  sourceUrl?: string;
  imageUrl?: string;
}

export interface NormalizedMarketplaceListing extends MarketplaceScoped {
  id: string;
  productId?: string;
  title: string;
  status?: string;
}

export interface NormalizedMarketplaceOrder extends MarketplaceScoped {
  id: string;
  orderNumber?: string;
  status?: string;
  total?: number;
  currency?: string;
}

export interface MarketplaceProviderFilter {
  provider?: MarketplaceProvider;
}

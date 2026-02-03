export type ListingSourceId = "amazon" | "walmart" | "aliexpress" | "ebay";

export interface ListingSource {
  id: ListingSourceId;
  name: string;
  description: string;
  homepageUrl: string;
  logoPath?: string;
}

// Configurable list of supported listing sources for the "New Listing" selector.
// Add new platforms here without touching the UI implementation.
export const LISTING_SOURCES: ListingSource[] = [
  {
    id: "amazon",
    name: "Amazon",
    description: "Find a product on Amazon to source from.",
    homepageUrl: "https://www.amazon.com",
    logoPath: "/logos/amazon.ico",
  },
  {
    id: "walmart",
    name: "Walmart",
    description: "Browse Walmart listings and pricing.",
    homepageUrl: "https://www.walmart.com",
    logoPath: "/logos/walmart.ico",
  },
  {
    id: "aliexpress",
    name: "AliExpress",
    description: "Explore low-cost suppliers and variations.",
    homepageUrl: "https://www.aliexpress.com",
    logoPath: "/logos/aliexpress.ico",
  },
  {
    id: "ebay",
    name: "eBay",
    description: "Check comps and demand on eBay.",
    homepageUrl: "https://www.ebay.com",
    logoPath: "/logos/ebay.ico",
  },
];

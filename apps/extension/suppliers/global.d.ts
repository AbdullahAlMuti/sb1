// global.d.ts — ambient declarations for the window.SS* global pattern used by
// content scripts (no bundler-era module imports yet; load order via manifest).
// Keeps `npx tsc -p jsconfig.json` (checkJs) clean for the suppliers/ tree.

export {};

declare global {
  interface Window {
    // Supplier plugin system (suppliers/)
    SSSupplierAdapter: {
      REQUIRED_FIELDS: string[];
      validate(product: object): { valid: boolean; errors: string[] };
      assertContract(adapter: object): boolean;
    };
    SSSupplierRegistry: {
      register(adapter: object): object;
      match(url: string): any | null;
      get(supplierId: string): any | null;
      list(): string[];
      _reset(): void;
    };
    SSAmazonAdapter: any;
    SSWalmartAdapter: any;
    SSAliExpressDomains: {
      generatedAt: string;
      domains: string[];
      imageHosts: string[];
    };
    SSAliExpressAdapter: any;
    SSVariationNormalizer: {
      normalizeProduct(product: object, options?: object): object;
    };

    // Legacy scraper globals the adapters delegate to (defined in content_scripts/)
    SsAmazonVariantScraper: any;
    SsAmazonScraperV2: any;
    SsWalmartVariantScraper: any;
    SSWalmartScraper: {
      scrapeProduct(opts?: object): Promise<any>;
      scrapeVariants(opts?: object): Promise<any>;
    };
    SSAliExpressScraper: {
      scrapeSingleProduct(opts?: object): Promise<any>;
      scrapeProductWithVariants(opts?: object): Promise<any>;
      extractProductDocument(doc?: Document, url?: string): object;
    };
  }
}

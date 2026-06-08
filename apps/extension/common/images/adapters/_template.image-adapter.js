// Template for future marketplace adapters.
// Copy this file, rename to <marketplace>.image-adapter.js, fill each method.

class _TemplateImageAdapter {
  constructor() {
    this.marketplace = 'MARKETPLACE_NAME'; // e.g. 'aliexpress', 'temu'
  }

  // Return product id string from URL or DOM
  getProductId() {
    throw new Error('Not implemented');
  }

  // Tier 1: Extract from hydration data (__NEXT_DATA__, server-rendered JSON, etc.)
  // Return ExtractedImage[] — use window.SSImageSchema.createExtractedImage
  async getHydrationImages() {
    return [];
  }

  // Tier 2: Extract from DOM data attributes (e.g. data-a-dynamic-image equivalent)
  async getDynamicAttrImages() {
    return [];
  }

  // Tier 3: Extract from inline <script> JSON blobs via regex
  async getScriptImages() {
    return [];
  }

  // Tier 4: Extract from thumbnail gallery DOM
  async getThumbnailImages() {
    return [];
  }

  // Tier 5: Modal/click-based fallback. Return [] if marketplace has none.
  async getModalImages() {
    return [];
  }

  // Variation → image mapping. Return ExtractedImage[] with variantKey set.
  async getVariationImages() {
    return [];
  }
}

// Register on window:
// if (typeof window !== 'undefined') window.XxxImageAdapter = _TemplateImageAdapter;

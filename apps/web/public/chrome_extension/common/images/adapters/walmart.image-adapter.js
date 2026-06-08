// Walmart image adapter — hydration-first, no mandatory HEAD

class WalmartImageAdapter {
  constructor() {
    this.marketplace = 'walmart';
  }

  // ─── Product ID ───────────────────────────────────────────────

  getProductId() {
    return window.location.pathname.match(/\/ip\/[^/]+\/(\d+)/)?.[1]
      || window.location.pathname.match(/\/(\d{8,12})(?:\/|$|\?)/)?.[1]
      || null;
  }

  // ─── Tier 1: __NEXT_DATA__ / hydration JSON ───────────────────

  async getHydrationImages() {
    const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
    const images = [];

    const nextDataEl = document.getElementById('__NEXT_DATA__');
    if (!nextDataEl) return images;

    let data;
    try { data = JSON.parse(nextDataEl.textContent); } catch { return images; }

    // Navigate possible paths for imageInfo
    const product = this._dig(data,
      'props.pageProps.initialData.data.product',
      'props.pageProps.product',
      'props.initialData.data.product'
    );

    if (!product) return images;

    // imageInfo.allImages — preferred ordered array
    const allImages = this._dig(product, 'imageInfo.allImages', 'imageInfo.images');
    if (Array.isArray(allImages)) {
      allImages.forEach((item, idx) => {
        const url = item.url || item.imageUrl || item.largeImage || item.zoomUrl;
        if (!url) return;
        images.push(createExtractedImage({
          url,
          source:    ImageSource.HYDRATION,
          role:      idx === 0 ? ImageRole.MAIN : ImageRole.GALLERY,
          alt:       item.altText || 'Product Image'
        }));
      });
      if (images.length) return images;
    }

    // Fallback fields on product root
    for (const field of ['primaryImage', 'imageUrl', 'largeImage', 'heroImage']) {
      const url = product[field];
      if (url && typeof url === 'string') {
        images.push(createExtractedImage({
          url,
          source: ImageSource.HYDRATION,
          role:   ImageRole.MAIN
        }));
      }
    }

    return images;
  }

  // ─── Tier 2: JSON-LD ──────────────────────────────────────────

  async getDynamicAttrImages() {
    const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
    const images = [];

    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const el of ldScripts) {
      let data;
      try { data = JSON.parse(el.textContent); } catch { continue; }

      const img = data.image;
      if (!img) continue;

      const urls = Array.isArray(img) ? img : [img];
      urls.forEach((url, idx) => {
        const u = typeof url === 'string' ? url : url?.url;
        if (!u) return;
        images.push(createExtractedImage({
          url:    u,
          source: ImageSource.DYNAMIC_ATTR,
          role:   idx === 0 ? ImageRole.MAIN : ImageRole.GALLERY
        }));
      });
    }

    return images;
  }

  // ─── Tier 3: Loose script regex ───────────────────────────────

  async getScriptImages() {
    const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
    const images = [];
    const seen   = new Set();

    const patterns = [
      /"imageUrl"\s*:\s*"([^"]+walmartimages[^"]+)"/g,
      /"url"\s*:\s*"([^"]+walmartimages[^"]+)"/g,
      /"largeImage"\s*:\s*"([^"]+)"/g,
      /"heroImage"\s*:\s*"([^"]+)"/g,
      /"zoomImage"\s*:\s*"([^"]+)"/g
    ];

    const scripts = document.querySelectorAll('script:not([src]):not([type="application/ld+json"])');
    for (const el of scripts) {
      const text = el.textContent || '';
      if (!text.includes('walmartimages') && !text.includes('imageUrl')) continue;

      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        let m;
        while ((m = pattern.exec(text)) !== null) {
          let url = m[1].replace(/\\u002F/g, '/').replace(/\\/g, '').replace(/&amp;/g, '&');
          if (!url.startsWith('http') || seen.has(url)) continue;
          seen.add(url);
          images.push(createExtractedImage({
            url,
            source: ImageSource.SCRIPT,
            role:   ImageRole.GALLERY
          }));
        }
      }
    }

    return images;
  }

  // ─── Tier 4: Thumbnail DOM ────────────────────────────────────

  async getThumbnailImages() {
    const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
    const images = [];
    const seen   = new Set();

    const mainSection = document.querySelector(
      '[data-testid="image-gallery"], .prod-hero-image-area, .prod-ProductImageCarousel'
    );
    const root = mainSection || document;

    const imgs = root.querySelectorAll('[data-testid="hero-image"] img, [data-testid="media-thumbnail"] img, .prod-hero-image img');
    for (const img of imgs) {
      const url = img.dataset?.src || img.getAttribute('data-src')
        || img.getAttribute('data-lazy-src') || img.src;
      if (!url || !url.startsWith('http') || seen.has(url)) continue;
      seen.add(url);
      images.push(createExtractedImage({
        url,
        source: ImageSource.THUMBNAIL,
        role:   ImageRole.GALLERY,
        alt:    img.alt || 'Product Image'
      }));
    }

    return images;
  }

  // No variation images for Walmart MVP (single-page product, no color map)
  async getVariationImages() { return []; }

  // No modal needed for Walmart
  async getModalImages() { return []; }

  // ─── Helpers ──────────────────────────────────────────────────

  // Walk dotted paths until one returns a value
  _dig(obj, ...paths) {
    for (const path of paths) {
      let cur = obj;
      for (const key of path.split('.')) {
        if (cur == null) break;
        cur = cur[key];
      }
      if (cur != null) return cur;
    }
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.WalmartImageAdapter = WalmartImageAdapter;
}

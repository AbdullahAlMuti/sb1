// Amazon image adapter — data-first extraction
// Tier order: ImageBlockATF/colorImages → data-a-dynamic-image → script regex → altImages DOM → modal fallback

class AmazonImageAdapter {
  constructor() {
    this.marketplace = 'amazon';
    this._scriptCache = null; // parsed colorImages data, cached after first parse
  }

  // ─── Product ID ───────────────────────────────────────────────

  getProductId() {
    return document.querySelector('input#asin')?.value
      || document.querySelector('input[name="ASIN"]')?.value
      || window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1]
      || window.location.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/)?.[1]
      || null;
  }

  // ─── Tier 1: ImageBlockATF / colorImages ─────────────────────

  async getHydrationImages() {
    const data = this._parseScriptData();
    if (!data) return [];

    const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
    const images = [];

    // colorImages.initial — main product gallery
    const initial = data.colorImages?.initial;
    if (Array.isArray(initial)) {
      initial.forEach((item, idx) => {
        const url = item.hiRes || item.large;
        if (!url) return;
        images.push(createExtractedImage({
          url,
          source:     ImageSource.HYDRATION,
          role:       idx === 0 ? ImageRole.MAIN : ImageRole.GALLERY,
          width:      item.hiRes ? 3000 : (item.large ? 1500 : 0),
          height:     item.hiRes ? 3000 : (item.large ? 1500 : 0),
          alt:        item.variant || 'Product Image',
          variantKey: null
        }));
      });
    }

    return images;
  }

  // ─── Tier 2: data-a-dynamic-image ────────────────────────────

  async getDynamicAttrImages() {
    const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
    const images = [];

    const selectors = [
      '#landingImage[data-a-dynamic-image]',
      '#imgBlkFront[data-a-dynamic-image]',
      '#main-image[data-a-dynamic-image]',
      '.a-dynamic-image[data-a-dynamic-image]'
    ];

    const seen = new Set();
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const raw = el.getAttribute('data-a-dynamic-image');
      if (!raw) continue;
      let parsed;
      try { parsed = JSON.parse(raw); } catch { continue; }

      const url = this._largestFromMap(parsed);
      if (!url || seen.has(url)) continue;
      seen.add(url);

      const dims = parsed[url];
      images.push(createExtractedImage({
        url,
        source:    ImageSource.DYNAMIC_ATTR,
        role:      ImageRole.MAIN,
        width:     Array.isArray(dims) ? dims[0] : 0,
        height:    Array.isArray(dims) ? dims[1] : 0,
        alt:       el.alt || 'Product Image'
      }));
    }

    return images;
  }

  // ─── Tier 3: Inline script colorImages (loose regex + repair) ─

  async getScriptImages() {
    const data = this._parseScriptData();
    if (!data) return [];
    // colorImages already extracted in tier 1.
    // Tier 3 adds variation color-keyed images from colorImages map.
    return this._extractColorKeyImages(data.colorImages || {});
  }

  // ─── Tier 4: Thumbnail DOM (#altImages strip) ─────────────────

  async getThumbnailImages() {
    const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
    const images = [];

    const altImages = document.querySelector('#altImages');
    if (!altImages) return images;

    const items = altImages.querySelectorAll('li.a-spacing-small, li.item, li[class*="image"]');
    for (const item of items) {
      if (this._isExcludedItem(item)) continue;
      const img = item.querySelector('img');
      if (!img || this._isExcludedImg(img)) continue;

      const url = this._hiResFromImg(img);
      if (!url) continue;

      images.push(createExtractedImage({
        url,
        source:    ImageSource.THUMBNAIL,
        role:      ImageRole.GALLERY,
        alt:       img.alt || 'Product Image'
      }));
    }

    return images;
  }

  // ─── Tier 5: Modal fallback ───────────────────────────────────

  async getModalImages() {
    if (typeof window.FullViewImageExtractor === 'undefined') return [];
    try {
      const extractor = new window.FullViewImageExtractor();
      const result = await extractor.extractAllProductImagesFromFullView();
      const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
      return (result?.images || []).map(img => createExtractedImage({
        url:    img.url,
        source: ImageSource.MODAL,
        role:   ImageRole.GALLERY,
        alt:    img.alt || 'Product Image'
      }));
    } catch { return []; }
  }

  // ─── Variation images ─────────────────────────────────────────

  async getVariationImages() {
    const data = this._parseScriptData();
    if (!data) return [];
    return this._extractColorKeyImages(data.colorImages || {});
  }

  // ─── Script parse (cached) ────────────────────────────────────

  _parseScriptData() {
    if (this._scriptCache !== null) return this._scriptCache;

    const scripts = document.querySelectorAll('script:not([src])');
    for (const script of scripts) {
      const text = script.textContent || '';
      if (!text.includes('ImageBlockATF') && !text.includes('colorImages')) continue;

      // ImageBlockATF pattern
      const atfMatch = text.match(/P\.when\(['"]A['"]\)\.register\(['"]ImageBlockATF['"],\s*function\([^)]*\)\s*\{\s*var data\s*=\s*(\{[\s\S]*?\});\s*(?:A|return)/);
      if (atfMatch) {
        const parsed = this._safeParseJson(atfMatch[1]);
        if (parsed?.colorImages) {
          this._scriptCache = { colorImages: parsed.colorImages };
          return this._scriptCache;
        }
      }

      // Looser colorImages pattern
      const ciMatch = text.match(/"colorImages"\s*:\s*(\{[\s\S]{20,8000}?\})\s*[,}]/);
      if (ciMatch) {
        const parsed = this._safeParseJson(`{"colorImages":${ciMatch[1]}}`);
        if (parsed?.colorImages) {
          this._scriptCache = { colorImages: parsed.colorImages };
          return this._scriptCache;
        }
      }
    }

    this._scriptCache = null;
    return null;
  }

  _safeParseJson(str) {
    try { return JSON.parse(str); } catch {}
    try { return JSON.parse(this._repairJson(str)); } catch {}
    return null;
  }

  // Clean-room JSON repair for Amazon script data
  _repairJson(str) {
    let s = str;
    // Remove trailing commas before ] or }
    s = s.replace(/,(\s*[}\]])/g, '$1');
    // Quote unquoted keys
    s = s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3');
    // Replace Date.now() with 0
    s = s.replace(/Date\.now\(\)/g, '0');
    // Replace undefined with null
    s = s.replace(/\bundefined\b/g, 'null');
    // Remove single-line // comments (outside strings — approximate)
    s = s.replace(/\/\/[^\n"]*/g, '');
    // Remove multi-char sequences like /////...////
    s = s.replace(/\/{3,}[\s\S]*?\/{3,}/g, '""');
    return s;
  }

  _extractColorKeyImages(colorImages) {
    const { ImageSource, ImageRole, createExtractedImage } = window.SSImageSchema;
    const images = [];

    for (const key in colorImages) {
      const entry = colorImages[key];
      const item  = Array.isArray(entry) ? entry[0] : entry;
      if (!item) continue;
      const url = item.hiRes || item.large;
      if (!url) continue;

      images.push(createExtractedImage({
        url,
        source:     ImageSource.SCRIPT,
        role:       ImageRole.VARIATION,
        alt:        key,
        variantKey: key,
        width:      item.hiRes ? 3000 : 0
      }));
    }

    return images;
  }

  _largestFromMap(map) {
    if (!map || typeof map !== 'object') return null;
    return Object.keys(map).reduce((best, url) => {
      if (!best) return url;
      const dimA = map[best];
      const dimB = map[url];
      const scoreA = Array.isArray(dimA) ? dimA[0] * dimA[1] : 0;
      const scoreB = Array.isArray(dimB) ? dimB[0] * dimB[1] : 0;
      return scoreB > scoreA ? url : best;
    }, null);
  }

  _hiResFromImg(img) {
    return img.getAttribute('data-old-hires')
      || (() => {
          const raw = img.getAttribute('data-a-dynamic-image');
          if (!raw) return null;
          try { return this._largestFromMap(JSON.parse(raw)); } catch { return null; }
        })()
      || (img.src && img.src.startsWith('http') ? img.src : null);
  }

  _isExcludedItem(item) {
    const cls = item.className || '';
    const html = item.innerHTML || '';
    return cls.includes('video') || cls.includes('360') || cls.includes('spin')
      || html.includes('360') || item.querySelector('[class*="video"],[class*="360"],[class*="spin"]')
      || cls.includes('aok-hidden') || item.style?.display === 'none';
  }

  _isExcludedImg(img) {
    const src = (img.src || '').toLowerCase();
    const alt = (img.alt || '').toLowerCase();
    const cls = (img.className || '').toLowerCase();
    const bad = ['video','play-button','play_icon','play-icon','360','spin','sprite','icon',
                 'transparent-pixel','spacer','loading','placeholder'];
    if (bad.some(p => src.includes(p) || alt.includes(p) || cls.includes(p))) return true;
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (w > 0 && w < 30 && h > 0 && h < 30) return true;
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.AmazonImageAdapter = AmazonImageAdapter;
}

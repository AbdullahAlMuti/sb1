// Runs 5-tier priority ladder for any marketplace adapter.
// Depends on: image-schema.js, image-normalizer.js, image-deduper.js, image-validator.js

class ExtractionEngine {
  constructor() {
    this._schema    = window.SSImageSchema;
    this._normalizer = window.SSImageNormalizer;
    this._deduper   = window.SSImageDeduper;
    this._validator = window.SSImageValidator;
  }

  // Main entry. adapter = marketplace adapter instance.
  async extract(adapter, options = {}) {
    const {
      minConfidentImages = 1,  // stop early if hydration/dynamic-attr gives this many
      maxModalFallback   = true // allow tier 5 (modal) — set false to disable
    } = options;

    const marketplace = adapter.marketplace;
    const rawImages   = [];

    // --- Tier ladder ---
    const tiers = [
      { name: 'hydration',    fn: () => adapter.getHydrationImages(),   earlyStop: true  },
      { name: 'dynamic-attr', fn: () => adapter.getDynamicAttrImages(), earlyStop: true  },
      { name: 'script',       fn: () => adapter.getScriptImages(),      earlyStop: false },
      { name: 'thumbnail',    fn: () => adapter.getThumbnailImages(),   earlyStop: false },
      { name: 'modal',        fn: () => maxModalFallback && adapter.getModalImages?.(), earlyStop: false }
    ];

    for (const tier of tiers) {
      let results;
      try {
        results = await tier.fn();
      } catch (err) {
        console.warn(`[ExtractionEngine:${marketplace}] Tier "${tier.name}" error:`, err?.message);
        continue;
      }
      if (!results || !results.length) continue;

      rawImages.push(...results);

      // Early stop: high-confidence tiers gave enough images
      if (tier.earlyStop) {
        const highConf = rawImages.filter(img => img.confidence >= 0.85);
        if (highConf.length >= minConfidentImages) break;
      }
    }

    // Variation images (additive — never stop-early)
    try {
      const varImages = await adapter.getVariationImages?.();
      if (varImages?.length) rawImages.push(...varImages);
    } catch (err) {
      console.warn(`[ExtractionEngine:${marketplace}] Variation images error:`, err?.message);
    }

    // Normalize → assign ids → dedup → validate → sort
    const normalized = rawImages.map(img =>
      this._normalizer.normalizeImage(img, marketplace)
    );

    const withIds = this._deduper.assignIds(normalized, marketplace);
    const deduped = this._deduper.dedup(withIds);
    const valid   = await this._validator.filter(deduped, marketplace);

    valid.sort((a, b) => {
      // main first, then gallery/variation by confidence desc
      if (a.role === 'main' && b.role !== 'main') return -1;
      if (b.role === 'main' && a.role !== 'main') return  1;
      return b.confidence - a.confidence;
    });

    console.log(`[ExtractionEngine:${marketplace}] ${valid.length} images extracted`);
    return valid;
  }
}

if (typeof window !== 'undefined') {
  window.SSExtractionEngine = ExtractionEngine;
}

// walmart-variant-scraper.js — data-first Walmart product + variation scraper.
// Mirrors content_scripts/amazon-variant-scraper.js in role and output shape.
//
// Data source: the page's __NEXT_DATA__ JSON (script#__NEXT_DATA__), path
// props.pageProps.initialData.data.product. No DOM clicking, no modal walking.
//
// Output variants use the SAME universal shape the Amazon scraper emits, so the
// editor / pricing / SKU / eBay upload pipeline needs zero Walmart knowledge:
//   { attrs: { "Color": { productName: "Red" } }, price, currency, quantity,
//     img, imgProp, supplierVariantId }
//
// All parse functions are pure (JSON in → object out) and exposed via _internals
// for unit tests (same pattern as amazon-variant-scraper json-repair tests).

window.SsWalmartVariantScraper = (() => {
  'use strict';

  /* ── Pure helpers ──────────────────────────────────────────────────────── */

  // "actual_color" → "Color", "shoe_size" → "Shoe Size", "clothing_size" → "Size"
  function humanizeDimLabel(id) {
    let s = String(id || '').replace(/^actual_/, '').replace(/^clothing_/, '');
    s = s.replace(/_/g, ' ').trim();
    return s.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Option';
  }

  // Read the embedded product JSON. Tries the known walmart.com Next.js paths.
  function getProductJson(doc) {
    const el = (doc || document).getElementById('__NEXT_DATA__');
    if (!el || !el.textContent) return null;
    let root;
    try {
      root = JSON.parse(el.textContent);
    } catch (_) {
      return null;
    }
    return (
      root?.props?.pageProps?.initialData?.data?.product ||
      root?.props?.pageProps?.initialData?.product ||
      root?.props?.pageProps?.product ||
      null
    );
  }

  // Parent-level fields from the product JSON.
  function parseProduct(p) {
    if (!p || typeof p !== 'object') return null;
    const price =
      p.priceInfo?.currentPrice?.price ??
      p.priceInfo?.unitPrice?.price ??
      null;
    const images = Array.isArray(p.imageInfo?.allImages)
      ? p.imageInfo.allImages.map((i) => i?.url).filter(Boolean)
      : [];
    return {
      sourceId: p.usItemId || p.id || '',
      title: p.name || '',
      brand: p.brand || '',
      price: price != null ? String(price) : '',
      currency: p.priceInfo?.currentPrice?.currencyUnit || 'USD',
      images,
      mainImage: images[0] || p.imageInfo?.thumbnailUrl || '',
      description: p.shortDescription || '',
      availabilityStatus: p.availabilityStatus || '',
      quantity: p.availabilityStatus === 'OUT_OF_STOCK' ? 0 : 1,
    };
  }

  /**
   * variantCriteria + variantsMap → universal variants array.
   *
   * variantCriteria: [{ id: 'actual_color', name?, variantList: [{ id: 'actual_color-Black',
   *   name: 'Black', images?: [url], products?: [usItemId], availabilityStatus? }] }]
   * variantsMap: { '<key>': { usItemId, variants: ['actual_color-Black', 'shoe_size-7'],
   *   priceInfo?: { currentPrice: { price } }, availabilityStatus?, productImageUrl? } }
   */
  function parseVariants(p) {
    const criteria = Array.isArray(p?.variantCriteria) ? p.variantCriteria : [];
    const map = p?.variantsMap && typeof p.variantsMap === 'object' ? p.variantsMap : {};

    // criteriaId → { label, values: { valueId → { name, image } } }
    const dims = {};
    for (const c of criteria) {
      if (!c || !c.id) continue;
      const label = humanizeDimLabel(c.name || c.id);
      const values = {};
      for (const v of c.variantList || []) {
        if (!v || !v.id) continue;
        values[v.id] = {
          name: v.name || String(v.id).split('-').slice(1).join('-'),
          image: Array.isArray(v.images) ? v.images[0] : null,
        };
      }
      dims[c.id] = { label, values };
    }

    const parentPrice = parseProduct(p)?.price || '';
    const imgProp = (() => {
      const colorDim = Object.values(dims).find((d) => /colou?r/i.test(d.label));
      return colorDim ? colorDim.label : Object.values(dims)[0]?.label || null;
    })();

    const variants = [];
    for (const [key, entry] of Object.entries(map)) {
      if (!entry || typeof entry !== 'object') continue;
      const attrs = {};
      let img = entry.productImageUrl || entry.imageInfo?.thumbnailUrl || null;
      for (const valueId of entry.variants || []) {
        const criteriaId = String(valueId).split('-')[0];
        const dim = dims[criteriaId];
        if (!dim) continue;
        const val = dim.values[valueId];
        const name = val?.name || String(valueId).split('-').slice(1).join('-');
        if (name) attrs[dim.label] = { productName: name };
        if (!img && val?.image) img = val.image;
      }
      if (Object.keys(attrs).length === 0) continue;
      const rawPrice = entry.priceInfo?.currentPrice?.price;
      variants.push({
        attrs,
        price: rawPrice != null ? String(rawPrice) : parentPrice,
        currency: entry.priceInfo?.currentPrice?.currencyUnit || 'USD',
        quantity: entry.availabilityStatus === 'OUT_OF_STOCK' ? 0 : 1,
        img,
        imgProp,
        supplierVariantId: entry.usItemId || key,
      });
    }
    return variants;
  }

  // Full parse: product JSON → normalized-ready product (universal shape).
  function buildProduct(p, pageUrl) {
    const base = parseProduct(p);
    if (!base) return null;
    const variants = parseVariants(p);
    return {
      ...base,
      url: pageUrl || '',
      supplier: 'walmart',
      hasVariants: variants.length > 1,
      variants,
    };
  }

  /* ── DOM-facing entry points (content script context) ──────────────────── */

  async function scrapeProductWithVariants() {
    const p = getProductJson(document);
    if (!p) throw new Error('Walmart __NEXT_DATA__ product JSON not found');
    const product = buildProduct(p, window.location.href);
    if (!product || !product.title) throw new Error('Walmart product parse failed');
    return product;
  }

  async function scrapeSingleProduct() {
    const product = await scrapeProductWithVariants();
    // Single mode: the page's usItemId IS the selected variant's usItemId on
    // walmart.com — keep that one; fall back to first variant, else none.
    const selected =
      product.variants.find((v) => v.supplierVariantId === product.sourceId) ||
      product.variants[0];
    return { ...product, hasVariants: false, variants: selected ? [selected] : [] };
  }

  return {
    scrapeProductWithVariants,
    scrapeSingleProduct,
    _internals: { humanizeDimLabel, getProductJson, parseProduct, parseVariants, buildProduct },
  };
})();

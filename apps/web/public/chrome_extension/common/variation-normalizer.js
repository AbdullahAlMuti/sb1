// variation-normalizer.js — canonical supplier-neutral variation rows.
// Input may be Amazon/Walmart scraper rows; output keeps the existing attrs
// contract while adding stable keys for editor, eBay upload, and DB sync.

window.SSVariationNormalizer = (() => {
  'use strict';

  const SEP = '\u001f';
  // Directional marks, zero-width chars, soft hyphen, word joiner, BOM all
  // survive copy from Amazon swatch labels and break combination-key equality.
  const INVISIBLE = /[​-‏‪-‮­⁠﻿]/g;

  function _text(value) {
    if (value == null) return '';
    if (typeof value === 'object') {
      return String(value.productName ?? value.value ?? value.name ?? '').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
    }
    return String(value).replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
  }

  function normalizeLabel(label) {
    let s = _text(label).replace(/[:]+$/g, '');
    if (!s) return '';
    s = s.replace(/^variation[_\s-]*/i, '');
    s = s.replace(/^actual[_\s-]*/i, '');
    s = s.replace(/^clothing[_\s-]*/i, '');
    s = s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    const low = s.toLowerCase();
    if (['colour', 'color name', 'colour name'].includes(low)) return 'Color';
    if (['size name', 'variation size name'].includes(low)) return 'Size';
    if (low === 'style name') return 'Style';
    return s.replace(/\b\w/g, ch => ch.toUpperCase());
  }

  function normalizeValue(value) {
    return _text(value);
  }

  function _optionValuesFrom(source) {
    const out = {};
    if (!source || typeof source !== 'object') return out;
    for (const [rawKey, rawValue] of Object.entries(source)) {
      const key = normalizeLabel(rawKey);
      const value = normalizeValue(rawValue);
      if (key && value) out[key] = value;
    }
    return out;
  }

  function optionValuesFromVariant(variant) {
    const direct = _optionValuesFrom(variant && variant.optionValues);
    if (Object.keys(direct).length) return direct;
    const attrs = _optionValuesFrom(variant && variant.attrs);
    if (Object.keys(attrs).length) return attrs;
    return _optionValuesFrom(variant && variant.specs);
  }

  function attrsFromOptionValues(optionValues) {
    const attrs = {};
    for (const [key, value] of Object.entries(optionValues || {})) {
      const label = normalizeLabel(key);
      const val = normalizeValue(value);
      if (label && val) attrs[label] = { productName: val };
    }
    return attrs;
  }

  function combinationKey(optionValues) {
    const entries = Object.entries(optionValues || {})
      .map(([k, v]) => [normalizeLabel(k).toLowerCase(), normalizeValue(v).toLowerCase()])
      .filter(([k, v]) => k && v)
      .sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([k, v]) => `${k}=${v}`).join(SEP);
  }

  function _supplierId(variant) {
    return (
      variant?.asinOrSupplierId ||
      variant?.supplierVariantId ||
      variant?.variant_asin ||
      variant?.asin ||
      variant?.sourceSku ||
      ''
    );
  }

  function _priceNumber(...values) {
    for (const value of values) {
      if (value == null || value === '') continue;
      const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
      if (!isNaN(n) && n > 0) return n;
    }
    return 0;
  }

  function _imageList(variant) {
    const arr = [];
    if (Array.isArray(variant?.finalImages)) arr.push(...variant.finalImages);
    if (Array.isArray(variant?.images)) arr.push(...variant.images);
    if (variant?.img) arr.push(variant.img);
    if (variant?.image) arr.push(variant.image);
    return Array.from(new Set(arr.filter(u => typeof u === 'string' && u.trim())));
  }

  function _mergeVariant(best, next) {
    const merged = { ...best };
    for (const key of ['supplierVariantId', 'variant_asin', 'asinOrSupplierId', 'img', 'imgProp', 'sku', 'finalSku', 'sourceSku']) {
      if (!merged[key] && next[key]) merged[key] = next[key];
    }
    if (!_priceNumber(merged.finalPrice, merged.ebayPrice) && _priceNumber(next.finalPrice, next.ebayPrice)) {
      merged.finalPrice = next.finalPrice;
      merged.ebayPrice = next.ebayPrice;
      // Carry price provenance with the price it describes (manual vs calculated)
      if (next.price_source && !merged.price_source) merged.price_source = next.price_source;
    }
    if (!_priceNumber(merged.price, merged.raw_supplier_price) && _priceNumber(next.price, next.raw_supplier_price)) {
      merged.price = next.price;
      merged.raw_supplier_price = next.raw_supplier_price;
    }
    if ((!merged.finalImages || merged.finalImages.length === 0) && next.finalImages) merged.finalImages = next.finalImages;
    if ((!merged.images || merged.images.length === 0) && next.images) merged.images = next.images;
    return merged;
  }

  function _scoreVariant(v) {
    return (
      (Object.keys(v.optionValues || {}).length * 10) +
      (_supplierId(v) ? 6 : 0) +
      (v.sku || v.finalSku ? 5 : 0) +
      (_priceNumber(v.finalPrice, v.ebayPrice, v.price) ? 4 : 0) +
      ((v.finalImages && v.finalImages.length) || v.img ? 3 : 0) +
      (parseInt(v.quantity, 10) > 0 ? 2 : 0)
    );
  }

  function normalizeVariant(variant, product, index) {
    const v = { ...(variant || {}) };
    const optionValues = optionValuesFromVariant(v);
    const attrs = attrsFromOptionValues(optionValues);
    const combo = combinationKey(optionValues);
    const parentId = product?.sourceId || product?.parentAsin || product?.asin || product?.productId || '';
    const supplier = product?.supplier || product?.marketplace || 'amazon';
    const supplierPrefix = window.SSSkuEngine?.prefixFor ? window.SSSkuEngine.prefixFor(supplier) : supplier;
    const generatedSku = parentId && window.SSSkuEngine
      ? window.SSSkuEngine.buildReadable(parentId, attrs, supplierPrefix)
      : '';
    const finalSku = v.finalSku || v.sku || v.ebaySku || generatedSku || _supplierId(v) || '';
    const images = _imageList(v);
    const sourcePrice = _priceNumber(v.raw_supplier_price, v.sourcePrice, v.price);
    const finalPrice = _priceNumber(v.finalPrice, v.ebayPrice, v.calculatedPrice);
    const supplierVariantId = _supplierId(v);
    const variationId = v.variationId || supplierVariantId || combo || `variant-${index}`;

    return {
      ...v,
      variationId,
      asinOrSupplierId: supplierVariantId || null,
      supplierVariantId: supplierVariantId || v.supplierVariantId || null,
      variant_asin: v.variant_asin || supplierVariantId || null,
      sourceSku: v.sourceSku || supplierVariantId || null,
      generatedSku: v.generatedSku || generatedSku || null,
      finalSku: finalSku || null,
      sku: finalSku || v.sku || null,
      optionValues,
      attrs,
      combinationKey: combo || (supplierVariantId ? `id=${String(supplierVariantId).toLowerCase()}` : `idx=${index}`),
      sourcePrice,
      calculatedPrice: _priceNumber(v.calculatedPrice, v.finalPrice),
      finalPrice: finalPrice || v.finalPrice,
      ebayPrice: _priceNumber(v.ebayPrice) ? v.ebayPrice : v.ebayPrice,
      raw_supplier_price: sourcePrice || v.raw_supplier_price,
      images,
      finalImages: Array.isArray(v.finalImages) && v.finalImages.length ? v.finalImages : images,
      imgProp: v.imgProp ? normalizeLabel(v.imgProp) : null,
      img: v.img || images[0] || null,
      quantity: v.quantity != null ? v.quantity : 1,
      isDeleted: v.isDeleted === true || v.deleted === true,
    };
  }

  function normalizeProduct(product, options = {}) {
    const p = { ...(product || {}) };
    if (p.specifications && !p.specs) {
      p.specs = p.specifications;
    }
    const source = Array.isArray(p.variants) ? p.variants : [];
    const dropDeleted = options.dropDeleted !== false;
    const dropInvalid = options.dropInvalid === true;
    const dedupe = options.dedupe !== false;
    const warnings = [];
    const rows = [];

    source.forEach((variant, index) => {
      const row = normalizeVariant(variant, p, index);
      if (dropDeleted && row.isDeleted) return;
      if (dropInvalid && Object.keys(row.optionValues).length === 0 && source.length > 1) {
        warnings.push({ type: 'missing-options', index, variationId: row.variationId });
        return;
      }
      rows.push(row);
    });

    let variants = rows;
    if (dedupe) {
      const byCombo = new Map();
      for (const row of rows) {
        const key = row.combinationKey;
        if (!byCombo.has(key)) {
          byCombo.set(key, row);
          continue;
        }
        const prev = byCombo.get(key);
        warnings.push({
          type: 'duplicate-combination',
          combinationKey: key,
          kept: prev.variationId,
          dropped: row.variationId,
        });
        byCombo.set(key, _scoreVariant(row) > _scoreVariant(prev) ? _mergeVariant(row, prev) : _mergeVariant(prev, row));
      }
      variants = Array.from(byCombo.values());
    }

    p.variants = variants;
    p.hasVariants = variants.length > 1;
    p.variationCount = variants.length;
    if (warnings.length) p.variationNormalizationWarnings = warnings;
    else delete p.variationNormalizationWarnings;
    return p;
  }

  function validateUniqueCombinations(variants) {
    const seen = new Map();
    const duplicates = [];
    (variants || []).forEach((variant, index) => {
      if (variant?.isDeleted || variant?.deleted) return;
      const row = variant.combinationKey ? variant : normalizeVariant(variant, {}, index);
      const key = row.combinationKey;
      if (seen.has(key)) duplicates.push({ key, firstIndex: seen.get(key), index });
      else seen.set(key, index);
    });
    return { valid: duplicates.length === 0, duplicates };
  }

  return {
    normalizeLabel,
    normalizeValue,
    optionValuesFromVariant,
    attrsFromOptionValues,
    combinationKey,
    normalizeVariant,
    normalizeProduct,
    validateUniqueCombinations,
  };
})();

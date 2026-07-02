// ─────────────────────────────────────────────────────────────────────────────
// EbayListingApiHelper — ported from SuperDS EbayListingApi + Uploader
// Exposes: getCategoryRecommendations, createListing, saveListing,
//          updateListing, extractListingDraft, adaptProduct
// Also exposes: SellerSuitUploader.run(product) — full orchestration
// ─────────────────────────────────────────────────────────────────────────────

// ─── Private helpers ─────────────────────────────────────────────────────────
// Robust float cleaning helper
function _cleanFloat(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}


function _extractAllMatches(regex, str) {
  const results = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(str)) !== null) {
    if (match.index === regex.lastIndex) regex.lastIndex++;
    match.forEach(cap => results.push(cap));
  }
  return results;
}

function _getEbaySuffix() {
  return window.location.host.split('ebay').pop()?.replace('.', '') || 'com';
}

// Strips supplier-identifying phrases and brand names from a text or HTML string.
// Used by both the title and description pipelines so the rules can't drift.
// Patterns use [^.<\n]* stop guards so they match text nodes but never bleed
// into HTML tag attributes (delimited by ").
function _sanitizeSupplierText(text) {
  return text
    // Full-phrase removal: "sold/fulfilled/dispatched/shipped/sponsored by <name>"
    .replace(/\b(sold|fulfilled|dispatched|shipped|sponsored)\s+by\b[^.<\n]*/gi, '')
    // "Ships from Amazon" / "Shipped from Amazon warehouse"
    .replace(/\bships?\s+from\s+(amazon|walmart|target|bestbuy|wayfair|homedepot|costco)[^.<\n]*/gi, '')
    // "Visit the Amazon Store" / "Visit the Store"
    .replace(/\bvisit\s+the\b[^.<\n]*\bstore\b[^.<\n]*/gi, '')
    // Supplier private-label brand names
    .replace(/\b(amazon\s*basics|amazon\s*brand|amazon\s*essentials|amazon\s*elements|amazon\s*commercial|amazoncommercial|amazonbasics)\b/gi, '')
    // Shopping signals: "Amazon's Choice [for <category>]", "#1 Best Seller [in <category>]"
    // The optional "for/in" clause is stripped only up to the next sentence boundary so that
    // product names following the badge ("Amazon's Choice Wireless Headphones") are preserved.
    .replace(/\bamazon'?s?\s+choice(?:\s+for\b[^.<\n]*)?/gi, '')
    .replace(/#\s*\d+\s+best\s+seller(?:\s+in\b[^.<\n]*)?/gi, '')
    .replace(/\bbest\s*seller\b/gi, '')
    // Supplier domain names
    .replace(/\b(amazon|walmart|target|bestbuy|wayfair|homedepot|costco)\.com\b/gi, '')
    // Bare identifier keywords (safety net for fragments not caught by phrase rules above)
    .replace(/\b(ASIN|UPC|ISBN|Sales?\s*Rank|Seller\s*Rank|Available\s*at|Fulfilled\s*by|Sold\s*by)\b/gi, '')
    // URLs
    .replace(/https?:\/\/[^\s<"]+/gi, '');
}

// Applies supplier-identifier sanitization to an HTML description string and
// strips inline <img> tags that may carry supplier branding.
function _sanitizeDescriptionHtml(html) {
  return _sanitizeSupplierText(html).replace(/<img[^>]*>/gi, '');
}

// eBay hard-limits titles to 80 chars. Amazon titles routinely exceed this and
// contain junk eBay rejects. Strip noise, collapse spaces, truncate at a word
// boundary <= 80. (2.1 baseline — AI optimizer is the opt-in upgrade.)
function _enforceEbayTitle(title) {
  let t = _sanitizeSupplierText(String(title || ''))
    .replace(/\((?:pack of \d+|set of \d+)\)/ig, ' ')
    .replace(/[|]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (t.length <= 80) return t;
  const cut = t.slice(0, 80);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim();
}

function _deepFind(obj, predicate, depth = 12) {
  if (!obj || depth < 0) return undefined;
  if (predicate(obj)) return obj;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = _deepFind(item, predicate, depth - 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof obj === 'object') {
    for (const key in obj) {
      const found = _deepFind(obj[key], predicate, depth - 1);
      if (found) return found;
    }
  }
  return undefined;
}

function _deepFindCsrfMap(obj, keyPredicate, depth = 16) {
  if (!obj || depth < 0) return undefined;
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    const keys = Object.keys(obj);
    if (keys.find(k => keyPredicate(k) && typeof obj[k] === 'string')) return obj;
    for (const key of keys) {
      const found = _deepFindCsrfMap(obj[key], keyPredicate, depth - 1);
      if (found) return found;
    }
    return undefined;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = _deepFindCsrfMap(item, keyPredicate, depth - 1);
      if (found) return found;
    }
  }
  return undefined;
}

function _deepFindEpsData(obj, depth = 14) {
  if (!obj || depth < 0) return undefined;
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    if (obj.epsData) return obj.epsData;
    for (const key in obj) {
      const found = _deepFindEpsData(obj[key], depth - 1);
      if (found) return found;
    }
    return undefined;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = _deepFindEpsData(item, depth - 1);
      if (found) return found;
    }
  }
  return undefined;
}

// ─── EbayListingApiHelper namespace ──────────────────────────────────────────

window.EbayListingApiHelper = (() => {
  // Stored after createListing for CSRF fallback extraction
  let _lastRaw = null;

  // ── Internal retry utility ───────────────────────────────────────────────
  // maxAttempts total (not retries). Exponential back-off between attempts.
  async function _retry(fn, maxAttempts = 3, baseDelayMs = 800) {
    let lastErr;
    for (let i = 0; i < maxAttempts; i++) {
      try { return await fn(); } catch (e) {
        lastErr = e;
        if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, baseDelayMs * (i + 1)));
      }
    }
    throw lastErr;
  }

  // ── getCategoryRecommendations ───────────────────────────────────────────
  async function getCategoryRecommendations(keyword) {
    // Truncate keyword to 80 chars — eBay rejects overly long queries
    const kw = String(keyword || '').slice(0, 80).trim() || 'product';
    const params = new URLSearchParams({ keyword: kw });
    const url = `https://www.ebay.${_getEbaySuffix()}/sl/prelist/api/category/search?` + params;
    return _retry(async () => {
      const resp = await fetch(url, { method: 'GET', credentials: 'include' });
      const ct = resp.headers.get('content-type') || '';
      if (!resp.ok || !ct.includes('application/json')) {
        throw new Error(`eBay category API failed (HTTP ${resp.status}) — please log in to eBay and try again.`);
      }
      return resp.json();
    }, 3, 1000);
  }

  // ── createListing ────────────────────────────────────────────────────────
  // Fetches eBay's listing creation page for the given title+category.
  // Parses inline JS chunks to extract the draft model, CSRF map, and epsData.
  // Returns [listingData, appData, parsedCsrfToken].
  async function createListing(productTitle, categoryId) {
    const params = new URLSearchParams({
      mode:             'AddItem',
      categoryId:       String(categoryId),
      title:            productTitle,
      condition:        '1000',
      sr:               'pl',
      isUid:            'false',
      aspects:          'eJyLrlbKS8xNVbJSCqksSFXSUSpLzCkFcqOV',
      view:             'sellnode-condition',
      sssr:             'shListingsCTA',
      radixTrackingId:  crypto.randomUUID()
    });

    const html = await (await fetch(
      `https://www.ebay.${_getEbaySuffix()}/sl/list?` + params,
      { method: 'GET', credentials: 'include', redirect: 'follow' }
    )).text();

    // Extract inline JSON chunks that eBay bundles via .concat(...)
    const chunkRegex = /(?<=\.concat\()[\s\S]*?(?=<\/script>)/gi;
    const chunks = _extractAllMatches(chunkRegex, html);
    if (!chunks.length) throw new Error('Could not extract JSON chunks from eBay listing page');
    _lastRaw = { text: html, chunks };

    const parseChunk = raw => {
      try { return JSON.parse(raw.replace(/\)(?=[^)]*$)/, '')); } catch { return undefined; }
    };
    const parsed = chunks
      .map((raw, idx) => ({ idx, raw, data: parseChunk(raw) }))
      .filter(e => e.data);

    const has = (raw, kws) => kws.some(kw => raw.includes(kw));

    // Locate the app-status chunk (contains widgetConfig + CSRF + epsData)
    const appChunk =
      parsed.find(e => has(e.raw, ['isMuaa'])      && has(e.raw, ['model']))       ??
      parsed.find(e => has(e.raw, ['listing_draft']) && has(e.raw, ['csrf']))       ??
      parsed.find(e => has(e.raw, ['listing_draft']))                               ??
      parsed.find(e => has(e.raw, ['APPSTATUS'])   && has(e.raw, ['widgetConfig'])) ??
      parsed.find(e => has(e.raw, ['widgetConfig']))                                ??
      parsed.find(e => has(e.raw, ['APPSTATUS']))                                   ??
      parsed.find(e => has(e.raw, ['csrf', 'epsData']));
    if (!appChunk) throw new Error('Could not locate eBay app data chunk');

    // Locate the listing-model chunk (contains draftId + attributeList)
    const listingChunk =
      parsed.find(e => e.idx !== appChunk.idx && has(e.raw, ['ATTRIBUTES']) && has(e.raw, ['"meta"']) && has(e.raw, ['draftId'])) ??
      parsed.find(e => e.idx !== appChunk.idx && has(e.raw, ['draftId']) && has(e.raw, ['attributeList']))                        ??
      parsed.find(e => e.idx !== appChunk.idx && has(e.raw, ['draftId']))                                                         ??
      (has(appChunk.raw, ['draftId']) ? appChunk : undefined);
    if (!listingChunk) throw new Error('Could not locate eBay listing data chunk');

    // Extract CSRF from <meta id="csrf-data"> tag
    let parsedCsrf;
    const csrfMatch = html.match(/id=csrf-data\s+data-value='([^']+)'/);
    if (csrfMatch) { try { parsedCsrf = JSON.parse(csrfMatch[1]); } catch {} }

    return [listingChunk.data, appChunk.data, parsedCsrf];
  }

  // ── saveListing ──────────────────────────────────────────────────────────
  async function saveListing(csrfToken, draftId, payload) {
    const suffix = _getEbaySuffix();
    return _retry(async () => {
    const resp = await fetch(
      `https://www.ebay.${suffix}/lstng/api/listing_draft/${draftId}?mode=AddItem`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'srt': csrfToken
        },
        referrer: `https://www.ebay.${suffix}/lstng?draftId=${draftId}&mode=AddItem`,
        body: JSON.stringify({
          ...payload,
          requestId: crypto.randomUUID(),
          requestMeta: { lastDeltaTimestamp: Date.now() }
        })
      }
    );
    if (!resp.ok) throw new Error(`saveListing HTTP ${resp.status}`);
    const body = await resp.json().catch(() => ({}));
    // eBay surfaces errors in several fields
    const errs = body.errors || body.errorMessage || body.messages;
    if (Array.isArray(errs) && errs.length) {
      const msg = errs.map(e => e.message || e.longMessage || e.text || JSON.stringify(e)).join('; ');
      throw new Error(`eBay rejected listing draft: ${msg}`);
    }
    return body;
    }, 3, 1000);
  }

  // ── updateListing ────────────────────────────────────────────────────────
  // Uploads all images to EPS, builds the draft payload, calls saveListing.
  async function updateListing(draftId, csrfToken, epsData, listingModel, product) {
    const attributeList = listingModel?.ATTRIBUTES?.attributeList || [];

    // Map product specs onto eBay attribute schema
    const attributes = {};
    const aspectNames = attributeList.map(a => a.attributeName);
    for (const specKey in (product.prod_specs || {})) {
      const matchedName = matchAspectName(specKey, aspectNames);
      const attr = attributeList.find(a => a.attributeName === matchedName);
      if (attr) {
        if (attr.multiSelectEnabled) {
          attributes[matchedName] = String(product.prod_specs[specKey]).split(',').map(s => s.trim());
        } else {
          attributes[matchedName] = [product.prod_specs[specKey]];
        }
      } else {
        attributes[matchedName] = [product.prod_specs[specKey]];
      }
    }

    // Auto-fill empty REQUIRED attributes
    attributeList
      .filter(attr => {
        const isRequired = 
          attr.required === true ||
          attr.isRequired === true ||
          attr.usage === 'REQUIRED' ||
          attr.usageConstraint === 'REQUIRED' ||
          (attr.minValues && attr.minValues > 0) ||
          (attr.groups && (attr.groups.includes('REQUIRED') || attr.groups[0] === 'REQUIRED'));
        const hasValue = 
          (attr.value && attr.value.length > 0) || 
          (attr.values && attr.values.length > 0) ||
          (attr.currentValues && attr.currentValues.length > 0);
        return isRequired && !hasValue;
      })
      .forEach(attr => {
        const name = attr.attributeName;
        if (attributes[name]) return;
        if (name.toLowerCase() === 'brand' && (attr.customValuesAllowed || !attr.options?.length)) {
          attributes[name] = ['Unbranded'];
        } else if (attr.options && attr.options.length > 0) {
          attributes[name] = [attr.options[0].value];
        } else {
          attributes[name] = ['Does not apply'];
        }
      });

    // Pre-upload all product images to eBay EPS
    let uploadedImages = [];
    if (window.EbayPhotoUploader && epsData) {
      const imageUrls = product.prod_images || [];
      console.log(`[SS EPS] Uploading ${imageUrls.length} images with bounded concurrency (max 3)...`);
      
      const concurrencyLimit = 3;
      const results = new Array(imageUrls.length);
      const queue = imageUrls.map((url, index) => ({ url, index }));
      
      async function worker() {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) break;
          const { url, index } = item;
          try {
            const id = await window.EbayPhotoUploader.uploadPhoto(url, epsData, index);
            console.log(`[SS EPS] ✓ Image ${index + 1}/${imageUrls.length}: ${id}`);
            results[index] = id;
          } catch (err) {
            console.error(`[SS EPS] ✗ Image ${index + 1}/${imageUrls.length} failed: ${err.message} — ${url}`);
            results[index] = undefined;
          }
        }
      }
      
      const workers = Array(Math.min(concurrencyLimit, imageUrls.length))
        .fill(null)
        .map(() => worker());
      
      await Promise.all(workers);
      uploadedImages = results.filter(Boolean);
      console.log(`[SS EPS] ${uploadedImages.length}/${imageUrls.length} images uploaded`);
      if (uploadedImages.length === 0 && imageUrls.length > 0) {
        console.error('[SS EPS] All uploads failed — check CDN host_permissions or proxy endpoint');
      }
    }

    const descEditorMode =
      listingModel?.meta?.descriptionEditorMode === 'RICH_TEXT_EDITOR'
        ? 'RTE_EDITOR'
        : (listingModel?.meta?.descriptionEditorMode || 'RTE_EDITOR');

    const payload = {
      format:                'FixedPrice',
      pictures:              uploadedImages,
      attributes,
      itemLocationCountry:   product.meta?.country || 'US',
      itemLocationCityState: 'Multiple locations',
      description:           product.prod_desc || '',
      meta:                  { descriptionEditorMode: descEditorMode },
      condition:             1000,
      removedFields:         []
    };

    // 2.3 — Promoted Listings: opt-in via product.meta.promoteListing
    if (product.meta?.promoteListing) {
      payload.promotedListingSelection = true;
      const pct = _cleanFloat(product.meta.promotePercent);
      if (!isNaN(pct) && pct > 0) payload.adRate = pct;
    }

    // Single-variation listing: set price + quantity directly
    if ((product.prod_variations || []).length <= 1) {
      let price = product.prod_variations?.[0]?.price || 0.99;
      if (price < 1) price = 0.99;
      payload.price    = Number(price).toFixed(2);
      payload.quantity = product.prod_qty || 1;
    }

    // Use readable SKU from first variation (set by adaptProduct via SSSkuEngine —
    // carries the user-edited SKU when one exists). `product` here is the ADAPTED
    // object, which has no ebaySku field, so reading it always fell through to
    // prod_id (raw ASIN) and silently discarded edited SKUs. Multi-variation
    // listings keep prod_id at the parent level: per-variant SKUs are set in
    // addVariations. Encode to base64 for eBay Custom Label only at upload time.
    const isSingleListing = (product.prod_variations || []).length <= 1;
    const customLabelSku =
      (isSingleListing && product.prod_variations?.[0]?.sku) ||
      product.ebaySku || product.prod_id;
    if (customLabelSku) {
      payload.sku = window.SSSkuEngine ? window.SSSkuEngine.encodeForEbay(customLabelSku) : customLabelSku;
    }

    return saveListing(csrfToken, draftId, payload);
  }

  // ── extractListingDraft ──────────────────────────────────────────────────
  // Resolves draftId, draft CSRF value, epsData, listingModel, and aspectNames
  // from the [listingData, appData, parsedCsrf] triple returned by createListing.
  function extractListingDraft(listingData, appData, parsedCsrf) {
    // Resolve listingModel (contains meta.draftId + ATTRIBUTES.attributeList)
    const wData = listingData.w || listingData.o?.w;
    let listingModel =
      wData?.find(e => e?.[2]?.model?.ATTRIBUTES?.attributeList)?.[2]?.model ??
      wData?.find(e => e?.[2]?.model?.meta?.draftId)?.[2]?.model             ??
      wData?.[0]?.[2]?.model;

    if (!listingModel?.meta?.draftId) {
      const found =
        _deepFind(listingData, o => o && typeof o === 'object' && o.ATTRIBUTES?.attributeList && o.meta?.draftId) ??
        _deepFind(listingData, o => o && typeof o === 'object' && o.meta?.draftId)                                ??
        _deepFind(appData,     o => o && typeof o === 'object' && o.meta?.draftId);
      if (found) listingModel = found;
    }
    if (!listingModel?.meta?.draftId) throw new Error('Could not find draftId in eBay response');

    // Normalise appData (sometimes wrapped in .o)
    const appNorm = appData.o !== undefined ? appData.o : appData;

    // Resolve appStatus (contains widgetConfig.csrf + widgetConfig.epsData)
    let appStatus =
      appNorm.w?.find(e => e?.[2]?.model?.APPSTATUS)?.[2]?.model?.APPSTATUS ??
      appNorm.w?.[0]?.[2]?.model?.APPSTATUS;

    if (!appStatus?.widgetConfig?.csrf) {
      const found =
        _deepFind(appNorm,     o => o && typeof o === 'object' && o.widgetConfig?.csrf) ??
        _deepFind(listingData, o => o && typeof o === 'object' && o.widgetConfig?.csrf);
      if (found) appStatus = found;
    }

    const widgetConfig = appStatus?.widgetConfig;
    let csrfToken = parsedCsrf || widgetConfig?.csrf;

    // Ensure csrfToken actually contains a listing_draft key
    const csrfPredicates = [
      k => k.includes('listing_draft'),
      k => k.includes('listingDraft'),
      k => /lstng\/api\/listing/i.test(k),
      k => /listing.*draft|draft.*listing/i.test(k)
    ];
    if (!csrfToken || !csrfPredicates.some(pred => Object.keys(csrfToken).some(pred))) {
      for (const pred of csrfPredicates) {
        csrfToken = _deepFindCsrfMap(appNorm, pred) ?? _deepFindCsrfMap(listingData, pred);
        if (csrfToken) break;
      }
    }

    // Extract the specific CSRF string for listing_draft endpoint
    let draftCsrfValue;
    if (csrfToken) {
      draftCsrfValue =
        csrfToken['/lstng/api/listing_draft/:draftId(\\d+)']  ??
        csrfToken['/lstng/api/listing_draft/:draftId(d+)']    ??
        csrfToken[Object.keys(csrfToken).find(k => k.includes('listing_draft'))    ?? ''] ??
        csrfToken[Object.keys(csrfToken).find(k => /listing.*draft|draft.*listing|lstng\/api\/listing/i.test(k)) ?? ''];
    }

    // Fallback: scan raw HTML/chunks for a listing_draft CSRF pattern
    if (!draftCsrfValue && _lastRaw) {
      for (const target of [_lastRaw.text, ..._lastRaw.chunks]) {
        const m = target.match(/"[^"]*listing_draft[^"]*"\s*:\s*"([^"]+)"/) ??
                  target.match(/"[^"]*lstng\/api\/listing[^"]*"\s*:\s*"([^"]+)"/i);
        if (m?.[1]) {
          draftCsrfValue = m[1].replace(/\\u002F/gi, '/');
          break;
        }
      }
    }
    if (!draftCsrfValue) throw new Error('Could not find listing_draft CSRF token');

    // Locate epsData (contains uaek + uaes for EPS photo uploads)
    const epsData = widgetConfig?.epsData ?? _deepFindEpsData(appNorm) ?? _deepFindEpsData(listingData);
    if (!epsData) throw new Error('Could not find epsData in eBay response');

    const draftId = listingModel.meta.draftId;
    const aspectNames = Array.isArray(listingModel.ATTRIBUTES?.attributeList)
      ? listingModel.ATTRIBUTES.attributeList.map(a => a.attributeName)
      : [];

    return { draftId, draftCsrfValue, epsData, listingModel, aspectNames };
  }

  function matchAspectName(attrName, aspectNames) {
    const clean = s => s.toLowerCase().replace(/[\s_]/g, '');
    const attrClean = clean(attrName);

    const synonymMap = {
      'itemmodelnumber': 'mpn',
      'partnumber': 'mpn',
      'manufacturerpartnumber': 'mpn',
      'brandname': 'brand',
      'manufacturer': 'brand',
      'manufacturername': 'brand',
      'modelname': 'model',
      'modelnumber': 'model',
      'itemtype': 'type',
      'producttype': 'type',
      'type': 'type'
    };
    const targetClean = synonymMap[attrClean] || attrClean;
    
    // 1. Try exact/case-insensitive match
    let match = aspectNames.find(a => clean(a) === targetClean);
    if (match) return match;
    
    // 2. Try singular/plural matching
    const isPlural = targetClean.endsWith('s');
    const singular = isPlural ? targetClean.slice(0, -1) : targetClean;
    const plural = isPlural ? targetClean : targetClean + 's';
    
    match = aspectNames.find(a => {
      const c = clean(a);
      return c === singular || c === plural || c === singular + 's' || (c.endsWith('s') && c.slice(0, -1) === singular);
    });
    if (match) return match;
    
    // 3. Special cases for color/colour
    if (targetClean.includes('color') || targetClean.includes('colour')) {
      match = aspectNames.find(a => {
        const c = clean(a);
        return c.includes('color') || c.includes('colour');
      });
      if (match) return match;
    }
    
    // 4. Special cases for size
    if (targetClean.includes('size')) {
      match = aspectNames.find(a => clean(a).includes('size'));
      if (match) return match;
    }
    
    return attrName;
  }

  // ── addVariations ────────────────────────────────────────────────────────
  // Called on the bulkedit.ebay.com page after draft is created.
  // Uploads per-variation images, builds MSKU payload, POSTs to msku-update.
  async function addVariations(draftId, epsData, product, aspectNames = []) {
    const variations = product.prod_variations;
    if (!variations || variations.length <= 1) return;

    const attrValuesMap     = {};
    const variationItems    = [];
    const imgPropPictureMap = {};
    const uploadedImgCache  = new Map();
    // Track seen variationSpecific combos — eBay rejects any duplicate combo
    const seenCombos        = new Set();
    const seenSkus          = new Set();

    // Compute imgPropKey once from first variation, apply rename up-front
    // so it stays consistent across all iterations.
    const rawImgProp = variations[0]?.imgProp || null;
    // Determine final (post-rename) imgPropKey before the loop
    let imgPropKey = rawImgProp ? matchAspectName(rawImgProp, aspectNames) : null;

    // First pass: resolve final cased aspect names for each variation and collect all unique aspect keys
    const allAspectKeys = new Set();
    const processedVariations = variations.map(v => {
      const rawAttrs = v.attrs || {};
      const attrs = {};
      for (const attrName of Object.keys(rawAttrs)) {
        const finalKey = matchAspectName(attrName, aspectNames);
        attrs[finalKey] = rawAttrs[attrName];
        allAspectKeys.add(finalKey);
      }
      return { ...v, attrs };
    });

    const aspectKeysArr = Array.from(allAspectKeys);

    for (let idx = 0; idx < processedVariations.length; idx++) {
      const variation = { ...processedVariations[idx] }; // shallow copy — don't mutate source
      if (!variation.price || variation.price < 1) variation.price = 0.99;

      const attrs = variation.attrs;
      // Ensure all variations have the exact same set of aspect keys (symmetric dimensions)
      for (const key of aspectKeysArr) {
        if (!attrs[key]) {
          attrs[key] = { productName: 'N/A' };
        } else if (attrs[key] && typeof attrs[key].productName === 'string') {
          attrs[key].productName = attrs[key].productName.trim();
        }
      }

      // Build variationSpecific for this combo
      const variationSpecific = {};
      for (const attrName in attrs) {
        variationSpecific[attrName] = attrs[attrName].productName;
      }

      // Skip duplicate combos — case-insensitive and trimmed check
      const normalizedCombo = Object.keys(variationSpecific).sort().reduce((acc, k) => {
        acc[k.toLowerCase()] = String(variationSpecific[k]).trim().toLowerCase();
        return acc;
      }, {});
      const comboKey = JSON.stringify(normalizedCombo);
      if (seenCombos.has(comboKey)) {
        console.warn(`[SS MSKU] Skipping duplicate variation combo: ${comboKey}`);
        continue;
      }
      seenCombos.add(comboKey);

      // Accumulate attrValuesMap for variationSpecificsMetaData
      for (const attrName in attrs) {
        const productName = attrs[attrName].productName;
        if (!attrValuesMap[attrName]) {
          attrValuesMap[attrName] = [productName];
        } else if (!attrValuesMap[attrName].includes(productName)) {
          attrValuesMap[attrName].push(productName);
        }
      }

      // Upload variation image, grouped by imgPropKey attribute value (retry 2x)
      // Resolve pivot value case-insensitively from attrs
      let pivotAttr = null;
      if (imgPropKey) {
        const targetClean = imgPropKey.toLowerCase().replace(/[\s_]/g, '');
        const actualKey = Object.keys(attrs).find(k => k.toLowerCase().replace(/[\s_]/g, '') === targetClean);
        if (actualKey) pivotAttr = attrs[actualKey];
      }

      if (imgPropKey && pivotAttr && variation.img && window.EbayPhotoUploader && epsData) {
        if (!uploadedImgCache.has(variation.img)) {
          try {
            const photoId = await _retry(
              () => window.EbayPhotoUploader.uploadPhoto(variation.img, epsData, idx), 2, 500
            );
            uploadedImgCache.set(variation.img, photoId);
          } catch (err) {
            console.warn('[SS MSKU] Variation image upload failed after retries:', err.message);
            uploadedImgCache.set(variation.img, null); // cache failure to prevent re-attempts
          }
        }
        const photoId  = uploadedImgCache.get(variation.img);
        if (photoId) {
          const groupKey = pivotAttr.productName;
          if (!imgPropPictureMap[imgPropKey]) {
            imgPropPictureMap[imgPropKey] = { [groupKey]: [photoId] };
          } else if (!imgPropPictureMap[imgPropKey][groupKey]) {
            imgPropPictureMap[imgPropKey][groupKey] = [photoId];
          } else if (!imgPropPictureMap[imgPropKey][groupKey].includes(photoId)) {
            imgPropPictureMap[imgPropKey][groupKey].push(photoId);
          }
        }
      }

      // Guarantee unique generated SKUs and block duplicate/empty SKUs
      let varSku = variation.sku || variation.supplierVariantId || '';
      varSku = varSku.trim();

      if (!varSku || seenSkus.has(varSku.toUpperCase())) {
        const parentId = product.prod_id || '';
        if (window.SSSkuEngine) {
          varSku = window.SSSkuEngine.buildReadable(parentId, attrs, window.SSSkuEngine.prefixFor(product.supplier || 'amazon'));
        } else {
          varSku = parentId + '-' + Object.values(variationSpecific).join('-');
        }

        let uniqSku = varSku;
        let suffixCounter = 1;
        while (seenSkus.has(uniqSku.toUpperCase())) {
          const suffix = '-' + suffixCounter;
          const maxLen = window.SSSkuEngine ? window.SSSkuEngine.MAX_LEN : 50;
          uniqSku = varSku.slice(0, maxLen - suffix.length) + suffix;
          suffixCounter++;
        }
        varSku = uniqSku;
      }

      const finalSku = window.SSSkuEngine ? window.SSSkuEngine.encodeForEbay(varSku) : varSku;
      seenSkus.add(finalSku.toUpperCase());

      variationItems.push({
        variationSpecific,
        listingVariation: {
          price:    Number(variation.price).toFixed(2),
          quantity: 1   // always 1 for dropshipping — never use supplier stock count
        },
        sku:         finalSku,
        state:       'enabled',
        productInfo: {},
        index:       variationItems.length
      });
    }

    const variationSpecificsMetaData = Object.entries(attrValuesMap)
      .map(([name, value]) => ({ name, value }));

    // Assert Payload Invariants
    const seenCombosCheck = new Set();
    const metaKeys = variationSpecificsMetaData.map(m => m.name);
    const seenSkusCheck = new Set();

    for (const item of variationItems) {
      const sku = item.sku;
      if (!sku) {
        throw new Error(`Assertion failed: Variation item index ${item.index} has an empty SKU.`);
      }
      if (seenSkusCheck.has(sku.toUpperCase())) {
        throw new Error(`Assertion failed: Duplicate SKU detected in payload: ${sku}`);
      }
      seenSkusCheck.add(sku.toUpperCase());

      const itemKeys = Object.keys(item.variationSpecific);
      for (const key of metaKeys) {
        if (!itemKeys.includes(key)) {
          throw new Error(`Assertion failed: Variation item SKU ${sku} is missing dimension: ${key}`);
        }
      }
      for (const key of itemKeys) {
        if (!metaKeys.includes(key)) {
          throw new Error(`Assertion failed: Variation item SKU ${sku} has unexpected dimension: ${key}`);
        }
      }

      const comboKey = JSON.stringify(
        Object.keys(item.variationSpecific).sort().reduce((acc, k) => {
          acc[k.toLowerCase()] = String(item.variationSpecific[k]).trim().toLowerCase();
          return acc;
        }, {})
      );
      if (seenCombosCheck.has(comboKey)) {
        throw new Error(`Assertion failed: Duplicate attribute combination detected: ${comboKey}`);
      }
      seenCombosCheck.add(comboKey);

      const price = parseFloat(item.listingVariation.price);
      if (isNaN(price) || price < 0.99) {
        throw new Error(`Assertion failed: Variation SKU ${sku} has an invalid price: ${item.listingVariation.price}`);
      }
    }

    if (imgPropPictureMap && Object.keys(imgPropPictureMap).length > 0) {
      const pivotKeys = Object.keys(imgPropPictureMap);
      if (pivotKeys.length > 1) {
        throw new Error(`Assertion failed: eBay allows only one picture pivot dimension, found: ${pivotKeys.join(', ')}`);
      }
      const pivotKey = pivotKeys[0];
      if (!metaKeys.includes(pivotKey)) {
        throw new Error(`Assertion failed: Picture pivot key "${pivotKey}" must be one of the listing dimensions: ${metaKeys.join(', ')}`);
      }
    }

    const requestBody = JSON.stringify({
      action:                    'save',
      draftId,
      listingMode:               'AddItem',
      restricted:                false,
      upiFieldName:              'upc',
      variationItem:             variationItems,
      variationSpecificPictureSet: imgPropPictureMap,
      variationSpecificsMetaData
    });

    const result = await _retry(async () => {
      const resp = await fetch(
        `https://bulkedit.ebay.${_getEbaySuffix()}/msku-update`,
        { method: 'POST', credentials: 'include', body: requestBody }
      );
      if (!resp.ok) throw new Error(`eBay variation save failed (HTTP ${resp.status})`);
      return resp.json().catch(() => ({}));
    }, 3, 1200);

    // 3.1 — validate response. eBay returns 200 with error payload on failure.
    if (!result) throw new Error('eBay variation save: empty response');
    const _ok = true; // response already validated above
    // eBay surfaces problems in errors[] / errorMessage / messages[]
    const errs = result.errors || result.errorMessage || result.messages;
    if (Array.isArray(errs) && errs.length) {
      const msg = errs.map(e => e.message || e.longMessage || e.text || JSON.stringify(e)).join('; ');
      throw new Error(`eBay rejected variations: ${msg}`);
    }
    if (typeof errs === 'string' && errs.trim()) {
      throw new Error(`eBay rejected variations: ${errs}`);
    }
    console.log(`[SS MSKU] ${variationItems.length} variations saved OK.`);
    return result;
  }

  // ── adaptProduct ─────────────────────────────────────────────────────────
  // Normalises SellerSuit product schema → fields expected by updateListing /
  // addVariations. Handles both single-item and multi-variation Amazon products.
  function adaptProduct(product) {
    // Universal supplier identity — Amazon: asin/parentAsin. Future suppliers: sourceId.
    const sourceId = product.sourceId || product.parentAsin || product.asin || '';

    // Guard log — verify mode + image count entering adapter
    console.log('[SS adaptProduct] isSingleMode:', !!product.isSingleMode,
      '| images:', Array.isArray(product.images) ? product.images.length : 0,
      '| variants:', Array.isArray(product.variants) ? product.variants.length : 0,
      '| images[0]:', (Array.isArray(product.images) && product.images[0]) || null);
    const bullets = Array.isArray(product.bulletPoints) ? product.bulletPoints : [];
    let descHtml = '';
    const isHtml = product.description && (product.description.trim().startsWith('<') || product.description.includes('</'));

    if (isHtml) {
      descHtml = _sanitizeDescriptionHtml(product.description);
    } else {
      if (bullets.length > 0) {
        descHtml += '<ul>' + bullets.map(b => `<li>${b}</li>`).join('') + '</ul>';
      }
      if (product.description) {
        descHtml += `<p>${product.description}</p>`;
      }
      descHtml = _sanitizeDescriptionHtml(descHtml);
    }
    if (!descHtml.trim()) descHtml = '<p>Quality product.</p>';

    const basePrice = _cleanFloat(product.price) || 0.99;
    const hasRealVariants = product.hasVariants &&
                            Array.isArray(product.variants) &&
                            product.variants.length > 1;

    let prod_variations;
    if (hasRealVariants) {
      // Filter out ghost/unavailable/deleted variants before building prod_variations.
      // Validate unique combinationKey and fail fast (throw) on duplicates.
      const seenCombos = new Set();
      const validVariants = [];
      
      (product.variants || []).forEach(v => {
        if (v.isDeleted === true || v.deleted === true) return;
        
        const hasAttrs  = v.attrs  && Object.keys(v.attrs).length  > 0;
        const hasSpecs  = v.specs  && Object.keys(v.specs).length  > 0;
        if (!hasAttrs && !hasSpecs) return;
        if (v.inStock === false) return;
        
        // Compute canonical combination key
        let combo = '';
        if (window.SSVariationNormalizer) {
          const optVals = window.SSVariationNormalizer.optionValuesFromVariant(v);
          combo = window.SSVariationNormalizer.combinationKey(optVals);
        } else {
          const rawAttrs = v.attrs || {};
          combo = Object.entries(rawAttrs)
            .map(([k, val]) => {
              const str = val && typeof val === 'object' ? (val.productName || '') : String(val || '');
              return `${k.toLowerCase()}=${str.toLowerCase()}`;
            })
            .sort()
            .join('\u001f');
        }
        
        if (combo) {
          if (seenCombos.has(combo)) {
            const prettyCombo = combo.split('\u001f').join(', ');
            throw new Error(`Duplicate variation combination detected: ${prettyCombo}`);
          }
          seenCombos.add(combo);
        }
        
        validVariants.push(v);
      });
      
      const sourceVariants = validVariants.length > 0 ? validVariants : product.variants;

      // imgProp: the attr key that groups variation images (e.g. "Color").
      // Scraper sets v.imgProp directly; fall back to color-regex on attr keys.
      const firstV   = sourceVariants[0];
      const firstAttrs = firstV.attrs || {};
      const attrKeys   = Object.keys(firstAttrs);
      const rawImgProp  = firstV.imgProp
        || attrKeys.find(k => /colou?r/i.test(k))
        || attrKeys[0]
        || null;
      const imgProp = (rawImgProp && window.SSVariationNormalizer)
        ? window.SSVariationNormalizer.normalizeLabel(rawImgProp)
        : rawImgProp;

      prod_variations = sourceVariants.map(v => {
        // Scraper format: v.attrs = { "Color": { productName: "Red" }, ... }
        // Fallback format: v.specs = { "Color": "Red", ... } (flat, needs wrapping)
        let attrs;
        if (v.attrs && Object.keys(v.attrs).length > 0) {
          attrs = { ...v.attrs }; // already { attrName: { productName: val } }
        } else {
          attrs = {};
          for (const [k, val] of Object.entries(v.specs || {})) {
            attrs[k] = { productName: String(val) };
          }
        }
        // finalPrice stamped by _applyPricingToProduct in amazon_injector at scan time.
        // Falls back to raw price if pricing was not applied (e.g. Walmart path).
        // Ensure every variant has a unique SKU — if scraper didn't set one, generate
        // it from parentAsin + attrs so ON CONFLICT (user_id, sku) never collapses
        // all variants into a single row in listing_variations.
        const varSku = v.sku || (window.SSSkuEngine
          ? window.SSSkuEngine.buildReadable(sourceId, attrs, window.SSSkuEngine.prefixFor(product.supplier))
          : (sourceId + (Object.values(attrs).map(a => a?.productName || '').join('-') || '')));
        const ebayFinalPrice = _cleanFloat(v.ebayFinalPrice) || _cleanFloat(v.ebayPrice) || _cleanFloat(v.finalPrice);
        const priceValue = ebayFinalPrice > 0 ? ebayFinalPrice : (_cleanFloat(v.price) || basePrice);
        const supplierPrice = _cleanFloat(v.supplierPrice) || _cleanFloat(v.price) || basePrice;
        return {
          price:             priceValue,
          raw_supplier_price: supplierPrice,
          sku:               varSku,
          attrs,
          img:               v.img || v.image || null, // scraper uses v.img
          imgProp:           ((v.imgProp && window.SSVariationNormalizer ? window.SSVariationNormalizer.normalizeLabel(v.imgProp) : v.imgProp) || imgProp),
          supplierVariantId: v.supplierVariantId || v.asin || null,
          variant_asin:      v.supplierVariantId || v.asin || null
        };
      });
    } else {
      const ebayFinalPrice = _cleanFloat(product.ebayFinalPrice) || _cleanFloat(product.finalPrice);
      const finalPrice = ebayFinalPrice > 0 ? ebayFinalPrice : basePrice;
      const supplierPrice = _cleanFloat(product.supplierPrice) || _cleanFloat(product.raw_supplier_price) || _cleanFloat(product.price) || basePrice;
      // User-edited SKU (panel ebaySku) wins; otherwise generate from sourceId.
      const sku = product.ebaySku || ((window.SSSkuEngine)
        ? window.SSSkuEngine.buildReadable(sourceId, {}, window.SSSkuEngine.prefixFor(product.supplier))
        : sourceId);
      prod_variations = [{
        price:              finalPrice,
        raw_supplier_price: supplierPrice,
        sku,
        variant_asin:       sourceId || null
      }];
    }

    return {
      prod_title:      _enforceEbayTitle(product.title || sourceId || 'Product'),
      prod_images:     Array.isArray(product.images) ? product.images.slice(0, 12) : [],
      prod_specs:      product.specs || product.specifications || {},
      prod_desc:       descHtml,
      prod_id:         sourceId,
      prod_qty:        1, // always 1 for dropshipping — never use supplier stock count
      prod_variations,
      supplier:        product.supplier || product.marketplace || 'amazon',
      meta:            {
        country:        'US',
        promoteListing: !!product.promoteListing,
        promotePercent: product.promotePercent || null
      }
    };
  }

  // ── checkEbayAuth ──────────────────────────────────────────────────────────
  // Preflight: verify user logged into eBay before wasting time on upload.
  // Fetches seller hub; eBay redirects to signin when logged out. Returns
  // true on network error (don't block on transient failures).
  async function checkEbayAuth() {
    const suffix = _getEbaySuffix();
    try {
      const resp = await fetch(`https://www.ebay.${suffix}/sh/lst/active`, {
        credentials: 'include',
        redirect:    'follow'
      });
      const finalUrl = (resp.url || '').toLowerCase();
      if (finalUrl.includes('signin') || finalUrl.includes('/login')) return false;
      return true;
    } catch (err) {
      console.warn('[SS Auth] eBay auth check failed (network) — allowing:', err.message);
      return true;
    }
  }

  // ── checkVero ──────────────────────────────────────────────────────────────
  // Screen title against VeRO brand DB (check-vero edge fn). Returns
  // { flagged, matches:[{brand,risk,category}] }. Network/error → not flagged
  // (never block listing on infra failure).
  async function checkVero(title) {
    if (!title) return { flagged: false, matches: [] };
    try {
      const base   = (typeof ExtensionConfig !== 'undefined')
        ? ExtensionConfig.getSupabaseFunctionUrl('check-vero')
        : 'https://ojxzssooylmydystjvdo.supabase.co/functions/v1/check-vero';
      const apikey = (typeof ExtensionConfig !== 'undefined')
        ? ExtensionConfig.API_KEYS.SUPABASE_ANON : '';
      const resp = await fetch(base, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': apikey },
        body:    JSON.stringify({ title })
      });
      if (!resp.ok) return { flagged: false, matches: [] };
      return await resp.json();
    } catch (err) {
      console.warn('[SS VeRO] check failed (allowing):', err.message);
      return { flagged: false, matches: [] };
    }
  }

  // ── checkDuplicate ─────────────────────────────────────────────────────────
  // Asks background (has auth) to query listings by amazon_asin for this user.
  // Returns { duplicate, listing }. Fail-open on any error.
  async function checkDuplicate(asin) {
    if (!asin) return { duplicate: false };
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'CHECK_DUPLICATE', asin }, resp => {
        if (chrome.runtime.lastError) {
          console.warn('[SS Dup] check failed (allowing):', chrome.runtime.lastError.message);
          resolve({ duplicate: false });
          return;
        }
        resolve(resp || { duplicate: false });
      });
    });
  }

  // ── AI helpers (2.1/2.2) ─────────────────────────────────────────────────
  // Route through background SS_AI_GENERATE (handles ssat_ + legacy auth).
  function _aiGenerate(kind, productData) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'SS_AI_GENERATE', kind, productData }, resp => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(resp || null);
      });
    });
  }

  async function aiGenerateTitle(product) {
    const data = {
      title:        product.title || '',
      brand:        product.brand || '',
      category:     product.category || '',
      bulletPoints: Array.isArray(product.bulletPoints) ? product.bulletPoints.slice(0, 3) : []
    };
    const resp = await _aiGenerate('title', data);
    if (resp?.success && Array.isArray(resp.titles) && resp.titles.length) {
      return resp.titles[0].title || resp.titles[0];
    }
    return null;
  }

  async function getSelectedListingTemplate() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['selectedListingTemplateId'], (result) => {
        const id = result.selectedListingTemplateId;
        if (!id) {
          resolve(null);
          return;
        }
        const LISTING_TEMPLATES = [
          {
            id: 'default-professional',
            htmlContent: `<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1a202c; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <header style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="color: #1e3a8a; font-size: 24px; margin: 0; font-weight: 700; line-height: 1.3;">{title}</h1>
  </header>
  
  <section style="margin-bottom: 32px;">
    <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 600; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px;">Product Description</h2>
    <div style="line-height: 1.6; color: #4a5568; font-size: 15px;">
      {description}
    </div>
  </section>
  
  <section style="margin-bottom: 32px;">
    <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 600; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px;">Key Features</h2>
    <div style="line-height: 1.6; color: #4a5568; font-size: 15px;">
      {features}
    </div>
  </section>

  <section style="margin-bottom: 32px;">
    <h2 style="color: #1e3a8a; font-size: 18px; font-weight: 600; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 12px;">Specifications</h2>
    <div style="line-height: 1.6; color: #4a5568; font-size: 15px;">
      {specifications}
    </div>
  </section>
  
  <footer style="margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #f1f5f9;">
      <h3 style="color: #1e3a8a; font-size: 14px; margin: 0 0 8px 0; font-weight: 600; display: flex; items-center: center; gap: 6px;">
        <span>📦</span> Shipping & Handling
      </h3>
      <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">Fast and free shipping on all orders. We package professionally and ship within 1 business day.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #f1f5f9;">
      <h3 style="color: #1e3a8a; font-size: 14px; margin: 0 0 8px 0; font-weight: 600; display: flex; items-center: center; gap: 6px;">
        <span>🔄</span> 30-Day Returns Policy
      </h3>
      <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">Shop with confidence. If you're not completely satisfied, return the item within 30 days for a full refund.</p>
    </div>
  </footer>
</div>`
          }
        ];
        const template = LISTING_TEMPLATES.find(t => t.id === id);
        resolve(template || null);
      });
    });
  }

  function compileTemplate(template, productData, coreDescription) {
    if (!template || !template.htmlContent) {
      return coreDescription;
    }

    let html = template.htmlContent;

    const title = productData.title || '';
    const brand = productData.brand || '';
    const condition = productData.condition || 'New';

    let featuresHtml = '';
    const bullets = productData.bulletPoints || productData.features || [];
    if (bullets.length > 0) {
      featuresHtml = '<ul style="margin: 0; padding-left: 20px; line-height: 1.6;">' +
        bullets.map(b => `<li>${b}</li>`).join('') +
        '</ul>';
    }

    let specificationsHtml = '';
    const specs = productData.specifications || {};
    if (specs && Object.keys(specs).length > 0) {
      specificationsHtml = '<table style="width: 100%; border-collapse: collapse; font-size: 14px;">' +
        Object.entries(specs).map(([k, v]) => `<tr><td style="padding: 8px; border: 1px solid #ddd; width: 30%;"><strong>${k}</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${v}</td></tr>`).join('') +
        '</table>';
    }

    const values = {
      title,
      brand,
      condition,
      description: coreDescription,
      features: featuresHtml,
      specifications: specificationsHtml,
      shipping: '',
      returns: ''
    };

    const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/gi;
    html = html.replace(sectionRegex, (match, content) => {
      const foundPlaceholders = [...content.matchAll(/\{\{?(\w+)\}?\}/g)].map(m => m[1]);
      const shouldRemove = foundPlaceholders.some(key => {
        return values.hasOwnProperty(key) && !values[key];
      });

      if (shouldRemove) {
        return '';
      }
      return match;
    });

    for (const [key, val] of Object.entries(values)) {
      const regex = new RegExp(`\\{\\{?${key}\\}?\\}`, 'g');
      html = html.replace(regex, val || '');
    }

    html = html.replace(/\{\{?\w+\}?\}/g, '');

    // Existing sanitization rules
    html = html
      .replace(/https?:\/\/[^\s<"]+/gi, '')
      .replace(/amazon\.com|walmart\.com/gi, '')
      .replace(/\b(ASIN|UPC|ISBN|Seller Rank|Sales Rank|Sold by|Fulfilled by|Available at)\b/gi, '')
      .replace(/<img[^>]*>/gi, '');

    return html;
  }

  async function aiGenerateDescription(product) {
    const data = {
      title:        product.title || '',
      brand:        product.brand || '',
      bulletPoints: Array.isArray(product.bulletPoints) ? product.bulletPoints : [],
      description:  product.description || ''
    };
    const resp = await _aiGenerate('description', data);
    let aiDesc = resp?.description || resp?.html || (resp?.success ? resp.result : null) || null;

    if (aiDesc) {
      const activeTemplate = await getSelectedListingTemplate();
      if (activeTemplate) {
        console.log('[EbayListingApiHelper] Applying template compiler to generated AI description');
        aiDesc = compileTemplate(activeTemplate, product, aiDesc);
      }
    }
    return aiDesc;
  }

  return {
    getCategoryRecommendations,
    createListing,
    saveListing,
    updateListing,
    addVariations,
    extractListingDraft,
    adaptProduct,
    checkEbayAuth,
    checkVero,
    checkDuplicate,
    aiGenerateTitle,
    aiGenerateDescription,
    compileTemplate,
    getSelectedListingTemplate
  };
})();

// ─── SellerSuitUploader ───────────────────────────────────────────────────────
// Full programmatic upload orchestrator.
// Call: await window.SellerSuitUploader.run(product)
// On success, navigates the current tab to the eBay listing draft editor.

// Build a short upload summary for the post-upload toast (3.2).
function _buildSummary(adapted) {
  const prices = adapted.prod_variations
    .map(v => _cleanFloat(v.price))
    .filter(n => !isNaN(n) && n > 0);
  const lo = prices.length ? Math.min(...prices) : null;
  const hi = prices.length ? Math.max(...prices) : null;
  return {
    photos:     Array.isArray(adapted.prod_images) ? adapted.prod_images.length : 0,
    variations: adapted.prod_variations.length,
    priceLow:   lo,
    priceHigh:  hi
  };
}

// Fire-and-forget DB sync via background SYNC_LISTING handler (3.4).
function _syncListingToDashboard(adapted, product, draftId) {
  return new Promise((resolve) => {
    try {
      // Guard log — final images count reaching uploader
      console.log('[SS sync] isSingleMode:', !!product.isSingleMode,
        '| prod_images count:', adapted.prod_images ? adapted.prod_images.length : 0,
        '| prod_images[0]:', adapted.prod_images?.[0] || null);
      const mainImage = adapted.prod_images?.[0] || null;
      const firstVar = adapted.prod_variations?.[0] || {};
      const listingData = {
        title:               adapted.prod_title,
        sku:                 firstVar.sku || adapted.prod_id || '',
        ebay_price:          firstVar.price || null,
        raw_supplier_price:  firstVar.raw_supplier_price || _cleanFloat(product.price) || null,
        // Supplier-neutral fields (preferred going forward)
        supplier:            product.supplier || 'amazon',
        supplier_id:         product.sourceId || product.asin || product.parentAsin || null,
        supplier_url:        product.url || null,
        supplier_price:      _cleanFloat(product.price) || null,
        // Legacy Amazon-named fields — kept until backend/DB migrates
        amazon_price:        _cleanFloat(product.price) || null,
        amazon_url:          product.url || null,
        amazon_asin:         product.parentAsin || product.asin || null,
        status:              'draft',
        has_variations:      adapted.prod_variations.length > 1,
        variation_count:     adapted.prod_variations.length,
        // Phase 7: source flags
        title_source:        product.title_source       || null,
        description_source:  product.description_source || null,
        price_source:        product.price_source       || null,
        sku_source:          product.sku_source         || null,
        // Per-variation detail for listing_variations table upsert in background
        variations: adapted.prod_variations.map(v => ({
          sku:               v.sku || '',
          ebay_sku_encoded:  (window.SSSkuEngine ? window.SSSkuEngine.encodeForEbay(v.sku || '') : ''),
          final_price:       v.price || 0,
          raw_supplier_price: v.raw_supplier_price || 0,
          currency:          product.currency || 'USD',
          stock_quantity:    1,
          variant_asin:      v.variant_asin || v.supplierVariantId || null,
          parent_asin:       product.parentAsin || product.asin || null,
          attributes:        v.attrs || {},
          // Per-variant image if scraper resolved it; fall back to first product image (HTTPS only — skip base64 watermarks)
          image_url:         [v.img, ...(adapted.prod_images || [])].find(u => u && u.startsWith('http')) || null,
        })),
        ...(mainImage ? {
          amazon_data: { mainImage, imageUrl: mainImage, allImages: adapted.prod_images, source: 'extension', draftId }
        } : {})
      };
      chrome.runtime.sendMessage({ action: 'SYNC_LISTING', payload: listingData }, (resp) => {
        if (chrome.runtime.lastError) {
          console.warn('[SS Sync] SYNC_LISTING failed:', chrome.runtime.lastError.message);
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        if (resp && resp.success === false) {
          // Don't swallow — the listing went to eBay but the dashboard write
          // failed. Tell the user so they don't discover it weeks later.
          console.error('[SS Sync] Dashboard sync FAILED:', resp.status || '', resp.error || 'unknown error');
          const syncErrMsg = 'Listed on eBay, but saving to your dashboard failed: ' + (resp.error || 'unknown error');
          if (window.UIHelper?.showToast) {
            window.UIHelper.showToast(syncErrMsg, 'error');
          } else {
            // Prelist/bulkedit pages don't load ui.js — minimal inline toast so
            // the failure is never invisible.
            try {
              const div = document.createElement('div');
              div.setAttribute('superSolid', 'true');
              div.style.cssText = [
                'position:fixed', 'bottom:24px', 'right:24px', 'z-index:999999',
                'background:#d32f2f', 'color:#fff', 'padding:14px 18px',
                'border-radius:8px', 'font-family:sans-serif', 'font-size:13px',
                'max-width:360px', 'box-shadow:0 4px 16px rgba(0,0,0,.3)'
              ].join(';');
              div.textContent = syncErrMsg;
              document.body.appendChild(div);
              setTimeout(() => div.remove(), 12000);
            } catch (_) { /* non-DOM context — console error above is the record */ }
          }
          resolve(resp);
          return;
        }
        console.log('[SS Sync] Listing synced to dashboard.');
        resolve(resp || { success: true });
      });
    } catch (err) {
      console.warn('[SS Sync] sync error:', err.message);
      resolve({ success: false, error: err.message });
    }
  });
}

window._syncListingToDashboard = _syncListingToDashboard;

function validateProductPricing(product) {
  const hasVariants = product.hasVariants &&
                      Array.isArray(product.variants) &&
                      product.variants.length > 1;
                      
  if (!hasVariants) {
    const supplierPrice = _cleanFloat(product.ebayFinalPrice ? product.supplierPrice : null) || _cleanFloat(product.price) || 0;
    const ebayFinalPrice = _cleanFloat(product.ebayFinalPrice) || _cleanFloat(product.finalPrice) || 0;
    
    if (!ebayFinalPrice || isNaN(ebayFinalPrice) || ebayFinalPrice <= 0) {
      throw new Error('eBay Final Price is missing. Please calculate the final price before uploading.');
    }
    
    const isManual = product.price_source === 'manual';
    if (ebayFinalPrice === supplierPrice && !isManual) {
      throw new Error('eBay Final Price is equal to the original Supplier Price. Please calculate your markup profit rules before listing.');
    }
  } else {
    // Collect active variations exactly like adaptProduct does
    const activeVariants = [];
    (product.variants || []).forEach(v => {
      if (v.isDeleted === true || v.deleted === true) return;
      const hasAttrs = v.attrs && Object.keys(v.attrs).length > 0;
      const hasSpecs = v.specs && Object.keys(v.specs).length > 0;
      if (!hasAttrs && !hasSpecs) return;
      if (v.inStock === false) return;
      activeVariants.push(v);
    });
    
    if (activeVariants.length === 0) {
      throw new Error('No active variations found to upload.');
    }
    
    activeVariants.forEach((v, idx) => {
      const supplierPrice = _cleanFloat(v.ebayFinalPrice ? v.supplierPrice : null) || _cleanFloat(v.price) || 0;
      const ebayFinalPrice = _cleanFloat(v.ebayFinalPrice) || _cleanFloat(v.ebayPrice) || _cleanFloat(v.finalPrice) || 0;
      
      if (!ebayFinalPrice || isNaN(ebayFinalPrice) || ebayFinalPrice <= 0) {
        throw new Error(`eBay Final Price is missing for variation ${idx + 1}. Please calculate the final price before uploading.`);
      }
      
      const isManual = v.price_source === 'manual' || product.price_source === 'manual';
      if (ebayFinalPrice === supplierPrice && !isManual) {
        throw new Error(`eBay Final Price is equal to the original Supplier Price for variation ${idx + 1} unless intentionally set.`);
      }
    });
  }
}

window.SellerSuitUploader = {
  async run(product) {
    const api = window.EbayListingApiHelper;
    console.log('[SS Uploader] Starting programmatic upload for:', product.title?.substring(0, 60));

    // Validate pricing before any action
    validateProductPricing(product);

    // 0. Preflight: eBay auth check (1.1) — fail fast if logged out
    console.log('[SS Uploader] Checking eBay login...');
    const loggedIn = await api.checkEbayAuth();
    if (!loggedIn) {
      throw new Error('You are not logged into eBay. Open eBay.com, sign in, then retry listing.');
    }

    // 0b. VeRO brand screen (1.3) — block flagged brands unless user overrides
    if (!product.forceVeroOverride) {
      console.log('[SS Uploader] Running VeRO brand check...');
      const vero = await api.checkVero(product.title || '');
      if (vero.flagged && vero.matches?.length) {
        const brands = vero.matches.map(m => m.brand).join(', ');
        const err = new Error(
          `VeRO risk: this product matches protected brand(s): ${brands}. ` +
          `Listing it may get your eBay account suspended. Remove the brand from the title, ` +
          `or enable "List anyway" to override.`
        );
        err.veroMatches = vero.matches;
        err.isVeroBlock = true;
        throw err;
      }
    }

    // 0c. Duplicate check (1.2) — warn if this ASIN already listed by user
    const dupAsin = product.parentAsin || product.asin || '';
    if (dupAsin && !product.forceDuplicateOverride) {
      console.log('[SS Uploader] Checking for duplicate listing...');
      const dup = await api.checkDuplicate(dupAsin);
      if (dup.duplicate) {
        const when = dup.listing?.created_at
          ? new Date(dup.listing.created_at).toLocaleDateString() : 'previously';
        const err = new Error(
          `Duplicate: you already listed this product (ASIN ${dupAsin}) ${when}. ` +
          `List again to create a second listing, or cancel.`
        );
        err.isDuplicateBlock = true;
        err.duplicateListing = dup.listing || null;
        throw err;
      }
    }

    // 0d. Optional AI optimization (2.1/2.2) — opt-in via flags from panel.
    if (product.useAiTitle) {
      console.log('[SS Uploader] Generating AI title...');
      try {
        const aiTitle = await api.aiGenerateTitle(product);
        if (aiTitle) product = { ...product, title: aiTitle };
      } catch (e) { console.warn('[SS AI] title gen failed:', e.message); }
    }
    if (product.useAiDescription) {
      console.log('[SS Uploader] Generating AI description...');
      try {
        const aiDesc = await api.aiGenerateDescription(product);
        if (aiDesc) product = { ...product, description: aiDesc, bulletPoints: [] };
      } catch (e) { console.warn('[SS AI] description gen failed:', e.message); }
    } else {
      const isHtml = product.description && (product.description.trim().startsWith('<') || product.description.includes('</'));
      if (!isHtml) {
        try {
          const activeTemplate = await api.getSelectedListingTemplate();
          if (activeTemplate) {
            console.log('[SS Uploader] Applying active template to raw description');
            product.description = api.compileTemplate(activeTemplate, product, product.description || '');
            product.bulletPoints = [];
          }
        } catch (e) {
          console.warn('[SS Uploader] Failed to apply template to raw description:', e);
        }
      }
    }

    const adapted = api.adaptProduct(product);

    // 1. Category recommendation
    console.log('[SS Uploader] Fetching category recommendations...');
    const catResp = await api.getCategoryRecommendations(adapted.prod_title);
    const categories = catResp.searchCategories;
    if (!categories?.length) {
      throw new Error('No eBay categories found — make sure you are logged into eBay.com and try again.');
    }

    let categoryId;
    for (const cat of categories) {
      if (cat.leaf) { categoryId = cat.value; break; }
    }
    if (!categoryId) categoryId = categories[0].value;
    console.log('[SS Uploader] Category ID:', categoryId);

    // 2. Create listing draft (fetches eBay's listing page, parses inline JS)
    console.log('[SS Uploader] Creating listing draft...');
    const [listingData, appData, parsedCsrf] = await api.createListing(adapted.prod_title, categoryId);

    // 3. Extract draftId, CSRF, epsData
    const { draftId, draftCsrfValue, epsData, listingModel, aspectNames } =
      api.extractListingDraft(listingData, appData, parsedCsrf);
    console.log('[SS Uploader] Draft ID:', draftId, '— uploading images + fields...');

    // Verification log — the final mapped fields immediately before they are
    // sent to eBay. Makes title/description/price/SKU observable per upload so
    // a missing/wrong field is caught here instead of on the live listing.
    const _v0 = (adapted.prod_variations && adapted.prod_variations[0]) || {};
    console.log('[SS Uploader] FINAL PAYLOAD →', {
      title:            adapted.prod_title,
      titleLen:         (adapted.prod_title || '').length,
      descriptionLen:   (adapted.prod_desc || '').length,
      descriptionHead:  (adapted.prod_desc || '').slice(0, 80),
      price:            _v0.price,
      rawSupplierPrice: _v0.raw_supplier_price,
      sku:              _v0.sku,
      skuEncoded:       window.SSSkuEngine ? window.SSSkuEngine.encodeForEbay(_v0.sku || '') : _v0.sku,
      variations:       adapted.prod_variations.length
    });

    // 4. Upload main product images to EPS + save base listing payload
    await api.updateListing(draftId, draftCsrfValue, epsData, listingModel, adapted);
    console.log('[SS Uploader] Listing saved.');

    const isSingleVariation = adapted.prod_variations.length <= 1;
    const suffix = window.location.host.split('ebay').pop()?.replace('.', '') || 'com';

    const ssSummary = _buildSummary(adapted);

    if (isSingleVariation) {
      // 5a. Single-variation: mark done, go straight to draft editor
      // Sync to dashboard now (3.4) — variations handled later for multi.
      const uploadSessionId = crypto.randomUUID();
      const syncResp = await _syncListingToDashboard(adapted, product, draftId);

      // Bulk Lister path: the worker owns this tab. Return a terminal result
      // instead of navigating to the draft editor — ebay_prelist.js reports it
      // via BULK_ITEM_RESULT and the background closes the tab.
      if (product.bulkMode) {
        console.log('[SS Uploader] Single variation (bulk) — done, returning result.');
        return {
          ssBulk: true,
          success: true,
          draftId,
          listingId: (syncResp && syncResp.listingId) || null,
          variationCount: adapted.prod_variations.length,
          syncOk: !(syncResp && syncResp.success === false)
        };
      }

      await chrome.storage.local.set({
        [uploadSessionId]: {
          product,
          isImported: true,
          draftId,
          epsData,
          smsAspects: aspectNames,
          ssSummary
        }
      });
      console.log('[SS Uploader] Single variation — navigating to listing draft...');
      window.location.href = `https://www.ebay.${suffix}/lstng?draftId=${draftId}&mode=AddItem&uploadSessionId=${uploadSessionId}`;
    } else {
      // 5b. Multi-variation: store state for bulkedit phase, navigate to MSKU editor
      // ebay_bulkedit.js will pick up the product + run addVariations there
      const uploadSessionId = crypto.randomUUID();
      await chrome.storage.local.set({
        [uploadSessionId]: {
          product,
          isImported: false,   // bulkedit phase not done yet
          draftId,
          epsData,
          smsAspects:  aspectNames,
          categoryId,
          needsVariations: true,
          ssSummary,
          // Bulk Lister metadata — ebay_bulkedit.js reports the terminal
          // BULK_ITEM_RESULT against the worker's ORIGINAL session id.
          ...(product.bulkMode ? {
            bulkMode: true,
            bulkSessionId: product.__ssBulkSessionId || null
          } : {})
        }
      });
      console.log('[SS Uploader] Multi-variation — navigating to bulkedit MSKU editor...');
      window.location.href =
        `https://bulkedit.ebay.${suffix}/msku?draftId=${draftId}&listingMode=AddItem` +
        `&categoryId=${categoryId}&decimalSymbol=.&maxPics=12&loadDraft=true&uploadSessionId=${uploadSessionId}`;
    }
  }
};

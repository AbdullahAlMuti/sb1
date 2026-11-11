/**
 * amazon-scraper-v2.js — data-first Amazon product scraper.
 *
 * Replaces the whole-blob SuperDS JSON-repair approach with targeted,
 * brace-balanced extraction of individual twister fields, so one malformed
 * region of Amazon's inline JS can no longer wipe out variation data.
 *
 * Design rules:
 *  - Enumerate variants from embedded twister JSON (dimensionToAsinMap /
 *    dimensionValuesDisplayData / variationValues / dimensionsDisplay) BEFORE
 *    any DOM interaction — clicking is only a price/quantity enrichment tier.
 *  - Images from ImageBlockATF / colorImages inline data (hiRes > large),
 *    size modifiers stripped to resolve the largest version; DOM fallback.
 *  - Item specifics from the full set of detail tables and bullets.
 *  - Every stage guarded: a failed stage degrades, never throws out of the
 *    scraper (the two user-facing qty errors from v1 are preserved verbatim).
 *  - Output shape is byte-compatible with SsAmazonVariantScraper so all
 *    downstream code (normalize → draft → panel → adaptProduct) is untouched.
 *
 * The v1 scraper (amazon-variant-scraper.js) stays loaded; the supplier
 * adapter calls v2 first and falls back to v1 on failure.
 */
(function () {
  'use strict';

  // ─── Pure helpers (regression-tested via _internals) ────────────────────────

  /**
   * Scan a balanced {...} or [...] starting at text[startIdx]. Quote-aware for
   * both quote styles with backslash escapes. Returns the raw substring
   * including delimiters, or null.
   */
  function _extractBalanced(text, startIdx) {
    const open = text[startIdx];
    const close = open === '{' ? '}' : open === '[' ? ']' : null;
    if (!close) return null;
    let depth = 0;
    let quote = null;
    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i];
      if (quote) {
        if (ch === '\\') { i++; continue; }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return text.slice(startIdx, i + 1);
      }
    }
    return null;
  }

  /**
   * Find `"key": <value>` in a JS/JSON blob and return the raw value text.
   * Accepts double-quoted, single-quoted, or bare keys. Objects/arrays are
   * balance-scanned; strings and primitives are taken to the next delimiter.
   */
  function _extractKeyedValue(text, key) {
    const re = new RegExp('["\']?' + key + '["\']?\\s*:', 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
      // Skip matches where `key` is a suffix of a longer identifier
      const before = text[m.index - 1];
      if (before && /[A-Za-z0-9_$]/.test(before)) continue;
      let i = m.index + m[0].length;
      while (i < text.length && /\s/.test(text[i])) i++;
      const ch = text[i];
      if (ch === '{' || ch === '[') return _extractBalanced(text, i);
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < text.length) {
          if (text[j] === '\\') { j += 2; continue; }
          if (text[j] === ch) return text.slice(i, j + 1);
          j++;
        }
        return null;
      }
      // primitive (number / true / false / null)
      let j = i;
      while (j < text.length && /[^,}\]\s]/.test(text[j])) j++;
      return text.slice(i, j) || null;
    }
    return null;
  }

  /** Parse a raw fragment as JSON; tolerate single-quoted strings as fallback. */
  function _parseFragment(raw) {
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch (_) { /* try repair below */ }
    try {
      // Single-quoted JSON -> double-quoted. Escaped single quotes are parked on
      // a control-char sentinel so they survive the swap as literal apostrophes.
      const SENT = String.fromCharCode(1);
      const swapped = raw
        .replace(/\\'/g, SENT)
        .replace(/"/g, '\\"')
        .replace(/'/g, '"')
        .split(SENT).join("'");
      return JSON.parse(swapped);
    } catch (_) { return null; }
  }

  /**
   * Strip Amazon image size modifiers (e.g. `._AC_SX522_.` / `._SL1500_.`)
   * so the URL resolves to the original, largest asset.
   */
  function _stripSizeModifier(url) {
    if (typeof url !== 'string') return url;
    return url.replace(/\._[^/.]*_\./g, '.');
  }

  /**
   * Extract a colorImages-style map from raw inline JS without parsing the
   * whole blob: balance-scan the object, then per color key balance-scan its
   * image array and regex out hiRes/large/thumb URLs. Survives apostrophes in
   * color names and malformed sibling fields.
   * @returns {Object<string, Array<{hiRes:?string, large:?string, thumb:?string}>>}
   */
  function _extractColorImages(text) {
    const out = {};
    const raw = _extractKeyedValue(text, 'colorImages');
    if (!raw || raw[0] !== '{') return out;
    let i = 1;
    while (i < raw.length - 1) {
      // seek key start
      while (i < raw.length && raw[i] !== '"' && raw[i] !== "'" && raw[i] !== '}') i++;
      if (i >= raw.length || raw[i] === '}') break;
      const q = raw[i];
      let j = i + 1;
      while (j < raw.length) {
        if (raw[j] === '\\') { j += 2; continue; }
        if (raw[j] === q) break;
        j++;
      }
      const key = raw.slice(i + 1, j).replace(/\\(['"])/g, '$1');
      i = j + 1;
      while (i < raw.length && raw[i] !== '[' && raw[i] !== '{' && raw[i] !== ',' && raw[i] !== '}') i++;
      if (raw[i] === '[' || raw[i] === '{') {
        const valRaw = _extractBalanced(raw, i);
        if (valRaw) {
          const imgs = [];
          const entryRe = /["'](hiRes|large|thumb)["']\s*:\s*["'](https:[^"']+)["']/g;
          // group per image object: split on '},' boundaries is fragile; collect
          // sequential pairs and start a new image whenever a field repeats.
          let cur = {};
          let em;
          while ((em = entryRe.exec(valRaw)) !== null) {
            const [, field, url] = em;
            if (cur[field] !== undefined) { imgs.push(cur); cur = {}; }
            cur[field] = url.replace(/\\/g, '');
          }
          if (Object.keys(cur).length) imgs.push(cur);
          if (imgs.length) out[key] = imgs;
          i += valRaw.length;
        } else {
          i++;
        }
      }
    }
    return out;
  }

  /** Clean one spec key/value pair; returns null when it is junk. */
  function _cleanSpecPair(key, val) {
    const k = String(key || '').replace(/[‎‏]/g, '').replace(/\s+/g, ' ').replace(/\s*:\s*$/, '').trim();
    const v = String(val || '').replace(/[‎‏]/g, '').replace(/\s+/g, ' ').trim();
    if (!k || !v) return null;
    const JUNK = /^(customer reviews|best sellers rank|asin|date first available)$/i;
    if (JUNK.test(k)) return null;
    if (v.length > 500) return null;
    return [k, v];
  }

  // ─── DOM readers (all optional, all guarded) ────────────────────────────────

  function _scriptsText() {
    let all = [];
    try {
      document.querySelectorAll('script').forEach(s => { if (s.textContent) all.push(s.textContent); });
    } catch (_) {}
    return all;
  }

  function _findScript(texts, marker) {
    for (const t of texts) if (t.includes(marker)) return t;
    return null;
  }

  /**
   * Pull the twister fields v2 needs, each independently. Missing fields stay
   * null — a parse failure on one cannot take down the others.
   */
  function _parseTwisterFields(twisterText) {
    const get = key => _parseFragment(_extractKeyedValue(twisterText, key));
    const fields = {
      dimensionToAsinMap:         get('dimensionToAsinMap'),
      dimensionValuesDisplayData: get('dimensionValuesDisplayData'),
      dimensionValuesData:        get('dimensionValuesData'),
      variationValues:            get('variationValues'),
      dimensions:                 get('dimensions'),
      dimensionsDisplay:          get('dimensionsDisplay'),
      variationDisplayLabels:     get('variationDisplayLabels'),
      visualDimensions:           get('visualDimensions'),
      parentAsin:                 (() => {
        const raw = _extractKeyedValue(twisterText, 'parentAsin');
        const v = _parseFragment(raw);
        return typeof v === 'string' ? v : null;
      })(),
    };
    // Derive asinToDimensionIndexMap from dimensionToAsinMap (same inversion v1 does)
    if (fields.dimensionToAsinMap && typeof fields.dimensionToAsinMap === 'object') {
      const inv = {};
      for (const dimKey of Object.keys(fields.dimensionToAsinMap)) {
        inv[fields.dimensionToAsinMap[dimKey]] = dimKey.split('_').map(Number);
      }
      fields.asinToDimensionIndexMap = inv;
    } else {
      fields.asinToDimensionIndexMap = null;
    }
    return fields;
  }

  function _cleanPriceText(str) {
    if (!str) return null;
    let decoded = str.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
                     .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
    const currencyRegex = /(A\$|C\$|R\$|\$|£|€|¥|₹)\s*(\d[\d.,\s]*\d|\d)|(\d[\d.,\s]*\d|\d)\s*(A\$|C\$|R\$|\$|£|€|¥|₹)/;
    const match = decoded.match(currencyRegex);
    if (match) {
      let rawNum = '';
      let sym = '$';
      if (match[2]) {
        rawNum = match[2].trim();
        sym = match[1];
      } else if (match[3]) {
        rawNum = match[3].trim();
        sym = match[4];
      }
      rawNum = rawNum.replace(/\s/g, '');
      let decimalSep = '.';
      const lastComma = rawNum.lastIndexOf(',');
      const lastDot = rawNum.lastIndexOf('.');
      if (lastComma !== -1 && lastDot !== -1) {
        decimalSep = lastComma > lastDot ? ',' : '.';
      } else if (lastComma !== -1) {
        if (rawNum.length - lastComma === 4) {
          decimalSep = '.';
        } else {
          decimalSep = ',';
        }
      } else if (lastDot !== -1) {
        if (rawNum.length - lastDot === 4) {
          decimalSep = ',';
        } else {
          decimalSep = '.';
        }
      }
      let priceStr = '';
      for (let i = 0; i < rawNum.length; i++) {
        const ch = rawNum[i];
        if (ch >= '0' && ch <= '9') {
          priceStr += ch;
        } else if (ch === decimalSep) {
          priceStr += '.';
        }
      }
      const price = parseFloat(priceStr);
      if (price > 0) {
        return { price, symbol: sym };
      }
    }
    return null;
  }

  // A price node that is NOT what the buyer pays: struck-through list/"was"
  // price, "typical price" basis, or a per-unit price ($0.50/Count).
  function _isNonPayablePrice(el) {
    try {
      const cls = ' ' + (el.className && typeof el.className === 'string' ? el.className : '') + ' ';
      const isToPay = cls.includes(' priceToPay ') || cls.includes(' apexPriceToPay ');
      if (el.getAttribute && el.getAttribute('data-a-strike') === 'true') return true;
      if (cls.includes(' a-text-price ') && !isToPay) return true;
      if (el.closest && el.closest('.basisPrice, .pricePerUnit, [data-a-strike="true"], #listPrice, .a-text-strike')) return true;
    } catch (_) {}
    return false;
  }

  function _getBuyboxFromDom(targetAsin, root) {
    root = root || document;
    try {
      const el = root.querySelector('.twister-plus-buying-options-price-data');
      if (el && el.textContent) {
        try {
          const p = JSON.parse(el.textContent);
          const g = p && p.desktop_buybox_group_1;
          if (g && g.length > 0) {
            // Entries can carry per-ASIN prices; match the target variant when
            // asked so a stale buybox render can't mislabel a sibling's price.
            if (targetAsin) {
              const hit = g.find(e => e && e.asin && e.asin.toUpperCase() === targetAsin.toUpperCase());
              if (hit) return hit;
            }
            return g[0];
          }
        } catch (_) {}
      }
      // Priority order matters: querySelectorAll(list.join(',')) returns DOM
      // order, which let a struck-through list price or a per-unit price win.
      // Each selector is tried in turn; non-payable prices are skipped; the
      // generic `.a-price` is only trusted inside a known buybox container.
      const BUYBOX_ROOTS =
        '#corePrice_feature_div, #corePriceDisplay_desktop_feature_div, #corePrice_desktop, ' +
        '#apex_desktop, #apex_price, #buybox, #desktop_buybox, #tp_price_block_total_price_ww';
      const selectors = [
        '.priceToPay',
        '.apexPriceToPay',
        '#price_inside_buybox',
        '#priceblock_dealprice',
        '#priceblock_saleprice',
        '#priceblock_ourprice',
        '#priceblock_businessprice',
        '#newBuyBoxPrice',
        '#sns-base-price',
        '.reinventPricePriceToPayMargin .a-price',
        '#tp_price_block_total_price_ww .a-price',
        '#apex_price .a-price',
        '#apex_desktop .a-price',
        '#corePrice_feature_div .a-price',
        '#corePriceDisplay_desktop_feature_div .a-price',
        '#corePrice_desktop .a-price',
        '.a-price'
      ];
      for (const selector of selectors) {
        let priceEls = [];
        try { priceEls = Array.from(root.querySelectorAll(selector)); } catch (_) { continue; }
        for (const priceEl of priceEls) {
          if (_isNonPayablePrice(priceEl)) continue;
          if (selector === '.a-price' && !(priceEl.closest && priceEl.closest(BUYBOX_ROOTS))) continue;
          const sym = (priceEl.querySelector?.('.a-price-symbol')?.textContent || '$').trim();
          const rawText = priceEl.querySelector?.('.a-offscreen')?.textContent || priceEl.textContent || '';
          const parsed = _cleanPriceText(rawText);
          if (parsed && parsed.price > 0) {
            return { priceAmount: parsed.price, currencySymbol: parsed.symbol || sym };
          }
          const whole = (priceEl.querySelector?.('.a-price-whole')?.textContent || '').replace(/[^\d]/g, '');
          const frac  = (priceEl.querySelector?.('.a-price-fraction')?.textContent || '00').trim().replace(/[^\d]/g, '').slice(0, 2);
          const price = parseFloat(`${whole || 0}.${frac || '00'}`);
          if (price > 0) return { priceAmount: price, currencySymbol: sym };
        }
      }
    } catch (_) {}
    return null;
  }

  function _getQuantityFromDom(root) {
    try {
      const sel = (root || document).querySelector('select[name="quantity"]');
      if (!sel) return 1;
      const opts = Array.from(sel.querySelectorAll('option'));
      if (!opts.length) return 1;
      return parseInt(opts[opts.length - 1].value) || 1;
    } catch (_) { return 1; }
  }

  // A bare "$" is ambiguous: amazon.ca and amazon.com.au print CAD/AUD with it.
  // The storefront host decides; an explicit symbol (C$, £, €) still wins.
  function _currencyForHost(host) {
    const h = String(host || '').toLowerCase();
    if (/(^|\.)amazon\.ca$/.test(h)) return 'CAD';
    if (/(^|\.)amazon\.com\.au$/.test(h)) return 'AUD';
    if (/(^|\.)amazon\.co\.uk$/.test(h)) return 'GBP';
    if (/(^|\.)amazon\.de$/.test(h)) return 'EUR';
    return 'USD';
  }

  function _resolveCurrency(sym) {
    let host = '';
    try { host = location.hostname || location.host || ''; } catch (_) {}
    const hostCurrency = _currencyForHost(host);
    if (!sym || sym === '$') return hostCurrency;
    return { '£': 'GBP', '€': 'EUR', '¥': 'JPY', 'A$': 'AUD', 'C$': 'CAD', '₹': 'INR', 'R$': 'BRL' }[sym] || hostCurrency;
  }

  /**
   * Supplier-side shipping charge from the delivery message.
   * "FREE delivery ..." -> 0, "$6.99 delivery ..." -> 6.99, unknown -> null
   * (null means "not stated" — callers must not treat it as free).
   */
  function _parseShippingCost(text) {
    const t = String(text || '').replace(/\s+/g, ' ');
    if (!t) return null;
    const paid = t.match(/(?:A\$|C\$|\$|£|€)\s*(\d+(?:[.,]\d{1,2})?)\s*(?:delivery|shipping)/i);
    if (paid) {
      const n = parseFloat(paid[1].replace(',', '.'));
      return n >= 0 ? n : null;
    }
    if (/\bfree\b[^.]{0,40}\b(delivery|shipping)\b/i.test(t)) return 0;
    return null;
  }

  function _checkStock(root) {
    try {
      const el = (root || document).querySelector('#availability');
      if (!el) return true;
      const txt = (el.querySelector('span') || el).innerText.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!txt) return true;
      return [
        /^in stock/, /^only \d+ left in stock/, /^available to ship/, /^usually ships within/,
        /^auf lager/, /^nur noch \d+ auf lager/, /^versandfertig in/,
        /^en stock/, /^solo quedan? \d+ en stock/,
        /^op voorraad/, /^nog maar \d+ op voorraad/,
        /^il ne reste plus que \d+/, /^disponibilit/,
      ].some(p => p.test(txt));
    } catch (_) { return true; }
  }

  function _decodeText(s) {
    if (!s) return '';
    const ents = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&nbsp;': ' ' };
    let out = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    out = out.replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    out = out.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
    out = out.replace(/&(?:#(?:x[0-9a-fA-F]+|\d+)|[a-zA-Z]+);/gi, m => ents[m.toLowerCase()] ?? m);
    return out;
  }

  function _normalizeBrandText(text) {
    const t = _decodeText(String(text || ''))
      .replace(/\s+/g, ' ')
      .replace(/^Brand\s*:\s*/i, '')
      .replace(/^Visit\s+the\s+/i, '')
      .replace(/^Shop\s+the\s+/i, '')
      .replace(/\s+Store$/i, '')
      .trim();
    return /^(store|brand)$/i.test(t) ? '' : t;
  }

  function _getRatingReviewFromDom() {
    try {
      const ratingText = document.querySelector('#acrPopover[title], .reviewCountTextLinkedHistogram[title], .a-icon-star .a-icon-alt')?.getAttribute('title') ||
        document.querySelector('#acrPopover .a-icon-alt, .reviewCountTextLinkedHistogram .a-icon-alt')?.textContent ||
        '';
      const reviewText = document.querySelector('#acrCustomerReviewText')?.textContent || '';
      const ratingMatch = String(ratingText).match(/(\d+(?:[.,]\d+)?)/);
      const reviewMatch = String(reviewText).replace(/,/g, '').match(/(\d+)/);
      return {
        rating: ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : null,
        reviewCount: reviewMatch ? parseInt(reviewMatch[1], 10) : null,
      };
    } catch (_) {
      return { rating: null, reviewCount: null };
    }
  }

  function _getShippingInfoDom() {
    try {
      const el = document.querySelector('#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE, #deliveryBlockMessage, #ddmDeliveryMessage, #mir-layout-DELIVERY_BLOCK');
      return el ? _decodeText(el.textContent || '').replace(/\s+/g, ' ').trim() : '';
    } catch (_) { return ''; }
  }

  /**
   * Item specifics — full sweep across every detail table/bullet block Amazon
   * uses (varies by category/locale). v1 only read three selectors.
   */
  function _collectSpecsDom() {
    const specs = {};
    const addPair = (k, v) => {
      const pair = _cleanSpecPair(k, v);
      if (pair && specs[pair[0]] === undefined) specs[pair[0]] = pair[1];
    };
    try {
      document.querySelectorAll([
        '#productOverview_feature_div tr',
        '#productDetails_techSpec_section_1 tr',
        '#productDetails_techSpec_section_2 tr',
        '#productDetails_detailBullets_sections1 tr',
        '#productDetails_expanderTables_depthLeftSections tr',
        '.prodDetTable tr',
      ].join(', ')).forEach(row => {
        const key = row.querySelector('th, .a-col-left')?.textContent;
        const val = row.querySelector('td, .a-col-right')?.textContent;
        addPair(key, val);
      });
    } catch (_) {}
    try {
      // detail bullets: "<b>Key :</b> Value" inside li > span.a-list-item
      document.querySelectorAll('#detailBullets_feature_div li .a-list-item').forEach(li => {
        const bold = li.querySelector('.a-text-bold');
        if (!bold) return;
        const key = bold.textContent;
        const val = li.textContent.replace(bold.textContent, '');
        addPair(key, val);
      });
    } catch (_) {}
    try {
      const brand = document.querySelector('#bylineInfo');
      if (brand && specs['Brand'] === undefined) {
        const b = _decodeText(brand.textContent.trim().replace(/^(Brand:|Visit the|Store)/i, '').replace(/Store$/i, '').trim());
        if (b) specs['Brand'] = b;
      }
    } catch (_) {}
    return specs;
  }

  /** Product images: ImageBlockATF initial set (hiRes > large), DOM fallback. */
  function _collectImages(texts, colorImagesMap) {
    const seen = new Set();
    const images = [];
    const push = url => {
      const u = _stripSizeModifier(url);
      if (u && !seen.has(u)) { seen.add(u); images.push(u); }
    };
    try {
      const atf = _findScript(texts, 'ImageBlockATF');
      if (atf) {
        const ci = _extractColorImages(atf);
        const initial = ci.initial || ci[Object.keys(ci)[0]];
        (initial || []).forEach(img => push(img.hiRes || img.large || img.thumb));
      }
    } catch (_) {}
    try {
      // Per-color firsts (parity with v1 getImages secondary tier)
      Object.keys(colorImagesMap || {}).forEach(key => {
        if (key === 'initial') return;
        const first = colorImagesMap[key] && colorImagesMap[key][0];
        if (first) push(first.hiRes || first.large || first.thumb);
      });
    } catch (_) {}
    if (images.length === 0) {
      try {
        const landing = document.querySelector('#landingImage, #imgBlkFront');
        if (landing) push(landing.getAttribute('data-old-hires') || landing.src);
        document.querySelectorAll('#altImages li img, #imageBlock img').forEach(img => {
          const src = img.getAttribute('data-old-hires') || img.src || '';
          if (!src || src.includes('transparent-pixel') || src.includes('base64')) return;
          push(src);
        });
      } catch (_) {}
    }
    return images;
  }

  // The uploader lists as eBay condition "New". A renewed / refurbished /
  // used supplier item must be recognised so it is never listed as New.
  // Signals: the "(Renewed)" / "(Refurbished)" title suffix Amazon adds, the
  // "Amazon Renewed" store byline, and the selected buying-option label
  // ("Refurbished - Excellent", "Used - Like New").
  function _detectCondition(title, byline, buyingOptionText) {
    const t = String(title || '');
    const b = String(byline || '');
    const o = String(buyingOptionText || '');
    if (/^\s*used\b/i.test(o) || /\(\s*used\s*\)\s*$/i.test(t)) return 'Used';
    if (/^\s*(refurbished|renewed)\b/i.test(o) ||
        /\(\s*(renewed|refurbished|certified refurbished)(\s+premium)?\s*\)/i.test(t) ||
        /\bamazon renewed\b/i.test(b)) return 'Refurbished';
    return 'New';
  }

  function _captchaGuard() {
    if (
      document.querySelector('form[action*="validateCaptcha"]') ||
      (document.body && document.body.innerText.includes('Type the characters you see in this image'))
    ) throw new Error('Amazon CAPTCHA detected — please solve it and try again');
  }

  function _baseFields() {
    const currentAsin = document.querySelector('input#ASIN, input#asin')?.value ||
      window.location.pathname.match(/\/(?:dp|gp\/aw\/d)\/([A-Z0-9]{10})/)?.[1] || '';
    const title = _decodeText((document.querySelector('#productTitle')?.textContent || '').trim());
    const brandEl = document.querySelector('#bylineInfo');
    const brand = brandEl ? _normalizeBrandText(brandEl.textContent) : '';
    const _texts = sel => Array.from(document.querySelectorAll(sel))
      .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 5);
    let bulletPoints = _texts('#feature-bullets li span.a-list-item');
    // Newer "product facts" layout has no #feature-bullets block.
    if (bulletPoints.length === 0) bulletPoints = _texts('#productFactsDesktopExpander li span.a-list-item, #productFactsDesktop_feature_div li span.a-list-item');
    const descEl = document.querySelector('#productDescription');
    let description = descEl ? descEl.textContent.trim().replace(/\s+/g, ' ') : '';
    // Many listings carry their description only as A+ content.
    if (!description) {
      const seen = new Set();
      description = _texts('#aplus p, #aplus h3, #aplus h4, #aplus li')
        .filter(t => !seen.has(t) && seen.add(t)).join(' ').slice(0, 4000);
    }
    const category = Array.from(
      document.querySelectorAll('#wayfinding-breadcrumbs_container li a, .a-breadcrumb a')
    ).map(el => el.textContent.trim()).filter(Boolean).join(' > ');
    const ratingReviews = _getRatingReviewFromDom();
    return {
      currentAsin,
      title,
      brand,
      bulletPoints,
      description,
      category,
      condition: _detectCondition(
        title,
        brandEl ? brandEl.textContent : '',
        (document.querySelector('#newAccordionRow_0 .a-accordion-row-a11y, #newAccordionRow_0 h5, #usedAccordionRow h5, #buybox .a-accordion-active h5')?.textContent || '').trim()
      ),
      shippingInfo: _getShippingInfoDom(),
      shippingCost: _parseShippingCost(_getShippingInfoDom()),
      rating: ratingReviews.rating,
      reviewCount: ratingReviews.reviewCount,
    };
  }

  // ─── Variant attr/img mapping ───────────────────────────────────────────────

  function _attrsForAsin(tw, asin) {
    const attrs = {};
    const display = tw.dimensionValuesDisplayData && tw.dimensionValuesDisplayData[asin];
    const dims = Array.isArray(tw.dimensions) ? tw.dimensions : [];
    const labelFor = (dim, i) =>
      (tw.variationDisplayLabels && tw.variationDisplayLabels[dim]) ||
      (Array.isArray(tw.dimensionsDisplay) && tw.dimensionsDisplay[i]) || dim;
    if (Array.isArray(display)) {
      display.forEach((val, i) => {
        const dim = dims[i];
        if (dim != null && val != null) attrs[labelFor(dim, i)] = { productName: _decodeText(String(val)) };
      });
    }
    return attrs;
  }

  function _imageForVariant(tw, attrs, colorImagesMap) {
    const none = { img: undefined, images: [], imgProp: undefined };
    try {
      const dims = Array.isArray(tw.dimensions) ? tw.dimensions : [];
      const labelOf = (d) => {
        const i = dims.indexOf(d);
        return (tw.variationDisplayLabels && tw.variationDisplayLabels[d]) ||
               (Array.isArray(tw.dimensionsDisplay) && i >= 0 && tw.dimensionsDisplay[i]) || d;
      };
      const norm = k => String(k).toLowerCase().replace(/\s+/g, ' ').trim();
      const byKey = {};
      Object.keys(colorImagesMap || {}).forEach(k => { if (k !== 'initial') byKey[norm(k)] = colorImagesMap[k]; });
      if (Object.keys(byKey).length === 0) return none;

      // This variant's values in twister dimension order.
      const parts = dims
        .map(d => ({ dim: d, label: labelOf(d), value: attrs[labelOf(d)] && attrs[labelOf(d)].productName }))
        .filter(x => x.value != null && String(x.value).trim() !== '');
      if (parts.length === 0) return none;

      // colorImages keys are the values of the "visual" dimensions joined by a
      // space — sometimes just the colour, sometimes "<Size> <Color>" (seen
      // live on a 4-dimension listing where visualDimensions was absent).
      // Try every in-order subset of this variant's values and accept only an
      // EXACT key match — never a prefix/first-word guess, which gave
      // "Light Blue" the "Light Green" photos. Prefer the declared visual
      // dimensions, then the most specific (longest) subset.
      const candidates = [];
      const declared = Array.isArray(tw.visualDimensions) ? tw.visualDimensions : [];
      if (declared.length) candidates.push(parts.filter(x => declared.includes(x.dim)));
      const n = parts.length;
      const subsets = [];
      for (let mask = 1; mask < (1 << n); mask++) {
        subsets.push(parts.filter((_, i) => mask & (1 << i)));
      }
      subsets.sort((x, y) => y.length - x.length);
      candidates.push(...subsets);

      for (const subset of candidates) {
        if (!subset.length) continue;
        const set = byKey[norm(subset.map(x => x.value).join(' '))];
        if (!set || !set.length) continue;
        const urls = [];
        set.forEach(im => {
          const u = _stripSizeModifier(im && (im.hiRes || im.large || im.thumb));
          if (u && !urls.includes(u)) urls.push(u);
        });
        if (!urls.length) continue;
        // eBay groups variation pictures by ONE aspect: the colour-like
        // dimension of the match, else the last matched dimension.
        const colorPart = subset.find(x => /colou?r/i.test(x.dim) || /colou?r/i.test(x.label));
        return { img: urls[0], images: urls, imgProp: (colorPart || subset[subset.length - 1]).label };
      }
      return none;
    } catch (_) { return none; }
  }

  // ─── Direct DOM selection and scraping (click tier — optional) ──────────────

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function _getBuyboxAndQtyFromDom(targetAsin) {
    const isAvailable = _checkStock();
    const bb = _getBuyboxFromDom(targetAsin);
    const qty = isAvailable ? (_getQuantityFromDom() || 1) : 0;
    return {
      price: bb ? bb.priceAmount : null,
      currency: bb ? _resolveCurrency(bb.currencySymbol) : 'USD',
      quantity: qty
    };
  }

  function _buyboxSignature() {
    const bb = _getBuyboxFromDom();
    return bb ? `${bb.priceAmount}|${bb.currencySymbol || ''}` : '';
  }

  // Same-origin hidden-iframe enrichment: on modern inline-twister pages a
  // swatch click NAVIGATES (destroying this script mid-scan), and fetch()'d
  // pages carry no server-rendered buybox — so the variant's own /dp/ page is
  // rendered in a hidden iframe instead and its hydrated DOM is read directly.
  async function _iframeScrapeVariant(asin, budgetMs) {
    budgetMs = budgetMs || 9000;
    let fr;
    try {
      fr = document.createElement('iframe');
      fr.setAttribute('aria-hidden', 'true');
      fr.style.cssText =
        'position:fixed;width:1200px;height:900px;left:-99999px;top:0;visibility:hidden;pointer-events:none;';
      fr.src = `${location.origin}/dp/${encodeURIComponent(asin)}?th=1&psc=1`;
      document.body.appendChild(fr);
      const t0 = Date.now();
      let asinMatched = false;
      let firstPoll = true;
      while (Date.now() - t0 < budgetMs) {
        if (!firstPoll) await _sleep(400);
        firstPoll = false;
        let doc;
        try { doc = fr.contentDocument; } catch (_) { continue; }
        if (!doc || !doc.body) continue;
        const cur = doc.querySelector('input#ASIN, input#asin')?.value || '';
        if (cur.toUpperCase() !== asin.toUpperCase()) continue;
        asinMatched = true;
        const bb = _getBuyboxFromDom(asin, doc);
        if (bb && bb.priceAmount > 0) {
          const avail = _checkStock(doc);
          return {
            price: bb.priceAmount,
            currency: _resolveCurrency(bb.currencySymbol || '$'),
            quantity: avail ? (_getQuantityFromDom(doc) || 1) : 0,
          };
        }
        // Right page, price not hydrated yet — keep polling within budget.
      }
      // Right page but no offer surfaced (e.g. "Currently unavailable").
      if (asinMatched) return { price: null, currency: null, quantity: 0, unavailable: true };
    } catch (_) {
      /* fall through — caller keeps fallback pricing */
    } finally {
      try { if (fr) fr.remove(); } catch (_) {}
    }
    return null;
  }

  // Fetch tier: Amazon server-renders each variant page's own buybox
  // (.twister-plus-buying-options-price-data + #corePrice…), so a plain
  // same-origin fetch + DOMParser reads the variant's real price in ~2-3s with
  // no script execution — verified live on a 91-variant listing. Much cheaper
  // than rendering a hidden iframe per variant.
  // Returns {price,currency,quantity} | {unavailable:true} | {captcha:true} | null.
  async function _fetchScrapeVariant(asin, timeoutMs) {
    if (typeof fetch !== 'function' || typeof DOMParser === 'undefined') return null;
    let timer;
    try {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (ctrl) timer = setTimeout(() => ctrl.abort(), timeoutMs || 9000);
      const resp = await fetch(`${location.origin}/dp/${encodeURIComponent(asin)}?th=1&psc=1`, {
        credentials: 'include',
        signal: ctrl ? ctrl.signal : undefined,
      });
      if (!resp || !resp.ok) return resp && (resp.status === 503 || resp.status === 429) ? { captcha: true } : null;
      const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
      if (doc.querySelector('form[action*="validateCaptcha"]')) return { captcha: true };
      const cur = doc.querySelector('input#ASIN, input#asin')?.value || '';
      if (cur.toUpperCase() !== String(asin).toUpperCase()) return null; // redirected to a sibling — not this variant's data
      const bb = _getBuyboxFromDom(asin, doc);
      if (bb && bb.priceAmount > 0) {
        const avail = _checkStock(doc);
        return {
          price: bb.priceAmount,
          currency: _resolveCurrency(bb.currencySymbol || '$'),
          quantity: avail ? (_getQuantityFromDom(doc) || 1) : 0,
        };
      }
      return { price: null, currency: null, quantity: 0, unavailable: true };
    } catch (_) {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // Data-first per-variant prices with ZERO clicking: inline-twister swatches
  // carry data-asin and (on many pages) render that variant's own price right
  // on the swatch. Harvest ASIN → price for every such element.
  function _harvestDomVariantPrices() {
    const map = {};
    try {
      const els = document.querySelectorAll('li[data-asin], [data-csa-c-item-id][data-asin], [data-defaultasin]');
      els.forEach(el => {
        const asin = (el.getAttribute('data-asin') || el.getAttribute('data-defaultasin') || '').trim().toUpperCase();
        if (!asin || map[asin]) return;
        const priceEl = el.querySelector('.a-price .a-offscreen, .a-price, .twisterSwatchPrice');
        const parsed = _cleanPriceText(priceEl ? priceEl.textContent || '' : '');
        if (parsed && parsed.price > 0) {
          map[asin] = { price: parsed.price, symbol: parsed.symbol || '$' };
        }
      });
    } catch (_) {}
    return map;
  }

  // Amazon swaps the buybox via AJAX after a twister click — the hidden ASIN
  // input updates before the price nodes re-render. Wait until the buybox
  // reading is stable across consecutive polls (and, when the price actually
  // changes, differs from the pre-click signature) instead of a fixed sleep.
  async function _waitForBuyboxSettle(prevSig, maxMs) {
    maxMs = maxMs || 1500;
    const priceRoot = document.querySelector(
      '#corePrice_feature_div, #corePriceDisplay_desktop_feature_div, #apex_desktop, #ppd'
    ) || document.body;
    let mutated = false;
    const mo = new MutationObserver(() => { mutated = true; });
    try {
      mo.observe(priceRoot, { subtree: true, childList: true, characterData: true });
    } catch (_) {}
    const start = Date.now();
    let last = _buyboxSignature();
    let stable = 0;
    while (Date.now() - start < maxMs) {
      await _sleep(75);
      const sig = _buyboxSignature();
      if (sig === last && sig !== '') {
        stable++;
        // Settled: price moved off the pre-click value, or the DOM re-rendered
        // and re-stabilized. Extra patience covers siblings priced identically.
        if (stable >= 2 && (sig !== prevSig || mutated)) break;
        if (stable >= 5) break;
      } else {
        stable = 0;
        last = sig;
      }
    }
    mo.disconnect();
  }

  async function _selectVariant(tw, asin, varContainers, o, s) {
    const dimIndices = tw.asinToDimensionIndexMap[asin];
    if (!dimIndices) return;
    for (let h = 0; h < dimIndices.length; h++) {
      try {
        const remappedDimKey = s[h];
        const D = remappedDimKey ? tw.dimensions.findIndex(d => d === remappedDimKey) : -1;
        if (D < 0 && o[h] === undefined) continue;
        const optIdx = dimIndices[D >= 0 ? D : h];
        const optionsForDim = o[h];
        if (!optionsForDim) continue;
        const optEntry = optionsForDim[optIdx];
        if (!optEntry) continue;
        const container = varContainers[h];

        if (typeof optEntry === 'string') {
          const hasDropdown = container && container.querySelectorAll('option').length > 0;
          if (hasDropdown) {
            let optEl = document.querySelector(optEntry);
            let guard = 0;
            while (!optEl && guard++ < 40) {
              const dropBtn = container && container.querySelector('span[data-action="a-dropdown-button"]');
              if (dropBtn) dropBtn.click();
              await _sleep(50);
              optEl = document.querySelector(optEntry);
            }
            if (optEl) optEl.click();
          }
        } else {
          const el = optEntry;
          const btn = el.querySelector('button');
          if (btn) btn.click();
          else {
            const inp = el.querySelector('input');
            if (inp) inp.click();
            else el.querySelector('a')?.click();
          }
        }
        await _sleep(50);
      } catch (_) { /* ignore click failure */ }
    }
  }

  async function _clickAndScrapeVariant(tw, asin, varContainers, o, s) {
    const alreadySelected =
      (document.querySelector('input#ASIN, input#asin')?.value || '').toUpperCase() === asin.toUpperCase();
    if (alreadySelected) {
      // Currently displayed variant — the buybox is already correct; no click,
      // no settle-wait, zero risk of disturbing the page state.
      return _getBuyboxAndQtyFromDom(asin);
    }

    const prevSig = _buyboxSignature();
    await _selectVariant(tw, asin, varContainers, o, s);
    let matched = false;
    let retries = 0;
    const maxRetries = 10; // Wait up to 1s
    while (retries++ < maxRetries) {
      const currentAsin = document.querySelector('input#ASIN, input#asin')?.value;
      if (currentAsin && currentAsin.toUpperCase() === asin.toUpperCase()) {
        matched = true;
        break;
      }
      await _sleep(100);
    }
    if (matched) {
      await _waitForBuyboxSettle(prevSig);
      return _getBuyboxAndQtyFromDom(asin);
    }

    console.warn(`[SS ScraperV2] ASIN mismatch after click. Target: ${asin}, Found: ${document.querySelector('input#ASIN, input#asin')?.value}`);
    // The page never switched to the target variant — the visible buybox still
    // belongs to a DIFFERENT variant. Stamping it here is exactly the
    // parent-price-on-every-variant bug. Only a per-ASIN entry in the
    // twister-plus price JSON is trustworthy at this point; otherwise report
    // no price so the caller leaves the variant unenriched (base-price
    // fallback semantics, honestly labeled).
    try {
      const el = document.querySelector('.twister-plus-buying-options-price-data');
      if (el && el.textContent) {
        const p = JSON.parse(el.textContent);
        const g = p && p.desktop_buybox_group_1;
        const hit = Array.isArray(g)
          ? g.find(e => e && e.asin && e.asin.toUpperCase() === asin.toUpperCase())
          : null;
        if (hit && hit.priceAmount > 0) {
          return {
            price: hit.priceAmount,
            currency: _resolveCurrency(hit.currencySymbol || '$'),
            quantity: _checkStock() ? (_getQuantityFromDom() || 1) : 0,
          };
        }
      }
    } catch (_) {}
    return { price: null, currency: null, quantity: 0 };
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  async function scrapeProductWithVariants(options) {
    options = options || {};
    const minQty = options.minQty || 0;
    const allowLowQty = options.allowLowQty || false;

    _captchaGuard();

    const texts = _scriptsText();
    const base = _baseFields();
    const specs = _collectSpecsDom();

    // Twister fields — independent extraction
    const twisterText = _findScript(texts, 'twister-js-init-dpx-data') || _findScript(texts, 'dimensionToAsinMap');
    const tw = twisterText ? _parseTwisterFields(twisterText) : {};
    const parentAsin = tw.parentAsin || base.currentAsin;

    // colorImages map: union of all colorImages maps in all script blocks (including ATF and BTF)
    let colorImagesMap = {};
    try {
      for (const t of texts) {
        if (t.includes('colorImages')) {
          const cleanText = t.includes('jQuery.parseJSON') ? t.replace(/\\'/g, "'") : t;
          const parsed = _extractColorImages(cleanText);
          if (parsed && Object.keys(parsed).length > 0) {
            for (const [k, val] of Object.entries(parsed)) {
              if (k === 'initial' && colorImagesMap[k]) continue;
              if (!colorImagesMap[k] || val.length > colorImagesMap[k].length) {
                colorImagesMap[k] = val;
              }
            }
          }
        }
      }
    } catch (_) {}

    const images = _collectImages(texts, colorImagesMap);
    const inStock = _checkStock();

    const hasTwister = tw.dimensionValuesDisplayData &&
      Object.keys(tw.dimensionValuesDisplayData).length > 1 &&
      Array.isArray(tw.dimensions) && tw.dimensions.length > 0;

    const bb = _getBuyboxFromDom();
    const basePrice    = bb ? bb.priceAmount : 0;
    const baseCurrency = bb ? _resolveCurrency(bb.currencySymbol || '$') : 'USD';

    let variants;
    let variantScanBlocked = false;
    if (!hasTwister) {
      // Single product — v1 threw "Cannot find buybox" here; v2 degrades.
      variants = [{
        attrs: {},
        price: bb ? basePrice : null,
        priceVerified: !!bb,
        currency: baseCurrency,
        quantity: _getQuantityFromDom() || 0,
        imgProp: undefined,
        img: undefined,
      }];
    } else {
      // 1) Enumerate every available variant from data FIRST.
      variants = Object.keys(tw.dimensionValuesDisplayData).map(asin => {
        const attrs = _attrsForAsin(tw, asin);
        const { img, images: variantImages, imgProp } = _imageForVariant(tw, attrs, colorImagesMap);
        return {
          attrs,
          // NEVER a placeholder: a variant has a price only once one of the
          // tiers below read THAT variant's own price. Unverified variants
          // stay price:null and are excluded from pricing + upload.
          price: null,
          priceVerified: false,
          currency: baseCurrency,
          quantity: 0,                 // refined by enrichment below
          img,
          images: variantImages || [],
          imgProp,
          supplierVariantId: asin,
          _enriched: false,
        };
      });

      // 1.5) Swatch tier: prices printed on the twister swatches themselves
      // (data-asin elements). No clicks, no races — seeds real per-variant
      // prices even when the click tier below can't switch the page.
      const domPriceMap = _harvestDomVariantPrices();
      variants.forEach(v => {
        const hit = domPriceMap[(v.supplierVariantId || '').toUpperCase()];
        if (hit) {
          v.price = hit.price;
          v.priceVerified = true;
          v.currency = _resolveCurrency(hit.symbol);
          v._priceFromDom = true;
        }
      });

      // 1.6) The currently displayed variant is priced straight from the live
      // DOM — its buybox is already correct, no click or iframe needed.
      const curAsin = (document.querySelector('input#ASIN, input#asin')?.value || '').toUpperCase();
      variants.forEach(v => {
        if (!v._enriched && (v.supplierVariantId || '').toUpperCase() === curAsin) {
          const d = _getBuyboxAndQtyFromDom(v.supplierVariantId);
          if (d.price != null) {
            v.price = d.price;
            v.priceVerified = true;
            if (d.currency) v.currency = d.currency;
            v.quantity = d.quantity;
            v._enriched = true;
          }
        }
      });

      // 2) Click tier — ONLY on classic AJAX-twister pages (div[id*="variation_"]).
      // On inline-twister pages a swatch click NAVIGATES to the sibling's /dp/
      // page, destroying this content script mid-scan (observed live) — those
      // pages are handled by the iframe tier below instead.
      const varContainers = Array.from(document.querySelectorAll('div[id*="variation_"]'));
      if (varContainers.length === 0) {
        console.log('[SS ScraperV2] no classic twister containers — skipping click tier (inline twister navigates); iframe tier will price variants');
      } else {
        try {
          const originalAsin = base.currentAsin;
          const o = [];
          const s = {};
          varContainers.forEach((container, l) => {
            const selectOpts = Array.from(container.querySelectorAll('option'))
              .filter(opt => !(opt.getAttribute('data-a-id') || '').includes('-1'))
              .map(opt => '#' + opt.getAttribute('data-a-id'));
            const liEls = Array.from(container.querySelectorAll('li'));
            o[l] = [...selectOpts, ...liEls];
          });
          document.querySelectorAll('div[id*="inline-twister-expander-content"]').forEach((el, l) => {
            if (!o[l]) {
              o[l] = Array.from(el.querySelectorAll('li'));
              const suffix = el.id.replace('inline-twister-expander-content-', '');
              if (suffix) s[l] = suffix;
            }
          });

          for (const v of variants) {
            if (v._enriched) continue;
            try {
              const enr = await _clickAndScrapeVariant(tw, v.supplierVariantId, varContainers, o, s);
              if (enr.price != null) {
                v.price = enr.price;
                v.priceVerified = true;
                v._enriched = true;
              }
              if (enr.currency) v.currency = enr.currency;
              v.quantity = enr.quantity;
            } catch (err) {
              console.warn(`[SS ScraperV2] failed to scrape variant ${v.supplierVariantId}:`, err);
            }
          }

          // Click back to the original ASIN so the user's page stays on their selection
          if (originalAsin) {
            try {
              await _selectVariant(tw, originalAsin, varContainers, o, s);
            } catch (_) {}
          }
        } catch (e) {
          console.warn('[SS ScraperV2] click tier failed (iframe tier will retry):', e?.message || e);
        }
      }

      // 3) Iframe tier: render each still-unverified variant's own /dp/ page in
      // a hidden same-origin iframe and read its hydrated buybox. EVERY pending
      // variant is attempted (the old cap of 24 left the rest on a guessed
      // price); a small worker pool plus a total time budget bound the scan.
      const IFRAME_CONCURRENCY = 2;
      const FETCH_CONCURRENCY = 3;
      const totalBudgetMs = options.variantBudgetMs || 90000; // ~90 variants at 3 parallel fetches (measured live)
      const perVariantMs = options.variantTimeoutMs || 9000;
      const scanStart = Date.now();

      // 2.5) Fetch tier — first choice for everything the click tier left.
      // A CAPTCHA/throttle response stops ALL further variant requests: more
      // requests only deepen the block, and the rest stay unverified.
      try {
        const pendingFetch = variants.filter(v => !v._enriched && !v._unavailable && v.supplierVariantId);
        let fc = 0;
        const fetchWorker = async () => {
          while (fc < pendingFetch.length && !variantScanBlocked) {
            const v = pendingFetch[fc++];
            const left = totalBudgetMs - (Date.now() - scanStart);
            if (left <= 0) return;
            const enr = await _fetchScrapeVariant(v.supplierVariantId, Math.min(perVariantMs, left));
            if (!enr) continue;
            if (enr.captcha) { variantScanBlocked = true; return; }
            if (enr.price != null) {
              v.price = enr.price;
              v.priceVerified = true;
              if (enr.currency) v.currency = enr.currency;
              v.quantity = enr.quantity;
              v._enriched = true;
              v._viaIframe = true; // counted with the page-verified group
            } else if (enr.unavailable) {
              v.quantity = 0;
              v._unavailable = true;
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, pendingFetch.length) }, fetchWorker));
      } catch (e) {
        console.warn('[SS ScraperV2] fetch tier failed (iframe tier will retry):', e?.message || e);
      }

      try {
        const pending = variantScanBlocked ? [] : variants.filter(v => !v._enriched && !v._unavailable && v.supplierVariantId);
        const tierStart = scanStart;
        let cursor = 0;
        const worker = async () => {
          while (cursor < pending.length) {
            const v = pending[cursor++];
            const left = totalBudgetMs - (Date.now() - tierStart);
            if (left <= 0) return;
            const enr = await _iframeScrapeVariant(v.supplierVariantId, Math.min(perVariantMs, left));
            if (enr && enr.price != null) {
              v.price = enr.price;
              v.priceVerified = true;
              if (enr.currency) v.currency = enr.currency;
              v.quantity = enr.quantity;
              v._enriched = true;
              v._viaIframe = true;
            } else if (enr && enr.unavailable) {
              v.quantity = 0;
              v._unavailable = true;
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(IFRAME_CONCURRENCY, pending.length) }, worker));
      } catch (e) {
        console.warn('[SS ScraperV2] iframe tier failed (remaining variants stay unverified):', e?.message || e);
      }

      // Swatch-priced variants carry their own printed price -> sellable, qty 1.
      // Variants no tier reached stay price:null / priceVerified:false — they
      // are reported, never priced from the parent.
      let nClick = 0, nIframe = 0, nSwatch = 0, nUnverified = 0;
      variants.forEach(v => {
        if (v._viaIframe) nIframe++;
        else if (v._enriched) nClick++;
        else if (v._priceFromDom) nSwatch++;
        else nUnverified++;
        if (!v._enriched && v._priceFromDom && !v._unavailable) v.quantity = 1;
        if (!v.priceVerified) { v.price = null; v.quantity = 0; }
        delete v._enriched;
        delete v._priceFromDom;
        delete v._viaIframe;
        delete v._unavailable;
      });
      console.log(`[SS ScraperV2] variant pricing: ${variants.length} total — ${nClick} click/live-verified, ${nIframe} iframe-verified, ${nSwatch} swatch-priced, ${nUnverified} UNVERIFIED (excluded from listing)`);

      if (!variants.some(v => v.priceVerified)) {
        throw new Error('Could not read a price for any variation — reload the Amazon page and scan again');
      }

      // minQty filter — error messages preserved verbatim from v1 (panel UX).
      // Unverified variants are kept (so the panel can report them) but never
      // count toward "is anything sellable".
      const qualified = variants.filter(v => !v.priceVerified || (v.quantity || 0) >= minQty);
      if (!qualified.some(v => v.priceVerified)) {
        if (variants.length > 0) {
          if (!allowLowQty) throw new Error('This product is low on quantity');
        } else {
          throw new Error('Zero variations found');
        }
      } else {
        variants = qualified;
      }
    }

    const verified = variants.filter(v => v.priceVerified);
    // The parent price is the variant the user is LOOKING AT (its buybox is
    // what they saw); only fall back to another verified variant when the
    // current one has no readable price.
    const curId = String(base.currentAsin || '').toUpperCase();
    const current = verified.find(v => String(v.supplierVariantId || '').toUpperCase() === curId);
    const selected = current || verified.find(v => v.quantity > 0) || verified[0] || variants[0];
    if (base.brand && !specs.Brand) specs.Brand = base.brand;

    return {
      asin: base.currentAsin,
      parentAsin,
      title: base.title,
      brand: base.brand,
      price: selected && selected.price != null ? selected.price : 0,
      currency: selected ? (selected.currency.length === 3 ? selected.currency : _resolveCurrency(selected.currency)) : baseCurrency,
      quantity: selected ? selected.quantity : 0,
      shippingCost: base.shippingCost,
      unverifiedVariantCount: variants.length - verified.length,
      variantScanBlocked,
      marketplace: 'amazon',
      url: window.location.href,
      images,
      bulletPoints: base.bulletPoints,
      description: base.description,
      category: base.category,
      condition: base.condition,
      shippingInfo: base.shippingInfo,
      rating: base.rating,
      reviewCount: base.reviewCount,
      specs,
      inStock,
      variants,
      hasVariants: variants.length > 1,
      scrapedAt: Date.now(),
    };
  }

  async function scrapeSingleProduct() {
    _captchaGuard();

    const texts = _scriptsText();
    const base = _baseFields();
    const specs = _collectSpecsDom();

    const twisterText = _findScript(texts, 'twister-js-init-dpx-data') || _findScript(texts, 'dimensionToAsinMap');
    const tw = twisterText ? _parseTwisterFields(twisterText) : {};
    const parentAsin = tw.parentAsin || base.currentAsin;

    // ATF block only — currently displayed variant's image set
    let images = [];
    try {
      const atf = _findScript(texts, 'ImageBlockATF');
      if (atf) {
        const ci = _extractColorImages(atf);
        const initial = ci.initial || ci[Object.keys(ci)[0]] || [];
        const seen = new Set();
        initial.forEach(img => {
          const u = _stripSizeModifier(img.hiRes || img.large || img.thumb);
          if (u && !seen.has(u)) { seen.add(u); images.push(u); }
        });
      }
    } catch (_) {}
    if (images.length === 0) images = _collectImages([], {});

    // Attributes of the currently selected variant
    let attrs = {};
    try {
      if (tw.asinToDimensionIndexMap && base.currentAsin && tw.asinToDimensionIndexMap[base.currentAsin]) {
        attrs = _attrsForAsin(tw, base.currentAsin);
      }
    } catch (_) {}
    if (Object.keys(attrs).length === 0) {
      try {
        const selColor = document.querySelector('#variation_color_name .selection, #variation_color_name .a-color-base')?.textContent?.trim();
        const selSize  = document.querySelector('#variation_size_name .selection, #variation_size_name .a-color-base')?.textContent?.trim();
        if (selColor) attrs['Color'] = { productName: selColor };
        if (selSize)  attrs['Size']  = { productName: selSize };
      } catch (_) {}
    }

    const bb = _getBuyboxFromDom();
    const price    = bb ? bb.priceAmount : 0;
    const currency = bb ? _resolveCurrency(bb.currencySymbol || '$') : 'USD';
    const quantity = _getQuantityFromDom() || 0;

    if (base.brand && !specs.Brand) specs.Brand = base.brand;
    const selectedVariant = {
      attrs, price: bb ? price : null, priceVerified: !!bb, currency, quantity,
      img: images[0] || null,
      imgProp: undefined,
      supplierVariantId: base.currentAsin,
    };

    return {
      asin: base.currentAsin,
      parentAsin,
      title: base.title,
      brand: base.brand,
      price,
      currency,
      quantity,
      shippingCost: base.shippingCost,
      unverifiedVariantCount: bb ? 0 : 1,
      marketplace: 'amazon',
      url: window.location.href,
      images,
      bulletPoints: base.bulletPoints,
      description: base.description,
      category: base.category,
      condition: base.condition,
      shippingInfo: base.shippingInfo,
      rating: base.rating,
      reviewCount: base.reviewCount,
      specs,
      inStock: _checkStock(),
      variants: [selectedVariant],
      hasVariants: false,
      isSingleMode: true,
      scrapedAt: Date.now(),
    };
  }

  window.SsAmazonScraperV2 = { scrapeProductWithVariants, scrapeSingleProduct };

  // Test-only surface — pure helpers plus the DOM-reading enrichment pieces
  // (exercised in node:test against a stubbed document).
  window.SsAmazonScraperV2._internals = {
    _extractBalanced,
    _extractKeyedValue,
    _parseFragment,
    _stripSizeModifier,
    _extractColorImages,
    _cleanSpecPair,
    _parseTwisterFields,
    _cleanPriceText,
    _normalizeBrandText,
    _getBuyboxFromDom,
    _clickAndScrapeVariant,
    _harvestDomVariantPrices,
    _iframeScrapeVariant,
    _isNonPayablePrice,
    _currencyForHost,
    _resolveCurrency,
    _parseShippingCost,
    _imageForVariant,
    _baseFields,
    _detectCondition,
  };
})();

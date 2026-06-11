/**
 * amazon-variant-scraper.js — isolated world content script.
 * Algorithm matches SuperDS amazon.ts getVariations() exactly.
 */
(function () {
  'use strict';

  // ─── JSON repair (matches SuperDS F + R functions) ────────────────────────────

  function _fixQuotes(raw) {
    let out = '', inStr = false, prevBackslash = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '\\') { out += ch; prevBackslash = !prevBackslash; continue; }
      if (ch === '"' && !prevBackslash) {
        if (!inStr) { inStr = true; out += ch; }
        else {
          let j = i + 1;
          while (j < raw.length && /\s/.test(raw[j])) j++;
          const next = raw[j];
          let closes = next === undefined || next === ',' || next === ']' || next === '}';
          if (!closes && next === ':') {
            let k = j + 1;
            while (k < raw.length && /\s/.test(raw[k])) k++;
            const ac = raw[k];
            closes = ac === '"' || ac === '{' || ac === '[' || ac === 't' || ac === 'f' ||
              ac === 'n' || ac === '-' || ac === undefined || (ac >= '0' && ac <= '9');
          }
          if (closes) { inStr = false; out += ch; } else { out += '\\"'; }
        }
        prevBackslash = false; continue;
      }
      out += ch; prevBackslash = false;
    }
    return out;
  }

  function _isUnescaped(s, p) {
    if (s[p] !== '"') return false;
    let n = 0, i = p - 1;
    while (i >= 0 && s[i] === '\\') { n++; i--; }
    return n % 2 === 0;
  }

  function _robustParse(raw, maxTries = 30) {
    let s = raw, lastPos = -1;
    for (let attempt = 0; attempt < maxTries; attempt++) {
      try { return JSON.parse(s); } catch (e) {
        const m = e.message && e.message.match(/position (\d+)/);
        if (!m) throw e;
        const pos = parseInt(m[1]);
        if (pos === lastPos) throw e;
        lastPos = pos;
        let p = pos - 1;
        while (p >= 0 && !_isUnescaped(s, p)) p--;
        if (p < 0) throw e;
        s = s.substring(0, p) + '\\"' + s.substring(p + 1);
      }
    }
    throw new Error('Could not repair JSON');
  }

  function _removeKey(json, key) {
    const re = new RegExp(`\\s*"${key}"\\s*:\\s*[^,}]+(?:,|\\s*)?`, 'g');
    return json.replace(re, '').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  }

  function _balanceBraces(s) {
    let open = 0, close = 0;
    for (const c of s) { if (c === '{') open++; if (c === '}') close++; }
    if (open > close) s += '}'.repeat(open - close);
    return s;
  }

  /** Full pre-parse cleanup — matches SuperDS normalization pipeline exactly. */
  function _prepareJson(raw) {
    let s = raw;
    s = s.replace(/\/\/\/\/\/[\s\S]*?\/\/\/\/\//g, '');
    s = s.replaceAll('"', "'").replaceAll("'", '"');
    s = s.replace(/,\s*\/\s*/g, ',');
    s = s.replace(/A\.\$\.(?:parseJSON|parse)\([\s\S]*?\)/g, '""');
    s = s.replaceAll('Date.now()', '0');
    s = s.replaceAll('Raw Data', '"Raw Data"');
    s = s.replace(/\r?\n/g, '');
    s = _removeKey(s, 'ajaxUrlParams');
    s = s.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
    s = _removeKey(s, 'ajaxUrlParams'); // second pass after trailing comma cleanup
    s = _fixQuotes(s);
    s = s.trim();
    s = s.replace(/\/\/\/\/\/[\s\S]*?\/\/\/\/\//g, '');
    s = s.replace(/(['"])?([a-zA-Z0-9_]+)\1\s*:/g, '"$2":');
    s = s.replace(/"{2}https":\/\//g, '"https://');
    s = s.replace(/"{2}(\d{2})":(\d{2})"/g, '"$1:$2"');
    s = s.replace(/""([^"]+_[^"]+)"/g, '"$1');
    s = s.replace('"Your current selection "is": "', '""');
    s = s.replace(/\("([^"]+)":/g, '($1:');
    s = _balanceBraces(s);
    return s;
  }

  function _parseWindowJson(raw) {
    return _robustParse(_prepareJson(raw));
  }

  // ─── Window script data ────────────────────────────────────────────────────────

  /**
   * SuperDS getWindowScriptData() — finds 4 blocks:
   *  id 0 → jQuery.parseJSON sig "title"           → jqueryData  (has colorImages, visualDimensions)
   *  id 1 → dataToReturn sig "twister-js-init-dpx" → variationData
   *  id 2 → jQuery.parseJSON sig "ImageBlockBTF"   → btfData (secondary colorImages)
   *  id 3 → P.when ImageBlockATF                   → imageData (colorImages.initial hiRes)
   */
  function getWindowScriptData() {
    const PATTERNS = [
      { sig: 'title',                    re: /jQuery\.parseJSON\(\s*(['"])((?:\\.|(?!\1).)*?)\1\s*\)/ },
      { sig: 'twister-js-init-dpx-data', re: /dataToReturn\s*=\s*(\{[\s\S]*?\});/ },
      { sig: 'ImageBlockBTF',            re: /jQuery\.parseJSON\(\s*(['"])((?:\\.|(?!\1).)*?)\1\s*\)/ },
      { sig: 'ImageBlockATF',            re: /P\.when\('A'\)\.register\("ImageBlockATF",\s*function\(A\)\{\s*var data\s*=\s*(\{[\s\S]*?\});/ },
    ];

    const found = [null, null, null, null];

    document.querySelectorAll('script').forEach(script => {
      const txt = script.textContent;
      if (!txt) return;
      PATTERNS.forEach((pat, idx) => {
        if (found[idx]) return;
        if (pat.sig && !txt.includes(pat.sig)) return;
        const m = txt.match(pat.re);
        if (!m) return;
        // jQuery.parseJSON patterns capture in group 2; others in group 1
        const raw = m[2] !== undefined ? m[2] : m[1];
        if (!raw) return;
        try { found[idx] = _parseWindowJson(raw); } catch (_) {}
      });
    });

    const [jqueryData, variationData, btfData, imageData] = found;

    // variationData is needed for multi-variation; image blocks are optional.
    // Some Amazon page variants omit btfData/imageData — degrade gracefully.
    return { jqueryData: jqueryData || {}, variationData, imageData: imageData || {}, btfData: btfData || {} };
  }

  // ─── Async message helper (matches SuperDS async-message-DmoY4JtQ.js L()) ─────

  function waitForMessage(key, timeoutMs = 1500) {
    return new Promise((resolve, reject) => {
      const handler = ev => {
        const d = ev.data;
        if (d && d.for === key) {
          clearTimeout(timer);
          window.removeEventListener('message', handler);
          resolve(d.data);
        }
      };
      const timer = setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Timeout waiting for ' + key));
      }, timeoutMs);
      window.addEventListener('message', handler);
    });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ─── Buybox + quantity from DOM ────────────────────────────────────────────────

  function _cleanPriceText(str) {
    if (!str) return null;
    let decoded = str.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
                     .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
    const currencyRegex = /(\$|£|€|¥|A\$|C\$|₹|R\$)\s*(\d[\d.,\s]*\d|\d)|(\d[\d.,\s]*\d|\d)\s*(\$|£|€|¥|A\$|C\$|₹|R\$)/;
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

  function getBuyboxFromDom() {
    const el = document.querySelector('.twister-plus-buying-options-price-data');
    if (el && el.textContent) {
      try {
        const p = JSON.parse(el.textContent);
        const g = p && p.desktop_buybox_group_1;
        if (g && g.length > 0) return g[0];
      } catch (_) {}
    }
    const priceEl = document.querySelector('.priceToPay, #corePrice_feature_div .a-price, #price_inside_buybox, .apexPriceToPay, #priceblock_ourprice, #priceblock_dealprice');
    if (priceEl) {
      const sym   = (priceEl.querySelector('.a-price-symbol')?.textContent || '$').trim();
      const whole = (priceEl.querySelector('.a-price-whole')?.textContent || '').replace(/[^\d]/g, '');
      const frac  = (priceEl.querySelector('.a-price-fraction')?.textContent || '00').trim();
      let price = parseFloat(`${whole || 0}.${frac}`);
      if (!(price > 0)) {
        const rawText = priceEl.querySelector('.a-offscreen')?.textContent || priceEl.textContent || '';
        const parsed = _cleanPriceText(rawText);
        if (parsed && parsed.price > 0) {
          price = parsed.price;
          return { priceAmount: price, currencySymbol: parsed.symbol || sym };
        }
      }
      if (price > 0) return { priceAmount: price, currencySymbol: sym };
    }
    return null;
  }

  function getQuantityFromDom() {
    const sel = document.querySelector('select[name="quantity"]');
    if (!sel) return 1;
    const opts = Array.from(sel.querySelectorAll('option'));
    if (!opts.length) return 1;
    return parseInt(opts[opts.length - 1].value) || 1;
  }

  function resolveCurrency(sym) {
    return { '$': 'USD', '£': 'GBP', '€': 'EUR', '¥': 'JPY', 'A$': 'AUD', 'C$': 'CAD', '₹': 'INR', 'R$': 'BRL' }[sym] || 'USD';
  }

  // ─── Stock check ───────────────────────────────────────────────────────────────

  function checkStock() {
    const el = document.querySelector('#availability');
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
  }

  // ─── Text decode ───────────────────────────────────────────────────────────────

  function decodeText(s) {
    if (!s) return '';
    const ents = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&nbsp;': ' ' };
    let out = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    out = out.replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    out = out.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
    out = out.replace(/&(?:#(?:x[0-9a-fA-F]+|\d+)|[a-zA-Z]+);/gi, m => ents[m.toLowerCase()] ?? m);
    return out;
  }

  // ─── getVariations — two-phase, matches SuperDS exactly ───────────────────────

  async function getVariations(windowData, minQty, allowLowQty) {
    const { variationData: t, jqueryData: p } = windowData;
    minQty = minQty || 0;

    // ── Invert dimensionToAsinMap if needed ────────────────────────────────────
    if (t && !t.asinToDimensionIndexMap && t.dimensionToAsinMap) {
      t.asinToDimensionIndexMap = {};
      Object.keys(t.dimensionToAsinMap).forEach(dimKey => {
        t.asinToDimensionIndexMap[t.dimensionToAsinMap[dimKey]] = dimKey.split('_').map(Number);
      });
    }

    // ── Single-variant (no variation data or only 1 ASIN) ─────────────────────
    if (!(t && Object.keys(t.asinToDimensionIndexMap || {}).length > 1)) {
      const bb = getBuyboxFromDom();
      const qty = getQuantityFromDom() || 0;
      if (!bb) throw new Error('Cannot find buybox');
      return [{
        attrs: {},
        price: bb.priceAmount,
        currency: bb.currencySymbol,
        quantity: qty,
        imgProp: undefined,
        img: undefined
      }];
    }

    const results = [];
    const dimLabels = t.dimensions.map(d => t.variationDisplayLabels[d] || d);

    // ── Build option lists per variation container ─────────────────────────────
    // Matches SuperDS: o[l] = ["#option-data-a-id", ..., liElement, ...]
    const varContainers = Array.from(document.querySelectorAll('div[id*="variation_"]'));
    const o = [];  // option list per dim index
    const s = {};  // inline-twister dim-key remapping: containerIdx → dimensionKey

    varContainers.forEach((container, l) => {
      // Select options → ID selectors; then li elements
      const selectOpts = Array.from(container.querySelectorAll('option'))
        .filter(opt => !(opt.getAttribute('data-a-id') || '').includes('-1'))
        .map(opt => '#' + opt.getAttribute('data-a-id'));
      const liEls = Array.from(container.querySelectorAll('li'));
      o[l] = [...selectOpts, ...liEls];
    });

    // Fill missing containers from inline-twister-expander-content
    document.querySelectorAll('div[id*="inline-twister-expander-content"]').forEach((el, l) => {
      if (!o[l]) {
        o[l] = Array.from(el.querySelectorAll('li'));
        const suffix = el.id.replace('inline-twister-expander-content-', '');
        if (suffix) s[l] = suffix;
      }
    });

    // ── PHASE 1: Click each dimension option for each ASIN ────────────────────
    window.postMessage({ from: 'ss-amazon-cs', action: 'activate' });

    for (const asin in t.asinToDimensionIndexMap) {
      const dimIndices = t.asinToDimensionIndexMap[asin];  // e.g. [0, 1]

      for (let h = 0; h < dimIndices.length; h++) {
        // If this position has an inline-twister remap, look up real dim index
        const remappedDimKey = s[h];
        const D = remappedDimKey ? t.dimensions.findIndex(d => d === remappedDimKey) : -1;

        if (D < 0 && o[h] === undefined) continue;  // no options for this dim position

        const optIdx = dimIndices[D >= 0 ? D : h];
        const optionsForDim = o[h];
        if (!optionsForDim) continue;

        const optEntry = optionsForDim[optIdx];
        if (!optEntry) continue;

        const container = varContainers[h];

        if (typeof optEntry === 'string') {
          // Select/dropdown option — open dropdown then click
          const hasDropdown = container && container.querySelectorAll('option').length > 0;
          if (hasDropdown) {
            // Bounded retry — an option that never renders must not hang the
            // scrape forever (v2 fallback path runs inside user-visible flows).
            let optEl = document.querySelector(optEntry);
            let dropTries = 0;
            while (!optEl && dropTries++ < 40) {
              const dropBtn = container && container.querySelector('span[data-action="a-dropdown-button"]');
              if (dropBtn) dropBtn.click();
              await sleep(50);
              optEl = document.querySelector(optEntry);
            }
            if (optEl) optEl.click();
          }
        } else {
          // li element — click button, input, or anchor inside it
          const el = optEntry;
          const btn = el.querySelector('button');
          if (btn) {
            btn.click();
          } else {
            const inp = el.querySelector('input');
            if (inp) {
              inp.click();
            } else {
              const anchor = el.querySelector('a');
              if (anchor) anchor.click();
              // else: no clickable child — SuperDS does nothing here
            }
          }
        }

        // 50ms fired clicks faster than Amazon's Twister JS could issue the
        // matching XHR, so prices were dropped and Phase 2 fell back to $999.
        await sleep(250);
      }
    }

    // Brief pause after Phase 1 — lets residual XHR cache fill before Phase 2 reads.
    await sleep(300);

    // ── PHASE 2: Fetch price per ASIN in dimensionValuesDisplayData ──────────
    // SuperDS iterates dimensionValuesDisplayData (available variants), NOT asinToDimensionIndexMap
    const colorImages = p.colorImages || {};
    const dims = t.dimensions;
    // visualDimensions comes from jqueryData (p), NOT variationData
    const visualDimIndices = (p.visualDimensions || [])
      .map(v => dims.findIndex(d => d === v))
      .filter(i => i >= 0);

    for (const asin in t.dimensionValuesDisplayData) {
      // Wrap entire per-ASIN body — one bad ASIN must NOT stop remaining iterations.
      try {
        let price = 999, currency = 'USD', quantity = 0;

        try {
          // Register listener BEFORE sending request (matches SuperDS q() pattern)
          const msgPromise = waitForMessage(`ss-buybox-${asin}`, 3000);
          setTimeout(() => {
            window.postMessage({ from: 'ss-amazon-cs', action: 'getBuybox', asin });
          }, 50);

          const bbData = await msgPromise;
          if (bbData.quantity) {
            quantity = bbData.quantity;
          } else {
            quantity = 1;
          }

          const parsed = JSON.parse(bbData.buyboxRaw);
          const group = parsed.desktop_buybox_group_1[0];
          if (!group) { quantity = 0; }
          else {
            if (group.priceAmount) price = group.priceAmount;
            if (group.currencySymbol) currency = resolveCurrency(group.currencySymbol);
          }
        } catch (_) {}

        // Build attrs: { "Color": { productName: "Red" }, "Size": { productName: "Large" } }
        const displayData = t.dimensionValuesDisplayData[asin];
        const attrs = {};
        if (Array.isArray(displayData)) {
          displayData.forEach((val, i) => {
            if (dimLabels[i]) attrs[dimLabels[i]] = { productName: val };
          });
        }

        // Build color key for image lookup — same as SuperDS
        let colorKey = '';
        visualDimIndices.forEach(vi => {
          const label = dimLabels[vi];
          const attrVal = label && attrs[label];
          if (attrVal) colorKey += attrVal.productName + ' ';
        });
        colorKey = colorKey.trimEnd().replaceAll('/', '\\/');

        let img, imgProp;
        // Case-insensitive colorImages lookup — Amazon keys vary in casing (e.g. "BLACK" vs "Black")
        const colorImagesLower = Object.fromEntries(
          Object.entries(colorImages).map(([k, v]) => [k.toLowerCase(), v])
        );
        const ciKey = colorImagesLower[colorKey.toLowerCase()]
          ? colorKey.toLowerCase()
          : Object.keys(colorImagesLower).find(k =>
              k.startsWith(colorKey.split(' ')[0].toLowerCase()) ||
              colorKey.toLowerCase().startsWith(k.split(' ')[0])
            );
        if (ciKey && colorImagesLower[ciKey]) {
          const ci = colorImagesLower[ciKey][0];
          img = ci && (ci.hiRes || ci.large || ci.thumb || null);
          imgProp = dimLabels[visualDimIndices[visualDimIndices.length - 1]];
        }

        if (!img) console.warn('[SS Scraper] No img for ASIN', asin, 'colorKey:', colorKey, 'available keys:', Object.keys(colorImages).slice(0, 5));
        results.push({ attrs, price, currency, quantity, img, imgProp, supplierVariantId: asin });
      } catch (asinErr) {
        console.warn('[SS Scraper] Skipped ASIN', asin, ':', asinErr.message);
      }
    }

    window.postMessage({ from: 'ss-amazon-cs', action: 'deactivate' });

    // Filter by minQty (SuperDS: only include variants where quantity >= minQty)
    const qualified = results.filter(v => (v.quantity || 0) >= minQty);
    if (qualified.length === 0) {
      if (results.length > 0) {
        if (allowLowQty) return results;
        throw new Error('This product is low on quantity');
      }
      throw new Error('Zero variations found');
    }
    return qualified;
  }

  // ─── Images ───────────────────────────────────────────────────────────────────

  function getImages(windowData) {
    const { imageData, jqueryData: p } = windowData;
    const seen = new Set();
    const images = [];

    function push(url) { if (url && !seen.has(url)) { seen.add(url); images.push(url); } }

    // Primary: imageData.colorImages.initial hiRes
    const ci = imageData && imageData.colorImages;
    if (ci && Array.isArray(ci.initial)) {
      ci.initial.filter(img => img.hiRes).forEach(img => push(img.hiRes));
    }

    // Secondary: jqueryData.colorImages per-color first entry
    if (p && p.colorImages) {
      Object.keys(p.colorImages).forEach(key => {
        const arr = p.colorImages[key];
        if (Array.isArray(arr) && arr[0] && arr[0].hiRes) push(arr[0].hiRes);
      });
    }

    // Fallback: DOM
    if (images.length === 0) {
      document.querySelectorAll('#altImages li img, #imageBlock img').forEach(img => {
        let src = img.getAttribute('data-old-hires') || img.src || '';
        if (!src || src.includes('transparent-pixel') || src.includes('base64')) return;
        push(src.replace(/\._[A-Z0-9,_]+_\./g, '.'));
      });
      const landing = document.querySelector('#landingImage, #imgBlkFront');
      if (landing) {
        const src = landing.getAttribute('data-old-hires') || landing.src || '';
        if (src && !seen.has(src)) images.unshift(src);
      }
    }

    return images;
  }

  // ─── Images (single-mode) ─────────────────────────────────────────────────────
  // Uses ONLY imageData.colorImages.initial (ATF block = currently displayed variant).
  // Never reads jqueryData.colorImages — that contains all color variants.

  function getImagesSingle(windowData) {
    const { imageData } = windowData;
    const seen = new Set();
    const images = [];

    function push(url) { if (url && !seen.has(url)) { seen.add(url); images.push(url); } }

    // ATF block only — this is the current selected variant's image set
    const ci = imageData && imageData.colorImages;
    if (ci && Array.isArray(ci.initial)) {
      ci.initial.filter(img => img.hiRes).forEach(img => push(img.hiRes));
      // Also collect large/thumb fallbacks for initial set
      if (images.length === 0) {
        ci.initial.forEach(img => push(img.large || img.thumb || null));
      }
    }

    // DOM fallback (current page images only — already reflects selected variant)
    if (images.length === 0) {
      document.querySelectorAll('#altImages li img, #imageBlock img').forEach(img => {
        let src = img.getAttribute('data-old-hires') || img.src || '';
        if (!src || src.includes('transparent-pixel') || src.includes('base64')) return;
        push(src.replace(/\._[A-Z0-9,_]+_\./g, '.'));
      });
      const landing = document.querySelector('#landingImage, #imgBlkFront');
      if (landing) {
        const src = landing.getAttribute('data-old-hires') || landing.src || '';
        if (src && !seen.has(src)) images.unshift(src);
      }
    }

    return images;
  }

  // ─── Single-product scrape (no multi-ASIN loop) ───────────────────────────────
  // Scrapes only the currently selected variant. Images = ATF block (current selection).

  async function scrapeSingleProduct() {
    if (
      document.querySelector('form[action*="validateCaptcha"]') ||
      (document.body && document.body.innerText.includes('Type the characters you see in this image'))
    ) throw new Error('Amazon CAPTCHA detected — please solve it and try again');

    const windowData = getWindowScriptData();
    const { variationData, jqueryData } = windowData;

    const currentAsin = document.querySelector('input#ASIN, input#asin')?.value ||
      window.location.pathname.match(/\/(?:dp|gp\/aw\/d)\/([A-Z0-9]{10})/)?.[1] || '';

    const parentAsin = (variationData && (variationData.parentAsin || currentAsin)) ||
      (jqueryData && jqueryData.parentAsin) || currentAsin;

    const titleRaw = (jqueryData && jqueryData.title) ||
      (variationData && variationData.title) ||
      document.querySelector('#productTitle')?.textContent.trim() || '';
    const title = decodeText(titleRaw.trim());

    const brandEl = document.querySelector('#bylineInfo');
    const brand = brandEl ? decodeText(brandEl.textContent.trim().replace(/^(Brand:|Visit the|Store)/i, '').trim()) : '';

    const bulletPoints = Array.from(
      document.querySelectorAll('#feature-bullets li span.a-list-item')
    ).map(el => el.textContent.trim()).filter(t => t.length > 5);

    const descEl = document.querySelector('#productDescription');
    const description = descEl ? descEl.textContent.trim().replace(/\s+/g, ' ') : '';

    const category = Array.from(
      document.querySelectorAll('#wayfinding-breadcrumbs_container li a, .a-breadcrumb a')
    ).map(el => el.textContent.trim()).filter(Boolean).join(' > ');

    // ── Images: ATF block only ─────────────────────────────────────────────────
    const images = getImagesSingle(windowData);

    // ── Attributes for current ASIN ────────────────────────────────────────────
    let attrs = {};
    if (variationData && variationData.asinToDimensionIndexMap && currentAsin) {
      const dimIndices = variationData.asinToDimensionIndexMap[currentAsin];
      if (dimIndices) {
        variationData.dimensions.forEach((dim, i) => {
          const idx = dimIndices[i];
          const label = variationData.variationDisplayLabels[dim] || dim;
          const valMap = variationData.variationValues && variationData.variationValues[dim];
          const valArr = variationData.dimensionValuesData && variationData.dimensionValuesData[dim];
          let raw = valArr ? valArr[idx] : (valMap ? Object.keys(valMap)[idx] : null);
          if (raw) attrs[label] = { productName: decodeText(String(raw)) };
        });
      }
    }
    // Fallback: read DOM swatch selection
    if (Object.keys(attrs).length === 0) {
      const selColor = document.querySelector('#variation_color_name .selection, #variation_color_name .a-color-base')?.textContent?.trim();
      const selSize  = document.querySelector('#variation_size_name .selection, #variation_size_name .a-color-base')?.textContent?.trim();
      if (selColor) attrs['Color'] = { productName: selColor };
      if (selSize)  attrs['Size']  = { productName: selSize };
    }

    // ── Price ──────────────────────────────────────────────────────────────────
    const bb = getBuyboxFromDom();
    const price    = bb ? bb.priceAmount    : 0;
    const currency = bb ? resolveCurrency(bb.currencySymbol || '$') : 'USD';
    const quantity = getQuantityFromDom() || 0;
    const inStock  = checkStock();

    const specs = {};
    document.querySelectorAll(
      '#productOverview_feature_div tr, #productDetails_expanderTables_depthLeftSections tr, #productDetails_techSpec_section_1 tr'
    ).forEach(row => {
      const key = row.querySelector('th, .a-col-left')?.textContent.trim();
      const val = row.querySelector('td, .a-col-right')?.textContent.trim();
      if (key && val && !['Customer Reviews', 'Best Sellers Rank'].includes(key)) specs[key] = val;
    });

    const selectedVariant = { attrs, price, currency, quantity, img: images[0] || null, imgProp: undefined, supplierVariantId: currentAsin };

    // ── Guard logs ─────────────────────────────────────────────────────────────
    console.log('[SS Single] mode: single');
    console.log('[SS Single] currentAsin:', currentAsin);
    console.log('[SS Single] attrs:', attrs);
    console.log('[SS Single] imageCount:', images.length);
    console.log('[SS Single] images[0]:', images[0] || null);

    return {
      asin: currentAsin,
      parentAsin,
      title,
      brand,
      price,
      currency,
      quantity,
      marketplace: 'amazon',
      url: window.location.href,
      images,
      bulletPoints,
      description,
      category,
      specs,
      inStock,
      variants: [selectedVariant],
      hasVariants: false,
      isSingleMode: true,
      scrapedAt: Date.now()
    };
  }

  // ─── Main scrape ───────────────────────────────────────────────────────────────

  async function scrapeProductWithVariants(options) {
    options = options || {};
    const minQty = options.minQty || 0;
    const allowLowQty = options.allowLowQty || false;

    if (
      document.querySelector('form[action*="validateCaptcha"]') ||
      (document.body && document.body.innerText.includes('Type the characters you see in this image'))
    ) throw new Error('Amazon CAPTCHA detected — please solve it and try again');

    const windowData = getWindowScriptData();
    const { variationData, jqueryData } = windowData;

    const asin = document.querySelector('input#asin')?.value ||
      window.location.pathname.match(/\/(?:dp|gp\/aw\/d)\/([A-Z0-9]{10})/)?.[1] || '';

    const parentAsin = (variationData && (variationData.parentAsin || asin)) ||
      (jqueryData && jqueryData.parentAsin) || asin;

    const titleRaw = (jqueryData && jqueryData.title) ||
      (variationData && variationData.title) ||
      document.querySelector('#productTitle')?.textContent.trim() || '';
    const title = decodeText(titleRaw.trim());

    const brandEl = document.querySelector('#bylineInfo');
    const brand = brandEl ? decodeText(brandEl.textContent.trim().replace(/^(Brand:|Visit the|Store)/i, '').trim()) : '';

    const bulletPoints = Array.from(
      document.querySelectorAll('#feature-bullets li span.a-list-item')
    ).map(el => el.textContent.trim()).filter(t => t.length > 5);

    const descEl = document.querySelector('#productDescription');
    const description = descEl ? descEl.textContent.trim().replace(/\s+/g, ' ') : '';

    const category = Array.from(
      document.querySelectorAll('#wayfinding-breadcrumbs_container li a, .a-breadcrumb a')
    ).map(el => el.textContent.trim()).filter(Boolean).join(' > ');

    const images = getImages(windowData);
    const inStock = checkStock();

    const specs = {};
    document.querySelectorAll(
      '#productOverview_feature_div tr, #productDetails_expanderTables_depthLeftSections tr, #productDetails_techSpec_section_1 tr'
    ).forEach(row => {
      const key = row.querySelector('th, .a-col-left')?.textContent.trim();
      const val = row.querySelector('td, .a-col-right')?.textContent.trim();
      if (key && val && !['Customer Reviews', 'Best Sellers Rank'].includes(key)) specs[key] = val;
    });

    const variants = await getVariations(windowData, minQty, allowLowQty);

    // Base price from first in-stock variant or first variant
    const selected = variants.find(v => v.quantity > 0) || variants[0];
    const basePrice    = selected ? selected.price    : 0;
    const baseCurrency = selected ? resolveCurrency(selected.currency || '$') : 'USD';
    const baseQty      = selected ? selected.quantity : 0;

    return {
      asin,
      parentAsin,
      title,
      brand,
      price: basePrice,
      currency: baseCurrency,
      quantity: baseQty,
      marketplace: 'amazon',
      url: window.location.href,
      images,
      bulletPoints,
      description,
      category,
      specs,
      inStock,
      variants,
      hasVariants: variants.length > 1,
      scrapedAt: Date.now()
    };
  }

  window.SsAmazonVariantScraper = { scrapeProductWithVariants, scrapeSingleProduct };

  // Test-only surface — exposes the pure JSON-repair pipeline (no DOM) so the
  // brittle SuperDS-ported parsing can be regression-locked by node:test. These
  // are the same function references used by the scraper; nothing is altered.
  window.SsAmazonVariantScraper._internals = {
    _fixQuotes, _robustParse, _removeKey, _balanceBraces, _prepareJson, _parseWindowJson, _cleanPriceText,
  };
})();

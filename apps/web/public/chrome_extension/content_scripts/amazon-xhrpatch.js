/**
 * amazon-xhrpatch.js
 * Runs in MAIN world (page context) — no chrome.* APIs available.
 * Hooks XMLHttpRequest to intercept Amazon's ajaxv2 variant price calls.
 * Caches per-ASIN buybox + quantity data, exposes via window.postMessage.
 */
(function () {
  'use strict';

  const buyboxCache = {};
  let active = true;

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  const origAbort = XMLHttpRequest.prototype.abort;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    const urlStr = String(url);
    if (urlStr.includes('ajaxv2')) {
      const m = urlStr.match(/asinList=([A-Z0-9]{10})/);
      if (m) this._ssAsin = m[1];
      this._ssUrl = urlStr;
    }
    return origOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.abort = function (...args) {
    if (active && this._ssUrl && this._ssUrl.includes('ajaxv2')) return;
    return origAbort.apply(this, args);
  };

  XMLHttpRequest.prototype.send = function (payload) {
    this.addEventListener('readystatechange', function () {
      if (this.readyState !== 4) return;
      if (!this._ssUrl || !this._ssUrl.includes('/gp/twister/ajaxv2')) return;
      if (!this.responseText) return;
      _parseBuyboxResponse(this.responseText, this._ssAsin);
      this.abort();
    }, false);
    return origSend.apply(this, arguments);
  };

  function _parseBuyboxResponse(text, asinHint) {
    let buyboxRaw = '';

    // Primary: extract escaped JSON block from response
    const blockMatch = text.match(/\{\\\"desktop_buybox_group_1\\\":\[\{.*?\}\]\}/);
    if (blockMatch) {
      buyboxRaw = blockMatch[0].replaceAll('\\', '');
    } else {
      // Fallback: parse price from HTML markup in response
      const priceMatch = text.match(
        /priceToPay[\s\S]{0,500}?a-price-symbol[^>]*>([^<]+)[\s\S]{0,200}?a-price-whole[^>]*>(\d+)[\s\S]{0,200}?a-price-fraction[^>]*>(\d+)/
      );
      if (priceMatch) {
        const sym = priceMatch[1].trim();
        const price = parseFloat(`${priceMatch[2]}.${priceMatch[3]}`);
        buyboxRaw = JSON.stringify({
          desktop_buybox_group_1: [{
            priceAmount: price,
            currencySymbol: sym,
            displayPrice: `${sym}${price}`
          }]
        });
      } else {
        // Robust fallback: search for currency pattern directly inside priceToPay block
        const p2pIndex = text.indexOf('priceToPay');
        let foundPrice = false;
        if (p2pIndex !== -1) {
          const sub = text.substring(p2pIndex, p2pIndex + 1000);
          let decoded = sub.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
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
              buyboxRaw = JSON.stringify({
                desktop_buybox_group_1: [{
                  priceAmount: price,
                  currencySymbol: sym,
                  displayPrice: `${sym}${price}`
                }]
              });
              foundPrice = true;
            }
          }
        }
        if (!foundPrice) {
          buyboxRaw = '{"desktop_buybox_group_1":[]}';
        }
      }
    }

    // Resolve ASIN from tail of response
    const asinMatch = text.substring(Math.max(0, text.length - 2000))
      .match(/"ASIN"\s*:\s*"([A-Z0-9]{10})"/);
    const resolvedAsin = asinHint || (asinMatch && asinMatch[1]);
    if (!resolvedAsin) return;

    // Extract max quantity from select options in response
    let maxQty = 0;
    try {
      const qm = text.match(/quantity[^>]*>[\s\S]*?select>/i);
      if (qm) {
        const optMatches = [...qm[0].matchAll(/option value=\\\"(\d+)\\\"/g)];
        if (optMatches.length > 1) {
          maxQty = parseInt(optMatches[optMatches.length - 1][1]);
        }
      }
    } catch (_) {}

    buyboxCache[resolvedAsin] = { buyboxRaw, quantity: maxQty };
  }

  // Content script bridge via window.postMessage
  window.addEventListener('message', async function (ev) {
    const msg = ev.data;
    if (!msg || msg.from !== 'ss-amazon-cs') return;

    switch (msg.action) {
      case 'activate':
        active = true;
        break;
      case 'deactivate':
        active = false;
        break;
      case 'getBuybox': {
        const asin = msg.asin;
        // 2s cap per ASIN — the old 15s wait stacked up across missing ASINs
        // and froze the scrape; absent entries fall back to the empty buybox.
        let tries = 0;
        while (!buyboxCache[asin] && tries++ < 20) {
          await new Promise(r => setTimeout(r, 100));
        }
        window.postMessage({
          for: `ss-buybox-${asin}`,
          data: buyboxCache[asin] || { buyboxRaw: '{"desktop_buybox_group_1":[]}', quantity: 0 }
        });
        break;
      }
    }
  });
})();

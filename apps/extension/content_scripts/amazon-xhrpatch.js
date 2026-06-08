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
        buyboxRaw = '{"desktop_buybox_group_1":[]}';
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
        let tries = 0;
        while (!buyboxCache[asin] && tries++ < 150) {
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

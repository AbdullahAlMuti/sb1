// listing-readiness.js — one pure answer to "is this scanned product ready to
// list, and if not, what exactly is wrong?". The side panel renders the items
// after every scan so problems are visible BEFORE the upload starts, instead
// of surfacing as an eBay-side error (or a wrong listing) afterwards.
//
// No DOM, no chrome.* — unit-tested in tests/listing-readiness.test.js.

(function (root) {
  'use strict';

  const EBAY_TITLE_MAX = 80;

  function _num(v) {
    if (v === null || v === undefined) return 0;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  /** Turn SSPricingApply's reason (+ last rule-sync status) into one actionable sentence. */
  function describePricingIssue(issue) {
    const fallback = 'No eBay price — check Supplier Pricing in the dashboard';
    if (!issue || !issue.reason) return fallback;
    const sync = issue.sync;
    switch (issue.reason) {
      case 'rule_disabled':
        return 'No eBay price — pricing for this supplier is disabled in Supplier Pricing';
      case 'unsupported_currency':
        return 'No eBay price — the supplier price is not in USD';
      case 'no_valid_raw_price':
        return 'No eBay price — the supplier price could not be read from the page';
      case 'no_rule_synced':
        if (!sync) return 'No eBay price — pricing rules have not synced yet. Open Supplier Pricing in the dashboard, save, and scan again';
        if (sync.ok) {
          const keys = Array.isArray(sync.supplierKeys) ? sync.supplierKeys : [];
          return keys.length
            ? `No eBay price — this account has no Amazon rule (rules found for: ${keys.join(', ')}). Is the extension logged in to the same account as the dashboard?`
            : 'No eBay price — this account has no pricing rules. Open Supplier Pricing in the dashboard and save. Is the extension logged in to the same account?';
        }
        if (sync.reason === 'not_logged_in') return 'No eBay price — the extension is not logged in to SellerSuit. Open the dashboard and log in';
        if (sync.reason === 'network') return 'No eBay price — could not reach SellerSuit to load your pricing rules';
        if (sync.reason === 'http') return `No eBay price — pricing rules could not be loaded (HTTP ${sync.status}${sync.message ? ': ' + sync.message : ''})`;
        return fallback;
      default:
        return fallback;
    }
  }

  function _sellableVariants(product) {
    const list = Array.isArray(product.variants) ? product.variants : [];
    return list.filter(v => v && v.isDeleted !== true && v.deleted !== true &&
      v.inStock !== false && v.priceVerified !== false);
  }

  /**
   * @param {object} product normalized, priced product (panel state)
   * @returns {{ ready: boolean, items: Array<{key:string, ok:boolean, level:'ok'|'warn'|'block', message:string}> }}
   *   level 'block' makes ready=false; 'warn' is shown but does not block.
   */
  function check(product) {
    const items = [];
    const add = (key, level, message) => items.push({ key, ok: level === 'ok', level, message });
    if (!product || typeof product !== 'object') {
      add('product', 'block', 'No product scanned yet');
      return { ready: false, items };
    }

    // title
    const title = String(product.title || '').trim();
    if (!title) add('title', 'block', 'Title is missing');
    else if (title.length > EBAY_TITLE_MAX) add('title', 'warn', `Title is ${title.length} characters — it will be shortened to ${EBAY_TITLE_MAX} for eBay`);
    else add('title', 'ok', `Title OK (${title.length}/${EBAY_TITLE_MAX})`);

    // images
    const images = (Array.isArray(product.images) ? product.images : []).filter(u => typeof u === 'string' && /^https?:\/\//.test(u));
    if (images.length === 0) add('images', 'block', 'No product images were found');
    else if (images.length < 3) add('images', 'warn', `Only ${images.length} image${images.length === 1 ? '' : 's'} found`);
    else add('images', 'ok', `${images.length} images`);

    // condition — the uploader can only list as "New"
    const condition = String(product.condition || 'New');
    if (!/^new$/i.test(condition)) {
      add('condition', 'block', `This supplier item is ${condition} — SellerSuit lists items as New only`);
    }

    // currency
    const currency = String(product.currency || 'USD').toUpperCase();
    if (/^[A-Z]{3}$/.test(currency) && currency !== 'USD') {
      add('currency', 'block', `Supplier price is in ${currency} — only USD can be priced`);
    }

    // variants + price
    const all = Array.isArray(product.variants) ? product.variants : [];
    const isMulti = !!product.hasVariants && all.length > 1;
    if (isMulti) {
      const sellable = _sellableVariants(product);
      const unverified = all.filter(v => v && v.priceVerified === false).length;
      const unpriced = sellable.filter(v => !(_num(v.ebayPrice) > 0 || _num(v.finalPrice) > 0)).length;
      if (sellable.length === 0) {
        add('variants', 'block', 'No variation has a verified price and stock');
      } else if (unverified > 0) {
        add('variants', 'warn', `${sellable.length} of ${all.length} variations will be listed — ${unverified} had no readable price and are left out`);
      } else {
        add('variants', 'ok', `${sellable.length} variations`);
      }
      if (sellable.length > 0 && unpriced > 0) {
        add('price', 'block', product.pricingIssue
          ? describePricingIssue(product.pricingIssue)
          : `${unpriced} variation${unpriced === 1 ? ' has' : 's have'} no eBay price — check Supplier Pricing in the dashboard`);
      } else if (sellable.length > 0) {
        add('price', 'ok', 'All listed variations are priced');
      }
    } else {
      const supplier = _num(product.raw_supplier_price) || _num(product.price);
      const final = _num(product.ebayFinalPrice) || _num(product.finalPrice);
      if (!(supplier > 0)) add('price', 'block', 'Supplier price could not be read from the page');
      else if (!(final > 0)) add('price', 'block', describePricingIssue(product.pricingIssue));
      else if (final <= supplier && product.price_source !== 'manual') add('price', 'block', 'eBay price is not above the supplier price');
      else add('price', 'ok', `eBay price $${final.toFixed(2)}`);
    }

    // shipping cost visibility
    if (product.shippingCost === null || product.shippingCost === undefined) {
      add('shipping', 'warn', 'Supplier shipping cost was not shown on the page — it is not included in the price');
    } else if (_num(product.shippingCost) > 0) {
      add('shipping', 'ok', `Supplier shipping $${_num(product.shippingCost).toFixed(2)} is included in the price`);
    }

    if (product.variantScanBlocked) {
      add('scan', 'warn', 'Amazon throttled the variation scan — solve any CAPTCHA on Amazon and scan again for the rest');
    }

    return { ready: !items.some(i => i.level === 'block'), items };
  }

  const api = { check, describePricingIssue, EBAY_TITLE_MAX };
  root.SSListingReadiness = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

// pricing-overlay.js — Side panel: renders a calculated eBay price badge
// using the locally-cached supplier pricing rules and SSPricingCore.
//
// Exposed as window.SSPricingOverlay.
// Loaded by sidepanel/side-panel.html AFTER suppliers.bundle.js (which
// provides SSPricingCore). Never makes network calls — reads chrome.storage only.
//
// Usage (panel-main.js):
//   await SSPricingOverlay.render(document.getElementById('ss-pricing'), {
//     supplierKey: 'amazon',
//     supplierPrice: '29.99',
//     shippingCost: '0',
//   });

window.SSPricingOverlay = (() => {
  'use strict';

  const CACHE_KEY = 'pricingRulesCache';

  /**
   * Build and return the pricing DOM element.
   *
   * @param {{ supplierKey: string, supplierPrice: string|number, shippingCost?: string|number }} opts
   * @returns {Promise<HTMLElement>}
   */
  async function buildOverlayElement({ supplierKey, supplierPrice, shippingCost = 0 }) {
    const el = document.createElement('div');
    el.className = 'ss-pricing-overlay';

    if (typeof window.SSPricingCore === 'undefined') {
      el.innerHTML = _msg('Pricing engine unavailable.', 'warn');
      return el;
    }

    let cache = null;
    try {
      const stored = await chrome.storage.local.get(CACHE_KEY);
      cache = stored[CACHE_KEY] || null;
    } catch (_) {
      el.innerHTML = _msg('Could not load pricing rules.', 'warn');
      return el;
    }

    if (!cache || !Array.isArray(cache.suppliers) || cache.suppliers.length === 0) {
      el.innerHTML = _msg(
        'No pricing rules — configure in <a href="#" class="ss-pricing-link" data-open-settings="supplier-pricing">Supplier Pricing</a>.',
        'info'
      );
      return el;
    }

    const rule = cache.suppliers.find(s => s.supplierKey === supplierKey);
    if (!rule) {
      el.innerHTML = _msg('No pricing rule for this supplier.', 'info');
      return el;
    }

    if (!rule.isEnabled) {
      el.innerHTML = _msg(`${rule.supplierName || supplierKey} pricing disabled.`, 'disabled');
      return el;
    }

    const priceVal = supplierPrice == null || supplierPrice === '' ? null : supplierPrice;
    if (priceVal === null) {
      el.innerHTML = _msg("Couldn't read product price.", 'warn');
      return el;
    }

    let result;
    try {
      result = window.SSPricingCore.calculatePrice(
        rule.calculationRule,
        priceVal,
        shippingCost
      );
    } catch (err) {
      el.innerHTML = _msg('Pricing calculation failed.', 'error');
      console.warn('[SSPricingOverlay]', err?.message || err);
      return el;
    }

    el.innerHTML = _breakdown(result, rule);
    return el;
  }

  /**
   * Render the overlay into containerEl, replacing its current content.
   *
   * @param {HTMLElement} containerEl
   * @param {{ supplierKey: string, supplierPrice: string|number, shippingCost?: string|number }} opts
   * @returns {Promise<void>}
   */
  async function render(containerEl, opts) {
    if (!containerEl) return;
    const overlayEl = await buildOverlayElement(opts);
    containerEl.innerHTML = '';
    containerEl.appendChild(overlayEl);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  function _msg(html, type) {
    const palette = { info: '#64748b', warn: '#d97706', error: '#dc2626', disabled: '#9ca3af' };
    return `<div class="ss-pricing-msg" style="color:${palette[type] || '#64748b'};font-size:11px;padding:4px 0;line-height:1.4">${html}</div>`;
  }

  function _breakdown(r, rule) {
    return `
<div class="ss-pricing-result">
  <div class="ss-pricing-row ss-pricing-main">
    <span class="ss-pricing-label">eBay Price</span>
    <span class="ss-pricing-final-value">$${r.finalPrice}</span>
  </div>
  <div class="ss-pricing-row ss-pricing-profit">
    <span>Profit <strong>$${r.profit}</strong></span>
    <span class="ss-pricing-sep">·</span>
    <span>Margin <strong>${r.marginPercent}%</strong></span>
  </div>
  <div class="ss-pricing-breakdown-row">
    <span>Cost $${r.supplierPrice}</span>
    <span class="ss-pricing-sep">+</span>
    <span>Ship $${r.shippingCost}</span>
    <span class="ss-pricing-sep">+</span>
    <span>Fee $${r.marketplaceFee}</span>
    <span class="ss-pricing-sep">·</span>
    <span class="ss-pricing-rule-label">${rule.supplierName || 'v' + (rule.ruleVersion || 1)}</span>
  </div>
</div>`;
  }

  return { render, buildOverlayElement };
})();

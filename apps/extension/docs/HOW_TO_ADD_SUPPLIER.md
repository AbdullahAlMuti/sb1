# How to Add a New Supplier

Adding a new supplier (e.g. AliExpress, Temu, eBay Wholesale) requires four steps.
No existing business logic changes. No pricing/SKU/eBay-upload code changes.

---

## 1. Create the scraper (content script)

Write a content script that extracts product data from the supplier's page.

```
content_scripts/
  <supplier>_injector.js   ← DOM scraping + UI injection (can copy walmart_injector.js as template)
  <supplier>_scraper.js    ← optional: separate heavy scrape logic (like amazon-variant-scraper.js)
```

Output shape your scraper must produce (minimum required fields):

```js
{
  title:     'Product name',          // string
  price:     29.99,                   // number (supplier cost, USD)
  images:    ['https://...'],         // array of image URLs, highest-res first
  variants:  [],                      // array — empty for single items
  specs:     {},                      // key-value object of product specs

  // Identity — pick whichever makes sense for your supplier:
  sourceId:  'SKU-12345',             // supplier's unique product/parent ID
  supplier:  'aliexpress',            // lowercase, no spaces
}
```

---

## 2. Create the adapter

```
suppliers/
  <supplier>/
    adapter.js
```

An adapter is a thin contract shell:

```js
window.SSAliExpressAdapter = (() => {
  'use strict';

  // Match only your supplier's domains — be precise, block lookalikes.
  const HOST_RE = /(^|\.)aliexpress\.(com|co\.uk|ru)$/i;

  function matchUrl(url) {
    try { return HOST_RE.test(new URL(url).hostname); } catch (_) { return false; }
  }

  async function scrapeProduct(opts) {
    // Call your scraper. May throw — caller handles the error.
    return window.SSAliExpressScraper.scrapeSingleProduct(opts);
  }

  async function scrapeVariants(opts) {
    return window.SSAliExpressScraper.scrapeProductWithVariants(opts);
  }

  function normalize(raw) {
    // Derive sourceId + supplier. Everything else passes through unchanged.
    const sourceId = raw.sourceId || raw.skuId || raw.productId || '';
    return {
      ...raw,
      sourceId,
      supplier: raw.supplier || 'aliexpress',
    };
  }

  return {
    supplierId: 'aliexpress',   // must be unique across all registered adapters
    matchUrl,
    scrapeProduct,
    scrapeVariants,
    normalize,
  };
})();

// Self-register
if (typeof window.SSSupplierRegistry !== 'undefined') {
  window.SSSupplierRegistry.register(window.SSAliExpressAdapter);
}
```

**Rules for `normalize()`:**
- Must set `sourceId` (string, non-empty for valid products).
- Must set `supplier` (lowercase string).
- Must NOT change `price`, `images`, `variants`, or any pricing logic.
- Must NOT call any DOM APIs — pure function, takes raw scraper output.
- `asin`/`parentAsin` only needed if you use the DB sync layer (Amazon-specific).

---

## 3. Wire up the manifests

Add the scraper + adapter to `manifest.json`, `manifest.dev.json`, and `manifest.prod.json`.

```json
{
  "matches": [
    "*://www.aliexpress.com/*",
    "*://*.aliexpress.com/*"
  ],
  "js": [
    "common/config.js",
    "common/listing-draft.js",
    "common/pricing-engine.js",
    "common/sku-engine.js",
    "common/storage.js",
    "common/ui.js",
    "common/analytics.js",
    "common/undo-manager.js",
    "common/editor-tools.js",
    "common/image-renderer.js",
    "ui/calculator.js",
    "common/images/core/image-schema.js",
    "common/images/core/image-normalizer.js",
    "common/images/core/image-deduper.js",
    "common/images/core/image-validator.js",
    "common/images/core/image-cache.js",
    "common/images/core/extraction-engine.js",
    "common/images/adapters/aliexpress.image-adapter.js",  ← add if needed
    "content_scripts/aliexpress_scraper.js",
    "suppliers/core/supplier-adapter.js",
    "suppliers/core/registry.js",
    "suppliers/aliexpress/adapter.js",
    "content_scripts/aliexpress_injector.js",
    "content_scripts/image_editor.js"
  ],
  "css": ["ui/panel.css"],
  "run_at": "document_idle"
}
```

Also add the new domains to `host_permissions`.

---

## 4. Write tests

Create `tests/<supplier>-adapter.test.js`. Cover:

- `matchUrl` — returns true for known domains, false for lookalikes
- `normalize` — sourceId derivation, supplier field, passthrough of price/images/variants
- `normalize` output passes `SSSupplierAdapter.validate()` when title present

Use the existing `tests/supplier-registry.test.js` as a template.

```js
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadStack() {
  const win = makeWindow();
  loadInto(win, 'suppliers/core/supplier-adapter.js');
  loadInto(win, 'suppliers/core/registry.js');
  loadInto(win, 'suppliers/aliexpress/adapter.js');
  return win;
}

describe('SSAliExpressAdapter — matchUrl', () => { /* ... */ });
describe('SSAliExpressAdapter — normalize (pure)', () => { /* ... */ });
```

Run: `npm test` — must still pass **all** existing tests plus your new ones.

---

## What you do NOT need to change

| Layer | Status |
|---|---|
| `common/pricing-engine.js` | Frozen — universal, no supplier knowledge |
| `common/sku-engine.js` | Frozen — universal, uses `sourceId` not `asin` |
| `common/ebay-listing-api.js` | Frozen — reads `sourceId`/`supplier` from normalized product |
| `common/listing-draft.js` | Frozen — uses `sourceId`/`supplier` |
| `ui/panel.js` / side panel | Frozen — reads from `currentProduct`, supplier-agnostic |
| `content_scripts/ebay_prelist.js` | Frozen — universal eBay upload flow |

---

## Architecture overview

```
[Supplier Page DOM]
       │ scrape
       ▼
[<supplier>_scraper.js]  ← you write this
       │ raw output
       ▼
[suppliers/<supplier>/adapter.js] normalize() ← you write this
       │ { sourceId, supplier, title, price, images, variants, ... }
       ▼
[common/listing-draft.js] productToDraft()
       │ { listingDraft }
       ▼
[chrome.storage.local] { currentProduct, listingDraft }
       │
       ▼
[side panel / panel.js / ebay_prelist.js]  ← unchanged, supplier-agnostic
       │
       ▼
[common/ebay-listing-api.js] adaptProduct() → eBay upload
```

The only data that crosses the supplier boundary is the **normalized product shape**.
Everything after `normalize()` is universal.

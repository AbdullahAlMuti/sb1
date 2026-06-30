import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeWindow, loadInto } from './helpers/load-global.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = join(__dirname, '..');

function loadCore() {
  const win = makeWindow();
  loadInto(win, 'common/listing-card-core.js');
  return win.SSListingCardCore;
}

function element(text = '', attributes = {}) {
  return {
    textContent: text,
    innerText: text,
    getAttribute(name) {
      return attributes[name] || '';
    },
  };
}

function documentFixture({ selectors = {}, selectorLists = {}, title = '' } = {}) {
  return {
    title,
    querySelector(selector) {
      return selectors[selector] || null;
    },
    querySelectorAll(selector) {
      return selectorLists[selector] || [];
    },
  };
}

function labeledRow(label, value) {
  return {
    querySelector(selector) {
      if (selector.includes('__values') || selector === 'dd') return element(value);
      if (selector.includes('__labels') || selector === 'dt') return element(label);
      return null;
    },
  };
}

describe('SSListingCardCore title cleanup', () => {
  test('removes eBay and promotional boilerplate conservatively', () => {
    const core = loadCore();
    assert.equal(
      core.cleanSearchQuery(' New Listing: ACME X-200 / Pro *** | Free Shipping '),
      'ACME X-200 / Pro'
    );
    assert.equal(core.cleanSearchQuery('ACME Model A+B / C-3 | eBay'), 'ACME Model A+B / C-3');
    assert.equal(core.cleanSearchQuery('ACME Widget for sale online | eBay'), 'ACME Widget');
    assert.equal(core.cleanSearchQuery('ACME Widget Free Shipping'), 'ACME Widget');
  });

  test('falls back to normalized source text when cleanup would be empty', () => {
    const core = loadCore();
    assert.equal(core.cleanSearchQuery('  New Listing  '), 'New Listing');
  });
});

describe('SSListingCardCore search URLs', () => {
  test('builds the existing HTTPS URL shape for all six targets', () => {
    const core = loadCore();
    const query = 'ACME "Widget"/Pro';
    assert.equal(core.buildSearchUrl('ebay', query), 'https://www.ebay.com/sch/i.html?_nkw=ACME%20Widget Pro&_sop=12');
    assert.equal(core.buildSearchUrl('amazon', query), 'https://www.amazon.com/s?k=ACME%20Widget Pro');
    assert.equal(core.buildSearchUrl('walmart', query), 'https://www.walmart.com/search/?query=ACME%20Widget Pro');
    assert.equal(core.buildSearchUrl('aliexpress', query), 'https://www.aliexpress.com/w/wholesale-ACME%20Widget Pro.html');
    assert.equal(core.buildSearchUrl('temu', query), 'https://www.temu.com/search_result.html?search_key=ACME%20Widget Pro');
    assert.equal(core.buildSearchUrl('alibaba', query), 'https://www.alibaba.com/trade/search?SearchText=ACME%20Widget Pro');
  });

  test('allowlists only the configured HTTPS search hosts', () => {
    const core = loadCore();
    for (const target of core.SEARCH_TARGETS) {
      assert.equal(core.isAllowedSearchUrl(core.buildSearchUrl(target, 'Widget')), true, target);
    }
    assert.equal(core.isAllowedSearchUrl('http://www.ebay.com/sch/i.html'), false);
    assert.equal(core.isAllowedSearchUrl('https://www.ebay.com.evil.test/'), false);
    assert.equal(core.buildSearchUrl('unknown', 'Widget'), null);
  });
});

describe('SSListingCardCore marketplace and eBay URL matching', () => {
  test('recognizes supported marketplaces without accepting lookalike hosts', () => {
    const core = loadCore();
    assert.equal(core.getMarketplace('www.amazon.co.uk'), 'amazon');
    assert.equal(core.getMarketplace('www.walmart.ca'), 'walmart');
    assert.equal(core.getMarketplace('www.ebay.com.au'), 'ebay');
    assert.equal(core.getMarketplace('www.aliexpress.com'), 'aliexpress');
    assert.equal(core.getMarketplace('m.aliexpress.us'), 'aliexpress');
    assert.equal(core.getMarketplace('www.ebay.com.evil.test'), null);
    assert.equal(core.getMarketplace('aliexpress.com.evil.test'), null);
  });

  test('extracts item IDs from both common eBay item URL forms', () => {
    const core = loadCore();
    assert.equal(core.extractEbayItemId('https://www.ebay.com/itm/123456789012'), '123456789012');
    assert.equal(core.extractEbayItemId('https://www.ebay.co.uk/itm/product-slug/123456789012?hash=x'), '123456789012');
    assert.equal(core.extractEbayItemId('https://www.ebay.com/sch/i.html?_nkw=x'), '');
    assert.equal(core.extractEbayItemId('https://www.ebay.com.evil.test/itm/123456789012'), '');
  });
});

describe('SSListingCardCore eBay extraction', () => {
  test('prefers visible DOM data and reads labeled condition and brand values', () => {
    const core = loadCore();
    const conditionRow = labeledRow('Condition:', 'Open box');
    const brandRow = labeledRow('Brand', 'ACME');
    const doc = documentFixture({
      selectors: {
        'h1.x-item-title__mainTitle span.ux-textspans': element('New Listing: ACME Widget'),
        '.x-price-primary span.ux-textspans': element('US $19.99'),
        '.ux-image-carousel-item.active img': element('', { src: 'https://i.ebayimg.com/images/widget.jpg' }),
        '.x-sellercard-atf__info__about-seller a span': element('trusted-seller'),
      },
      selectorLists: {
        '.ux-layout-section-evo__row dl': [conditionRow, brandRow],
      },
    });

    const data = core.extractEbayProduct(doc, 'https://www.ebay.com/itm/widget/123456789012');
    assert.equal(data.productId, '123456789012');
    assert.equal(data.title, 'New Listing: ACME Widget');
    assert.equal(data.searchQuery, 'ACME Widget');
    assert.equal(data.price, 'US $19.99');
    assert.equal(data.image, 'https://i.ebayimg.com/images/widget.jpg');
    assert.equal(data.condition, 'Open box');
    assert.equal(data.seller, 'trusted-seller');
    assert.equal(data.brand, 'ACME');
  });

  test('falls back to valid JSON-LD and ignores malformed JSON-LD', () => {
    const core = loadCore();
    const malformed = element('{not json');
    const structured = element(JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Structured Widget | eBay',
      image: ['https://i.ebayimg.com/images/structured.jpg'],
      brand: { '@type': 'Brand', name: 'Structured Brand' },
      offers: {
        '@type': 'Offer',
        price: '29.50',
        priceCurrency: 'USD',
        itemCondition: 'https://schema.org/UsedCondition',
        seller: { '@type': 'Organization', name: 'Structured Seller' },
      },
    }));
    const doc = documentFixture({
      selectorLists: {
        'script[type="application/ld+json"]': [malformed, structured],
      },
    });

    const data = core.extractEbayProduct(doc, 'https://www.ebay.de/itm/123456789012');
    assert.equal(data.searchQuery, 'Structured Widget');
    assert.equal(data.price, 'USD 29.50');
    assert.equal(data.image, 'https://i.ebayimg.com/images/structured.jpg');
    assert.equal(data.condition, 'Used');
    assert.equal(data.seller, 'Structured Seller');
    assert.equal(data.brand, 'Structured Brand');
  });

  test('fingerprint changes only when rendered product data changes', () => {
    const core = loadCore();
    const base = { productId: '1', searchQuery: 'Widget', price: '$10' };
    assert.equal(core.productFingerprint(base), core.productFingerprint({ ...base }));
    assert.notEqual(core.productFingerprint(base), core.productFingerprint({ ...base, price: '$11' }));
  });
});

describe('listing card manifest wiring', () => {
  test('every source manifest loads the eBay core, scraper, injector, and stylesheet', () => {
    for (const name of ['manifest.json', 'manifest.dev.json', 'manifest.prod.json']) {
      const manifest = JSON.parse(readFileSync(join(EXT_ROOT, name), 'utf8'));
      const block = manifest.content_scripts.find(entry =>
        entry.js?.includes('content_scripts/ebay_item_scraper.js')
      );
      assert.ok(block, `${name} must include the eBay content-script block`);
      assert.ok(block.js.includes('common/listing-card-core.js'), `${name} must load listing-card core`);
      assert.ok(block.js.includes('content_scripts/ebay_item_scraper.js'), `${name} must keep item scraper`);
      assert.ok(block.js.includes('content_scripts/listing_card_injector.js'), `${name} must load card injector`);
      assert.ok(block.css.includes('ui/listing-card.css'), `${name} must load card CSS`);
      
      // Verify search and homepage matches are registered via wildcards
      assert.ok(block.matches.includes('*://*.ebay.com/*'), `${name} must include eBay wildcard pattern`);
      assert.ok(block.matches.includes('*://*.ebay.co.uk/*'), `${name} must include eBay UK wildcard pattern`);
    }
  });

  test('Amazon, Walmart, and AliExpress bundles load the core before the injector', () => {
    for (const entry of ['src/content_scripts/amazon.js', 'src/content_scripts/walmart.js', 'src/content_scripts/aliexpress.js']) {
      const source = readFileSync(join(EXT_ROOT, entry), 'utf8');
      const coreIndex = source.indexOf('common/listing-card-core.js');
      const injectorIndex = source.indexOf('content_scripts/listing_card_injector.js');
      assert.ok(coreIndex >= 0, `${entry} must import the listing-card core`);
      assert.ok(coreIndex < injectorIndex, `${entry} must load core before injector`);
    }
  });

  test('AliExpress card injector supports global and dynamic product-link pages', () => {
    const source = readFileSync(join(EXT_ROOT, 'content_scripts/listing_card_injector.js'), 'utf8');
    assert.ok(source.includes("p === '/'"), 'AliExpress must treat the global homepage as a listing surface');
    assert.ok(
      source.includes("document.querySelector('a[href*=\"/item/\"]')"),
      'AliExpress must activate when dynamic pages render product links'
    );
    assert.ok(
      source.includes('function findProductCard(node)'),
      'AliExpress search cards must climb out of image-only wrappers'
    );
    assert.ok(
      source.includes('isMeaningfulProductTitle(text)'),
      'AliExpress search links must ignore generic AliExpress labels'
    );
    assert.ok(
      source.includes('container.appendChild(wrapper)'),
      'AliExpress card must attach to the stable product-card container'
    );
  });

  test('AliExpress side panel and listing card CSS are wired', () => {
    const background = readFileSync(join(EXT_ROOT, 'background/index.js'), 'utf8');
    assert.ok(background.includes("'aliexpress.com'"), 'AliExpress .com must enable side panel');
    assert.ok(background.includes("'aliexpress.ru'"), 'AliExpress .ru must enable side panel');
    assert.ok(background.includes("'aliexpress.us'"), 'AliExpress .us must enable side panel');

    for (const name of ['manifest.json', 'manifest.dev.json', 'manifest.prod.json']) {
      const manifest = JSON.parse(readFileSync(join(EXT_ROOT, name), 'utf8'));
      const block = manifest.content_scripts.find(entry =>
        entry.js?.includes('build/aliexpress.bundle.js')
      );
      assert.ok(block, `${name} must include the AliExpress content-script block`);
      assert.ok(block.css.includes('ui/panel.css'), `${name} must include panel CSS`);
      assert.ok(block.css.includes('ui/listing-card.css'), `${name} must include listing-card CSS`);
    }
  });
});

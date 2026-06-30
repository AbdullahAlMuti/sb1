import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeWindow, loadInto } from './helpers/load-global.js';

function fixture(name) {
  return readFileSync(join('tests', 'fixtures', name), 'utf8');
}

function makeElement(attrs = {}, textContent = '') {
  return {
    textContent,
    innerText: textContent,
    getAttribute(name) {
      return attrs[name] || null;
    },
    querySelector() {
      return null;
    },
  };
}

function makeDocument(html) {
  const scripts = Array.from(html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)).map(
    (match) => {
      const attrs = {};
      const attrText = match[1] || '';
      const type = attrText.match(/type=["']([^"']+)["']/i);
      if (type) attrs.type = type[1];
      return makeElement(attrs, match[2]);
    }
  );
  const metas = Array.from(html.matchAll(/<meta\s+([^>]+)>/gi)).map((match) => {
    const attrs = {};
    for (const attr of match[1].matchAll(/([a-z:-]+)=["']([^"']*)["']/gi)) attrs[attr[1]] = attr[2];
    return makeElement(attrs);
  });
  return {
    querySelectorAll(selector) {
      if (selector === 'script') return scripts;
      if (selector === 'img') return [];
      return [];
    },
    querySelector(selector) {
      const metaMatch = selector.match(/^meta\[(property|name)="([^"]+)"\]$/);
      if (metaMatch) {
        return metas.find((meta) => meta.getAttribute(metaMatch[1]) === metaMatch[2]) || null;
      }
      return null;
    },
  };
}

function loadScraper(url) {
  const win = makeWindow();
  win.location = { href: url };
  loadInto(win, 'content_scripts/aliexpress_scraper.js');
  return win;
}

describe('SSAliExpressScraper - simple product fixture', () => {
  test('extracts normalized raw product fields', () => {
    const url = 'https://www.aliexpress.com/item/100500111222333.html';
    const win = loadScraper(url);
    const product = win.SSAliExpressScraper.extractProductDocument(
      makeDocument(fixture('aliexpress-simple.html')),
      url
    );
    assert.equal(product.sourceId, '100500111222333');
    assert.equal(product.supplier, 'aliexpress');
    assert.equal(product.title, 'AliExpress Simple Widget');
    assert.equal(product.price, 19.99);
    assert.equal(product.currency, 'USD');
    assert.equal(product.images.length, 2);
    assert.equal(product.seller.name, 'Choice Fixture Store');
    assert.equal(product.shipping.text, 'Free shipping');
    assert.equal(product.specs.Brand, 'FixtureCo');
    assert.equal(product.variantExtractionStatus, 'selected-only');
  });
});

describe('SSAliExpressScraper - variant fixture', () => {
  test('extracts SKU combinations with price image and stock', () => {
    const url = 'https://www.aliexpress.com/item/100500444555666.html';
    const win = loadScraper(url);
    const product = win.SSAliExpressScraper.extractProductDocument(
      makeDocument(fixture('aliexpress-variants.html')),
      url
    );
    assert.equal(product.hasVariants, true);
    assert.equal(product.variantExtractionStatus, 'complete');
    assert.equal(product.variants.length, 2);
    assert.deepEqual(product.variants[0].optionValues, { Color: 'Red', Size: 'Small' });
    assert.equal(product.variants[0].price, 12.5);
    assert.equal(product.variants[0].quantity, 7);
    assert.equal(product.variants[0].img, 'https://ae01.alicdn.com/kf/red.jpg');
    assert.deepEqual(product.variants[1].optionValues, { Color: 'Blue', Size: 'Large' });
    assert.equal(product.variants[1].price, 14.25);
  });
});

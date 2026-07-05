// bulk-core.test.js — locks the Bulk Lister worker state machine.
// Run: node --test apps/extension/tests/bulk-core.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

const win = makeWindow();
loadInto(win, 'background/bulk-core.js');
const Core = win.SSBulkCore;

function payload(overrides = {}) {
  return {
    items: [
      { id: 'a', url: 'https://www.amazon.com/dp/B0DXK5B2DT' },
      { id: 'b', url: 'https://www.walmart.com/ip/eos-lotion/625527254' },
    ],
    interval: 60,
    settings: {},
    ...overrides,
  };
}

describe('sanitizeIntervalMs', () => {
  test('defaults to 60s for garbage', () => {
    assert.equal(Core.sanitizeIntervalMs(undefined), 60000);
    assert.equal(Core.sanitizeIntervalMs('abc'), 60000);
    assert.equal(Core.sanitizeIntervalMs(-5), 60000);
  });
  test('clamps to [30s, 1h]', () => {
    assert.equal(Core.sanitizeIntervalMs(5), 30000);
    assert.equal(Core.sanitizeIntervalMs(99999), 3600000);
    assert.equal(Core.sanitizeIntervalMs(120), 120000);
  });
});

describe('createState', () => {
  test('builds queued items and drops malformed ones', () => {
    const s = Core.createState(payload({
      items: [...payload().items, { id: null, url: 'x' }, { id: 'c' }, null],
    }));
    assert.equal(s.items.length, 2);
    assert.ok(s.items.every(it => it.status === 'queued'));
    assert.equal(s.isRunning, false);
    assert.equal(s.intervalMs, 60000);
  });
  test('keeps overrides per item', () => {
    const s = Core.createState(payload({
      items: [{ id: 'a', url: 'u', overrides: { title: 'T', price: 9.99 } }],
    }));
    assert.deepEqual(s.items[0].overrides, { title: 'T', price: 9.99 });
  });
});

describe('queue traversal + transitions', () => {
  test('nextQueuedItem walks the queue in order', () => {
    let s = Core.createState(payload());
    assert.equal(Core.nextQueuedItem(s).id, 'a');
    s = Core.patchItem(s, 'a', { status: 'listed' });
    assert.equal(Core.nextQueuedItem(s).id, 'b');
    s = Core.patchItem(s, 'b', { status: 'failed', error: 'boom' });
    assert.equal(Core.nextQueuedItem(s), null);
  });

  test('patchItem is immutable and stamps finishedAt on terminal states', () => {
    const s0 = Core.createState(payload());
    const s1 = Core.patchItem(s0, 'a', { status: 'listed' });
    assert.notEqual(s0, s1);
    assert.equal(s0.items[0].status, 'queued');
    assert.equal(s1.items[0].status, 'listed');
    assert.ok(s1.items[0].finishedAt > 0);
    // requeue clears finishedAt
    const s2 = Core.patchItem(s1, 'a', { status: 'queued' });
    assert.equal(s2.items[0].finishedAt, null);
  });

  test('counts aggregates statuses', () => {
    let s = Core.createState(payload());
    s = Core.patchItem(s, 'a', { status: 'listed' });
    const c = Core.counts(s);
    assert.equal(c.total, 2);
    assert.equal(c.listed, 1);
    assert.equal(c.queued, 1);
  });
});

describe('applyOverrides — data priority (user-edited > scraped > generated)', () => {
  const scraped = {
    title: 'Scraped Title',
    finalPrice: 12.5,
    hasVariants: false,
    variants: [{}],
  };

  test('manual title/sku/price win and are source-flagged', () => {
    const out = Core.applyOverrides(scraped, { title: 'My Title', sku: 'MY-SKU', price: 19.99 });
    assert.equal(out.title, 'My Title');
    assert.equal(out.title_source, 'manual');
    assert.equal(out.ebaySku, 'MY-SKU');
    assert.equal(out.sku_source, 'manual');
    assert.equal(out.finalPrice, 19.99);
    assert.equal(out.price_source, 'manual');
  });

  test('empty overrides leave the product untouched', () => {
    const out = Core.applyOverrides(scraped, {});
    assert.equal(out.title, 'Scraped Title');
    assert.equal(out.title_source, undefined);
    assert.equal(out.finalPrice, 12.5);
  });

  test('price override is ignored for multi-variation products', () => {
    const multi = { ...scraped, hasVariants: true, variants: [{}, {}] };
    const out = Core.applyOverrides(multi, { price: 19.99 });
    assert.equal(out.finalPrice, 12.5);
    assert.equal(out.price_source, undefined);
  });

  test('does not mutate the input product', () => {
    const out = Core.applyOverrides(scraped, { title: 'X' });
    assert.equal(scraped.title, 'Scraped Title');
    assert.notEqual(out, scraped);
  });
});

describe('summarizeProduct', () => {
  test('extracts dashboard snapshot incl. first http image only', () => {
    const sum = Core.summarizeProduct({
      title: 'T',
      images: ['data:image/jpeg;base64,xxx', 'https://m.media-amazon.com/img.jpg'],
      supplier: 'amazon',
      sourceId: 'B000000000',
      variants: [{}, {}, {}],
      price: '24.99',
      finalPrice: 39.99,
    });
    assert.equal(sum.image, 'https://m.media-amazon.com/img.jpg');
    assert.equal(sum.variationCount, 3);
    assert.equal(sum.supplierPrice, 24.99);
    assert.equal(sum.ebayPrice, 39.99);
    assert.equal(sum.supplierId, 'B000000000');
  });
});

describe('recoverState — service-worker restart', () => {
  test('scraping → queued (no side effects yet), uploading → failed (ambiguous)', () => {
    let s = Core.createState(payload());
    s = Core.patchItem(s, 'a', { status: 'scraping' });
    s = Core.patchItem(s, 'b', { status: 'uploading' });
    const { state: r, changed } = Core.recoverState(s);
    assert.equal(changed, true);
    assert.equal(r.items.find(i => i.id === 'a').status, 'queued');
    const b = r.items.find(i => i.id === 'b');
    assert.equal(b.status, 'failed');
    assert.match(b.error, /Interrupted/);
  });

  test('clean state is untouched', () => {
    const s = Core.createState(payload());
    const { changed } = Core.recoverState(s);
    assert.equal(changed, false);
  });
});

describe('isJobBlockingError', () => {
  test('CAPTCHA / eBay logout / plan limits pause the job', () => {
    assert.ok(Core.isJobBlockingError('Scraping timeout - CAPTCHA detected'));
    assert.ok(Core.isJobBlockingError('You are not logged into eBay. Open eBay.com…'));
    assert.ok(Core.isJobBlockingError('Listing limit reached (10/10)'));
    assert.ok(Core.isJobBlockingError('Insufficient credits (have 0)'));
    assert.ok(Core.isJobBlockingError('You do not have enough credits to create a listing.'));
    assert.ok(Core.isJobBlockingError('INSUFFICIENT_CREDITS'));
  });
  test('ordinary item errors do not pause the job', () => {
    assert.ok(!Core.isJobBlockingError('Could not find draftId in eBay response'));
    assert.ok(!Core.isJobBlockingError('Zero variations found'));
    assert.ok(!Core.isJobBlockingError(null));
  });
});

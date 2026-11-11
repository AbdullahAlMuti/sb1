// title-quality.test.js — eBay title rules shown live in the editor.
// Run: node --test apps/extension/tests/title-quality.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function Q() {
  const win = makeWindow();
  loadInto(win, 'common/title-quality.js');
  return win.SSTitleQuality;
}
const keys = (r) => r.tips.map(t => t.key);

describe('SSTitleQuality.check', () => {
  test('a good title passes with an accurate count', () => {
    const t = 'Instant Pot Duo 7-in-1 Electric Pressure Cooker 6 Quart Stainless Steel';
    const r = Q().check(t);
    assert.equal(r.length, t.length);
    assert.equal(r.level, 'ok');
    assert.deepEqual(r.tips, []);
    assert.equal(r.counter, `${t.length} / 80`);
  });

  test('empty and over-length titles block', () => {
    const q = Q();
    assert.deepEqual(keys(q.check('  ')), ['empty']);
    const over = q.check('x'.repeat(40) + ' ' + 'y'.repeat(45));
    assert.equal(over.level, 'over');
    assert.match(over.tips[0].message, /6 characters over/);
    assert.equal(over.tips[0].level, 'block');
  });

  test('supplier names block; promotional words and shouting warn', () => {
    const q = Q();
    const supplier = q.check('Stainless Steel Water Bottle 24oz Leakproof from Amazon Prime Seller');
    assert.ok(keys(supplier).includes('supplier'));
    assert.equal(supplier.tips.find(t => t.key === 'supplier').level, 'block');

    const promo = q.check('BEST Stainless Steel Water Bottle 24oz FREE SHIPPING Hot Sale L@@K');
    assert.ok(keys(promo).includes('promo'));
    assert.match(promo.tips.find(t => t.key === 'promo').message, /free shipping/i);

    assert.ok(keys(q.check('STAINLESS STEEL WATER BOTTLE LEAKPROOF INSULATED 24OZ')).includes('caps'));
    // Short all-caps tokens (sizes, model codes, acronyms) are not shouting.
    assert.ok(!keys(q.check('Sony WH-1000XM5 Wireless Noise Cancelling Headphones USB-C LED Black XL')).includes('caps'));
  });

  test('stuffing, repetition, dangling ends and short titles warn', () => {
    const q = Q();
    assert.ok(keys(q.check('Water Bottle!!! *** Insulated ~~ Stainless Steel 24oz Leakproof Lid')).includes('symbols'));
    assert.ok(keys(q.check('Bottle Water Bottle Steel Bottle Insulated Bottle 24oz Leakproof Travel')).includes('repeat'));
    assert.ok(keys(q.check('Stainless Steel Insulated Water Bottle 24oz Leakproof Lid with')).includes('dangling'));
    assert.ok(keys(q.check('Water Bottle')).includes('short'));
  });
});

describe('SSTitleQuality.trimToLimit', () => {
  test('cuts at a word boundary and never ends on a connector or punctuation', () => {
    const q = Q();
    const long = 'Instant Pot Duo 7-in-1 Electric Pressure Cooker, Slow Cooker, Rice Cooker, Steamer, and Yogurt Maker';
    const out = q.trimToLimit(long);
    assert.ok(out.length <= 80, String(out.length));
    assert.ok(long.startsWith(out.replace(/[,\s]+$/, '')));
    assert.ok(!/(\band|\bwith|\bfor|\bof|\bthe|,|-|&)$/i.test(out), out);
    assert.equal(q.trimToLimit('Short Title'), 'Short Title');
  });
});

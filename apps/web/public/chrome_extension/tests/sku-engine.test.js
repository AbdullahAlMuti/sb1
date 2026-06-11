// sku-engine.test.js — locks buildReadable + encodeForEbay behavior before any refactor
// Run: node --test apps/extension/tests/sku-engine.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const src = readFileSync(join(__dirname, '../common/sku-engine.js'), 'utf8');
const globalObj = {};
const fn = new Function('window', src);
fn(globalObj);
const { buildReadable, encodeForEbay, MAX_LEN } = globalObj.SSSkuEngine;

describe('buildReadable — single item', () => {
  test('basic ASIN → AZS-prefixed', () => {
    assert.equal(buildReadable('B08XYZ', {}), 'AZS-B08XYZ');
  });

  test('null attrs same as empty', () => {
    assert.equal(buildReadable('B08XYZ', null), 'AZS-B08XYZ');
  });

  test('undefined attrs same as empty', () => {
    assert.equal(buildReadable('B08XYZ', undefined), 'AZS-B08XYZ');
  });

  test('ASIN lowercased → uppercased', () => {
    assert.equal(buildReadable('b08xyz', {}), 'AZS-B08XYZ');
  });

  test('special chars in ASIN stripped', () => {
    assert.equal(buildReadable('B08-XYZ!', {}), 'AZS-B08XYZ');
  });

  test('custom supplier prefix', () => {
    assert.ok(buildReadable('B08XYZ', {}, 'WMS').startsWith('WMS-'));
  });

  test('supplier prefix truncated to 4 chars', () => {
    assert.ok(buildReadable('B08XYZ', {}, 'TOOLONG').startsWith('TOOL-'));
  });
});

describe('buildReadable — variation attrs', () => {
  test('object attrs {productName}', () => {
    assert.equal(
      buildReadable('B08XYZ', { Color: { productName: 'Red' }, Size: { productName: 'L' } }),
      'AZS-B08XYZ-COLO-RED-SIZE-L'
    );
  });

  test('flat string attrs', () => {
    assert.equal(
      buildReadable('B08XYZ', { Color: 'Red', Size: 'L' }),
      'AZS-B08XYZ-COLO-RED-SIZE-L'
    );
  });

  test('attrs sorted alphabetically — order-independent', () => {
    const a = buildReadable('B08XYZ', {
      Size: { productName: 'L' },
      Color: { productName: 'Red' },
    });
    const b = buildReadable('B08XYZ', {
      Color: { productName: 'Red' },
      Size: { productName: 'L' },
    });
    assert.equal(a, b);
  });

  test('attr key truncated to 4 chars', () => {
    const sku = buildReadable('B08XYZ', { LongKeyName: { productName: 'Val' } });
    assert.ok(sku.includes('-LONG-'), `expected -LONG-, got ${sku}`);
  });

  test('attr value truncated to 16 chars', () => {
    const sku = buildReadable('B08XYZ', { Color: { productName: 'TooLongColorValueName' } });
    assert.ok(sku.includes('-TOOLONGCOLORVALU'), `expected -TOOLONGCOLORVALU, got ${sku}`);
    assert.ok(!sku.includes('TooLongColorValueName'), 'value truncated at 16');
  });

  test('special chars in attr values stripped', () => {
    const sku = buildReadable('B08XYZ', { Color: { productName: 'Dark Blue' } });
    assert.ok(sku.includes('DARKBL'), `expected DARKBL, got ${sku}`);
  });
});

describe('buildReadable — MAX_LEN overflow', () => {
  test('MAX_LEN is 50', () => {
    assert.equal(MAX_LEN, 50);
  });

  test('short SKU within MAX_LEN', () => {
    const sku = buildReadable('B08XYZ', { Color: { productName: 'Red' } });
    assert.ok(sku.length <= MAX_LEN, `${sku} exceeds ${MAX_LEN}`);
  });

  test('long SKU triggers hash suffix and stays within MAX_LEN', () => {
    // 4 distinct attrs + 11-char ASIN → full pre-hash = 64 chars > 50 → hash fires
    // Result: root + '-XXXX' (suffix=5). Root=15 chars → final = 20. Always <= MAX_LEN.
    const attrs = {
      ColA: { productName: 'BlueGreen' },
      SizB: { productName: 'ExtraWide' },
      MatC: { productName: 'Polyester' },
      StlD: { productName: 'Vintage88' },
    };
    const sku = buildReadable('B08XYZABCDE', attrs);
    assert.ok(sku.length <= MAX_LEN, `SKU ${sku} (len ${sku.length}) exceeds MAX_LEN ${MAX_LEN}`);
    // Hash suffix is 7 chars: dash + 6 base36 chars
    assert.match(sku, /-[A-Z0-9]{6}$/, `expected hash suffix in ${sku}`);
  });

  test('overflow hash deterministic — same input = same SKU', () => {
    const attrs = {
      ColA: { productName: 'BlueGreen' },
      SizB: { productName: 'ExtraWide' },
      MatC: { productName: 'Polyester' },
      StlD: { productName: 'Vintage88' },
    };
    assert.equal(buildReadable('B08XYZABCDE', attrs), buildReadable('B08XYZABCDE', attrs));
  });

  test('different long variants → different hash suffixes', () => {
    const mk = (color) => ({
      ColA: { productName: color },
      SizB: { productName: 'ExtraWide' },
      MatC: { productName: 'Polyester' },
      StlD: { productName: 'Vintage88' },
    });
    const a = buildReadable('B08XYZABCDE', mk('BlueGreen'));
    const b = buildReadable('B08XYZABCDE', mk('DarkRed99'));
    assert.notEqual(a, b, 'different variants must differ after hash');
  });
});

describe('encodeForEbay — structural', () => {
  test('returns the readable SKU directly', () => {
    assert.equal(encodeForEbay('AZS-B08XYZ'), 'AZS-B08XYZ');
  });

  test('round-trips directly', () => {
    const sku = 'AZS-B08XYZ-COLO-RED-SIZE-L';
    assert.equal(encodeForEbay(sku), sku);
  });

  test('null → empty string', () => {
    assert.equal(encodeForEbay(null), '');
  });

  test('undefined → empty string', () => {
    assert.equal(encodeForEbay(undefined), '');
  });

  test('empty string → empty string', () => {
    assert.equal(encodeForEbay(''), '');
  });

  test('different SKUs → different outputs', () => {
    assert.notEqual(encodeForEbay('AZS-B08XYZ-COLO-RED'), encodeForEbay('AZS-B08XYZ-COLO-BLUE'));
  });

  test('result is string', () => {
    assert.equal(typeof encodeForEbay('AZS-B08XYZ'), 'string');
  });
});

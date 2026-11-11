// ebay-item-specifics.test.js — required eBay item specifics are never filled
// with an arbitrary option; unknown ones are reported for the seller to fill.
// Run: node --test apps/extension/tests/ebay-item-specifics.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { makeWindow, loadInto } from './helpers/load-global.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolver() {
  const win = makeWindow();
  loadInto(win, 'common/sku-engine.js');
  loadInto(win, 'common/ebay-listing-api.js');
  return win.EbayListingApiHelper.resolveAttributes;
}

const SCHEMA = [
  { attributeName: 'Brand', required: true, customValuesAllowed: true },
  { attributeName: 'Type', required: true, options: [{ value: 'Blender' }, { value: 'Juicer' }] },
  { attributeName: 'Material', usage: 'REQUIRED', options: [{ value: 'Glass' }, { value: 'Steel' }] },
  { attributeName: 'UPC', required: true },
  { attributeName: 'MPN', required: true },
  { attributeName: 'Color', required: false },
  { attributeName: 'Features', multiSelectEnabled: true },
];

describe('resolveAttributes', () => {
  test('a required specific with no product value is reported, not filled with the first option', () => {
    const { attributes, unresolved } = resolver()({ Brand: 'Acme' }, SCHEMA);
    assert.equal(attributes.Type, undefined);
    assert.equal(attributes.Material, undefined);
    assert.deepEqual(unresolved, ['Type', 'Material']);
  });

  test('values present on the product are mapped (incl. synonyms and multi-select)', () => {
    const { attributes, unresolved } = resolver()(
      { 'Brand Name': 'Acme', Material: 'Steel', Type: 'Juicer', Features: 'BPA Free, Dishwasher Safe', Colour: 'Red' },
      SCHEMA,
    );
    assert.deepEqual(attributes.Brand, ['Acme']);
    assert.deepEqual(attributes.Material, ['Steel']);
    assert.deepEqual(attributes.Features, ['BPA Free', 'Dishwasher Safe']);
    assert.deepEqual(attributes.Color, ['Red']);
    assert.deepEqual(unresolved, []);
  });

  test('identifiers default to "Does not apply"; Brand to "Unbranded" only when absent', () => {
    const none = resolver()({ Type: 'Blender', Material: 'Glass' }, SCHEMA);
    assert.deepEqual(none.attributes.UPC, ['Does not apply']);
    assert.deepEqual(none.attributes.MPN, ['Does not apply']);
    assert.deepEqual(none.attributes.Brand, ['Unbranded']);
    assert.deepEqual(none.assumed.sort(), ['Brand', 'MPN', 'UPC']);

    const branded = resolver()({ Brand: 'Acme', Type: 'Blender', Material: 'Glass' }, SCHEMA);
    assert.deepEqual(branded.attributes.Brand, ['Acme']);
  });

  test('empty spec values are ignored and bad input does not throw', () => {
    const r = resolver()({ Brand: '  ', Type: null }, SCHEMA);
    assert.deepEqual(r.attributes.Brand, ['Unbranded']);
    assert.ok(r.unresolved.includes('Type'));
    assert.deepEqual(resolver()(null, null), { attributes: {}, unresolved: [], assumed: [] });
  });
});

describe('listing text and location', () => {
  const api = readFileSync(join(__dirname, '..', 'common', 'ebay-listing-api.js'), 'utf8');
  const gen = readFileSync(join(__dirname, '..', 'common', 'description-generator.js'), 'utf8');

  test('descriptions make no shipping/return promises that may contradict the listing', () => {
    for (const src of [api, gen]) {
      assert.equal(/30-Day Returns/i.test(src), false);
      assert.equal(/ship within 1 business day/i.test(src), false);
      assert.equal(/free shipping on all orders/i.test(src), false);
    }
  });

  test('item location is United States', () => {
    assert.equal(api.includes("'Multiple locations'"), false);
    assert.ok(api.includes("itemLocationCityState: 'United States'"));
  });
});

// json-repair.test.js — locks the brittle SuperDS-ported JSON repair pipeline in
// amazon-variant-scraper.js. Amazon embeds malformed pseudo-JSON in <script> tags
// (single quotes, unquoted keys, trailing commas, Date.now() calls). This pipeline
// repairs it. A silent break here = scraper returns empty = no listings.
// Run: node --test apps/extension/tests/json-repair.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadInternals() {
  const win = makeWindow();
  // Scraper IIFE defines functions and exports; no DOM touched at load time.
  loadInto(win, 'content_scripts/amazon-variant-scraper.js');
  return win.SsAmazonVariantScraper._internals;
}

describe('_prepareJson — normalization', () => {
  test('converts single quotes to double quotes', () => {
    const { _prepareJson } = loadInternals();
    const out = _prepareJson("{'color':'red'}");
    assert.ok(out.includes('"color"'), `expected quoted key in ${out}`);
    assert.ok(out.includes('"red"'), `expected quoted value in ${out}`);
  });

  test('quotes unquoted keys', () => {
    const { _prepareJson } = loadInternals();
    const out = _prepareJson('{color:"red"}');
    assert.ok(out.includes('"color":'), `expected quoted key in ${out}`);
  });

  test('strips trailing commas before } and ]', () => {
    const { _prepareJson } = loadInternals();
    const out = _prepareJson('{"a":1,}');
    assert.ok(!/,\s*}/.test(out), `trailing comma not stripped: ${out}`);
  });

  test('replaces Date.now() with 0', () => {
    const { _prepareJson } = loadInternals();
    const out = _prepareJson('{"t":Date.now()}');
    assert.ok(!out.includes('Date.now()'), `Date.now() not replaced: ${out}`);
    assert.ok(out.includes('0'), `expected 0 substitution in ${out}`);
  });

  test('balances unclosed braces', () => {
    const { _prepareJson, _balanceBraces } = loadInternals();
    const balanced = _balanceBraces('{"a":{"b":1}');
    const open = (balanced.match(/{/g) || []).length;
    const close = (balanced.match(/}/g) || []).length;
    assert.equal(open, close, `unbalanced: ${balanced}`);
  });
});

describe('_removeKey — strips noise keys', () => {
  test('removes ajaxUrlParams key and value', () => {
    const { _removeKey } = loadInternals();
    const out = _removeKey('{"ajaxUrlParams":"foo","keep":1}', 'ajaxUrlParams');
    assert.ok(!out.includes('ajaxUrlParams'), `key not removed: ${out}`);
    assert.ok(out.includes('keep'), `sibling key lost: ${out}`);
  });
});

describe('_balanceBraces', () => {
  test('appends missing closing braces', () => {
    const { _balanceBraces } = loadInternals();
    assert.equal(_balanceBraces('{{{'), '{{{}}}');
  });

  test('leaves balanced input unchanged', () => {
    const { _balanceBraces } = loadInternals();
    assert.equal(_balanceBraces('{"a":1}'), '{"a":1}');
  });
});

describe('_robustParse — repair + parse end-to-end', () => {
  test('parses already-valid JSON', () => {
    const { _robustParse } = loadInternals();
    assert.deepEqual(_robustParse('{"a":1,"b":[2,3]}'), { a: 1, b: [2, 3] });
  });

  test('parses nested valid JSON', () => {
    const { _robustParse } = loadInternals();
    const obj = { title: 'Widget', variants: [{ id: 1 }, { id: 2 }] };
    assert.deepEqual(_robustParse(JSON.stringify(obj)), obj);
  });
});

describe('_parseWindowJson — full pipeline on Amazon-style raw', () => {
  test('repairs + parses single-quoted unquoted-key blob', () => {
    const { _parseWindowJson } = loadInternals();
    const raw = "{title:'Acme Widget',price:19.99,inStock:true,}";
    const result = _parseWindowJson(raw);
    assert.equal(result.title, 'Acme Widget');
    assert.equal(result.price, 19.99);
    assert.equal(result.inStock, true);
  });

  test('handles nested variation-style structure', () => {
    const { _parseWindowJson } = loadInternals();
    const raw = "{dimensions:['Color','Size'],variationValues:{Color:['Red','Blue']},}";
    const result = _parseWindowJson(raw);
    assert.deepEqual(result.dimensions, ['Color', 'Size']);
    assert.deepEqual(result.variationValues.Color, ['Red', 'Blue']);
  });
});

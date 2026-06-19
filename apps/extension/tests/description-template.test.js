// description-template.test.js — tests template compiler functionality, section pruning, and sanitization
// Run: node --test apps/extension/tests/description-template.test.js

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeWindow, loadInto } from './helpers/load-global.js';

function loadHelper() {
  const win = makeWindow();
  loadInto(win, 'common/ebay-listing-api.js');
  return win.EbayListingApiHelper;
}

const DUMMY_TEMPLATE = {
  id: 'test-template',
  name: 'Test Template',
  htmlContent: `<div class="template">
  <h1>{{title}}</h1>
  <p>Brand: {{brand}}</p>
  <section class="description-sec">
    <h2>Description</h2>
    <div>{{description}}</div>
  </section>
  <section class="features-sec">
    <h2>Features</h2>
    <div>{{features}}</div>
  </section>
  <section class="specs-sec">
    <h2>Specifications</h2>
    <div>{{specifications}}</div>
  </section>
</div>`
};

describe('compileTemplate — placeholder replacement', () => {
  test('replaces basic placeholders', () => {
    const helper = loadHelper();
    const product = {
      title: 'Cool Widget',
      brand: 'Acme Corp',
      bulletPoints: ['Feature 1', 'Feature 2'],
      specifications: { Color: 'Red', Weight: '10g' }
    };
    const desc = 'This is a cool widget description.';
    const output = helper.compileTemplate(DUMMY_TEMPLATE, product, desc);

    assert.ok(output.includes('Cool Widget'));
    assert.ok(output.includes('Acme Corp'));
    assert.ok(output.includes('This is a cool widget description.'));
    assert.ok(output.includes('<li>Feature 1</li>'));
    assert.ok(output.includes('<li>Feature 2</li>'));
    assert.ok(output.includes('<strong>Color</strong>'));
    assert.ok(output.includes('Red</td>'));
  });

  test('strips section containing empty placeholder', () => {
    const helper = loadHelper();
    const product = {
      title: 'Cool Widget',
      brand: 'Acme Corp',
      bulletPoints: [], // Empty features
      specifications: { Color: 'Red' }
    };
    const desc = 'This is a cool widget description.';
    const output = helper.compileTemplate(DUMMY_TEMPLATE, product, desc);

    // Features section should be pruned entirely
    assert.ok(!output.includes('features-sec'));
    assert.ok(!output.includes('Features'));

    // Description and Specs sections should remain
    assert.ok(output.includes('description-sec'));
    assert.ok(output.includes('specs-sec'));
  });

  test('strips sanitization keywords and patterns', () => {
    const helper = loadHelper();
    const product = {
      title: 'Amazon Fire Tablet',
      brand: 'Amazon',
      bulletPoints: ['Has ASIN: B08XYZ', 'Buy at Walmart.com']
    };
    const desc = 'Prime members get free shipping. Visit https://amazon.com for info.';
    const output = helper.compileTemplate(DUMMY_TEMPLATE, product, desc);


    // Check that amazon.com and walmart.com are stripped
    assert.ok(!output.includes('amazon.com'));
    assert.ok(!output.includes('walmart.com'));

    // Check that ASIN keyword is stripped
    assert.ok(!output.includes('ASIN'));

    // Check that links are stripped
    assert.ok(!output.includes('https://'));
  });
});

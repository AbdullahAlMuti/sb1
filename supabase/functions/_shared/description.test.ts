// node --experimental-strip-types --test
import test from "node:test";
import assert from "node:assert/strict";

import { buildPrompt, renderSections, sanitize } from "./description.ts";
import type { DescriptionConfig } from "./description.ts";

const testConfig: DescriptionConfig = {
  sections: [
    { key: "title", type: "opening", order: 1, title: "Title", enabled: true, ai_guidance: "Format the title.", static_html: null },
    { key: "opening", type: "opening", order: 2, title: "Intro", enabled: true, ai_guidance: "Provide 1-2 sentences hook.", static_html: null },
    { key: "features", type: "features", order: 3, title: "✨ Key Features", enabled: true, ai_guidance: "Bullet points.", static_html: null },
    { key: "specifications", type: "specifications", order: 4, title: "📋 Specs", enabled: true, ai_guidance: "Create specs.", static_html: null },
    { key: "shipping", type: "shipping", order: 5, title: "📦 Shipping", enabled: true, ai_guidance: null, static_html: "<p>Fast shipping.</p>" },
    { key: "returns", type: "returns", order: 6, title: "✅ Returns", enabled: true, ai_guidance: null, static_html: "<p>30 days returns.</p>" }
  ],
  exclusion_rules: {
    strip_supplier_names: true,
    supplier_names: ["Amazon", "Walmart"],
    strip_product_ids: true,
    strip_prices: true,
    strip_urls: true,
    strip_images: true,
    blocked_terms: ["Prime", "Subscribe & Save"],
    banned_claim_phrases: ["lifetime warranty", "100% guaranteed"],
    vero_brands: ["Apple", "Nike"]
  },
  prompt_skeleton: "Generate eBay description for: {title}. Sections:\n{sections_guidance}\nRules: exclude {blocked_terms}.",
  output_format: "html_ebay_safe"
};

const testProduct = {
  title: "Super Nike Shoes - Best on Amazon",
  description: "High quality sneakers selling for $99.99 on Amazon.com. B012345678, UPC 123456789012.",
  bulletPoints: ["Very comfortable", "Available at local store"],
  brand: "Nike",
  category: "Athletic Shoes",
  price: "$99.99",
  condition: "New",
  features: ["Durable soles", "Prime comfort"],
  specifications: { "Size": "10", "Color": "Red" }
};

test("buildPrompt: interpolates variables and sections guidance", () => {
  const prompt = buildPrompt(testConfig, testProduct);

  assert.match(prompt, /Generate eBay description for: Super Nike Shoes - Best on Amazon/);
  assert.match(prompt, /Sections:/);
  assert.match(prompt, /- "title": Format the title/);
  assert.match(prompt, /- "opening": Provide 1-2 sentences hook/);
  assert.match(prompt, /Rules: exclude/);
  assert.match(prompt, /Prime/);
  assert.match(prompt, /Amazon/);
  assert.match(prompt, /Walmart/);
});

test("renderSections: generates correct HTML without nested block elements in p tags", () => {
  const aiJson = {
    opening: "Compelling hook for the shoes.",
    features: ["Super light", "Non-slip"],
    specifications: { "Material": "Mesh", "Weight": "200g" }
  };

  const html = renderSections(testConfig, aiJson, testProduct);

  // Checks structure
  assert.match(html, /<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">/);
  assert.match(html, /<h2 style="color: #333; margin: 15px 0;">Super Nike Shoes - Best on Amazon<\/h2>/);
  assert.match(html, /<p>Compelling hook for the shoes.<\/p>/);
  assert.match(html, /<li>Super light<\/li>/);
  assert.match(html, /<strong>Material<\/strong>/);
  assert.match(html, /<p>Fast shipping.<\/p>/);
  assert.match(html, /<p>30 days returns.<\/p>/);

  // Verify there are no nested <p><ul> or <p><table> or <p><h3> tags
  assert.doesNotMatch(html, /<p>[^<]*<ul/);
  assert.doesNotMatch(html, /<p>[^<]*<table/);
  assert.doesNotMatch(html, /<p>[^<]*<h3/);
});

test("sanitize: strips unwanted elements according to exclusion rules", () => {
  const dirtyHtml = `
    <div style="font-family: Arial, sans-serif;">
      <h2>Apple iPhone 15 Pro</h2>
      <p>Bought on Amazon for $999.99 with Prime shipping. Check out https://apple.com/iphone.</p>
      <img src="https://images.com/iphone.png" alt="iPhone" />
      <ul>
        <li>Brand new, 100% guaranteed.</li>
        <li>B0ABC12345, UPC 190198765432</li>
        <li>Perfect lifetime warranty.</li>
      </ul>
    </div>
  `;

  const cleanHtml = sanitize(dirtyHtml, testConfig.exclusion_rules);

  // Supplier names stripped
  assert.doesNotMatch(cleanHtml, /Amazon/i);
  assert.doesNotMatch(cleanHtml, /Walmart/i);

  // Blocked terms stripped
  assert.doesNotMatch(cleanHtml, /Prime/i);
  assert.doesNotMatch(cleanHtml, /Subscribe & Save/i);

  // VeRO Brands stripped
  assert.doesNotMatch(cleanHtml, /Apple/i);
  assert.doesNotMatch(cleanHtml, /Nike/i);

  // Prices stripped
  assert.doesNotMatch(cleanHtml, /\$999\.99/);

  // URLs stripped
  assert.doesNotMatch(cleanHtml, /https:\/\/apple\.com/);

  // Images stripped
  assert.doesNotMatch(cleanHtml, /<img/);

  // Product IDs (ASIN, UPC) stripped
  assert.doesNotMatch(cleanHtml, /B0ABC12345/);
  assert.doesNotMatch(cleanHtml, /190198765432/);

  // Banned claims stripped
  assert.doesNotMatch(cleanHtml, /100% guaranteed/i);
  assert.doesNotMatch(cleanHtml, /lifetime warranty/i);
});

test("sanitize: preserves newlines when outputFormat is plaintext", () => {
  const dirtyText = "Line 1\nLine 2\nLine 3  with   extra   spaces.";
  const cleanText = sanitize(dirtyText, testConfig.exclusion_rules, "plaintext");
  assert.equal(cleanText, "Line 1\nLine 2\nLine 3 with extra spaces.");
});


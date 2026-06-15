/**
 * Deterministic self-test for the blog prerender helpers. No DB, no build needed.
 * Run: node scripts/prerender-blog.selftest.mjs
 */
import assert from "node:assert";
import {
  addHeadingIds,
  renderPage,
  articleBodyHtml,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  buildSitemap,
  buildRss,
} from "./prerender-blog.mjs";

const TEMPLATE = `<!doctype html><html><head><meta charset="utf-8" /><title>SellerSuit</title><meta name="description" content="old" /></head><body><div id="root"></div></body></html>`;

const post = {
  slug: "amazon-to-ebay-dropshipping-guide-2026",
  title: "Amazon to eBay Dropshipping: The Complete 2026 Guide",
  excerpt: "How to source winning products on Amazon and list them on eBay.",
  content: "<h2>Why it works</h2><p>eBay has buyers.</p><h3>Good products</h3><p>Margins.</p>",
  cover_image_url: null,
  status: "published",
  published_at: "2026-06-14T10:00:00Z",
  updated_at: "2026-06-14T10:00:00Z",
  meta_description: "Step-by-step 2026 guide to Amazon-to-eBay dropshipping.",
  seo_title: null,
  canonical_url: null,
  og_image_url: null,
  reading_minutes: 11,
  faq: [{ q: "Is it allowed?", a: "Yes, with compliant suppliers." }],
  category: { slug: "amazon-to-ebay", name: "Amazon to eBay" },
  author: { name: "SellerSuit Team" },
};

const url = `https://www.sellersuit.com/blog/${post.slug}`;

// 1. heading ids
const withIds = addHeadingIds(post.content);
assert.match(withIds, /<h2 id="why-it-works">/, "h2 should get a slug id");
assert.match(withIds, /<h3 id="good-products">/, "h3 should get a slug id");

// 2. full page render
const jsonLd = [articleJsonLd(post, url), breadcrumbJsonLd(post, url), faqJsonLd(post)];
const html = renderPage(TEMPLATE, {
  title: `${post.title} | SellerSuit`,
  description: post.meta_description,
  canonical: url,
  image: "https://www.sellersuit.com/logo.png",
  type: "article",
  jsonLd,
  bodyHtml: articleBodyHtml(post),
});

assert.match(html, /<title>Amazon to eBay Dropshipping[^<]*\| SellerSuit<\/title>/, "title injected");
assert.ok(!/content="old"/.test(html), "default description replaced");
assert.match(html, /<link rel="canonical" href="https:\/\/www\.sellersuit\.com\/blog\//, "canonical injected");
assert.match(html, /property="og:type" content="article"/, "og:type article");
assert.match(html, /"@type":"Article"/, "Article JSON-LD present");
assert.match(html, /"@type":"BreadcrumbList"/, "Breadcrumb JSON-LD present");
assert.match(html, /"@type":"FAQPage"/, "FAQ JSON-LD present");
assert.match(html, /<div id="root">[\s\S]*<h1>Amazon to eBay/, "article content seeded into #root");
assert.match(html, /Frequently asked questions/, "faq rendered in body");

// 3. sitemap + rss
const sitemap = buildSitemap([post], [{ slug: "amazon-to-ebay", name: "Amazon to eBay" }]);
assert.match(sitemap, /<loc>https:\/\/www\.sellersuit\.com\/blog\/amazon-to-ebay-dropshipping-guide-2026<\/loc>/, "post in sitemap");
assert.match(sitemap, /<loc>https:\/\/www\.sellersuit\.com\/blog\/category\/amazon-to-ebay<\/loc>/, "category in sitemap");
assert.match(sitemap, /<lastmod>2026-06-14<\/lastmod>/, "lastmod present");

const rss = buildRss([post]);
assert.match(rss, /<title>Amazon to eBay Dropshipping[\s\S]*<\/title>/, "post in rss");
assert.match(rss, /<link>https:\/\/www\.sellersuit\.com\/blog\/amazon-to-ebay-dropshipping-guide-2026<\/link>/, "rss link");

console.log("✓ prerender-blog selftest passed (headings, page render, JSON-LD, sitemap, rss)");

/**
 * Build-time blog prerender + sitemap/RSS generator.
 *
 * Runs AFTER `vite build`. For every published post in Supabase it writes a static
 * `dist/blog/<slug>/index.html` whose <head> carries the right <title>/meta/canonical/
 * OG tags + JSON-LD, and whose <body> #root contains the full article HTML. Crawlers
 * and social scrapers (which don't execute JS) get real content immediately; the React
 * SPA still takes over for users on load (CSR render replaces #root).
 *
 * Also writes dist/blog/index.html (listing), category pages, sitemap.xml, rss.xml.
 *
 * Resilience: any failure to reach Supabase or render is logged and SKIPPED — it must
 * never break a production deploy. The SPA continues to serve the blog client-side.
 *
 * Vercel serving: apps/marketing/vercel.json runs `handle: filesystem` first, so these
 * prerendered files are served as static HTML before the SPA catch-all rewrite.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(APP_DIR, "../..");
const DIST = resolve(APP_DIR, "dist");
const SITE_URL = "https://www.sellersuit.com";

// ---- env loading (process.env on Vercel; root .env locally) ----
function loadEnv() {
  const out = { ...process.env };
  for (const f of [".env", ".env.local"]) {
    const p = resolve(REPO_ROOT, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && out[m[1]] === undefined) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

// ---- small html helpers ----
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function addHeadingIds(html) {
  const used = new Set();
  let i = 0;
  return html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_m, lvl, attrs, inner) => {
      i += 1;
      const text = inner.replace(/<[^>]+>/g, "").trim();
      let id = slugifyHeading(text) || `section-${i}`;
      while (used.has(id)) id = `${id}-${i}`;
      used.add(id);
      const hasId = /\bid\s*=/.test(attrs);
      return `<h${lvl}${hasId ? attrs : `${attrs} id="${id}"`}>${inner}</h${lvl}>`;
    },
  );
}

/** Inject head tags + #root body content into the built index.html template. */
function renderPage(template, { title, description, canonical, image, type, jsonLd, bodyHtml }) {
  const head = [
    `<title>${esc(title)}</title>`,
    description ? `<meta name="description" content="${esc(description)}" />` : "",
    canonical ? `<link rel="canonical" href="${esc(canonical)}" />` : "",
    `<meta property="og:title" content="${esc(title)}" />`,
    description ? `<meta property="og:description" content="${esc(description)}" />` : "",
    `<meta property="og:type" content="${esc(type || "website")}" />`,
    canonical ? `<meta property="og:url" content="${esc(canonical)}" />` : "",
    image ? `<meta property="og:image" content="${esc(image)}" />` : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    image ? `<meta name="twitter:image" content="${esc(image)}" />` : "",
    ...(jsonLd || []).map(
      (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`,
    ),
  ]
    .filter(Boolean)
    .join("\n    ");

  let html = template;
  // Replace the existing <title> (and the default description) then append our head.
  html = html.replace(/<title>[\s\S]*?<\/title>/i, "");
  html = html.replace(/<meta\s+name="description"[\s\S]*?\/>/i, "");
  html = html.replace(/<\/head>/i, `    ${head}\n  </head>`);
  // Seed crawler-visible content into #root.
  html = html.replace(
    /<div id="root"><\/div>/i,
    `<div id="root">${bodyHtml}</div>`,
  );
  return html;
}

function articleBodyHtml(post) {
  const cat = post.category;
  const author = post.author;
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  const faq =
    Array.isArray(post.faq) && post.faq.length
      ? `<section><h2>Frequently asked questions</h2>${post.faq
          .map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`)
          .join("")}</section>`
      : "";
  return `
    <article class="container" style="max-width:48rem;margin:0 auto;padding:6rem 1rem 3rem">
      ${cat ? `<a href="/blog/category/${esc(cat.slug)}">${esc(cat.name)}</a>` : ""}
      <h1>${esc(post.title)}</h1>
      <p>${author ? `By ${esc(author.name)} · ` : ""}${esc(date)} · ${esc(String(post.reading_minutes))} min read</p>
      ${post.cover_image_url ? `<img src="${esc(post.cover_image_url)}" alt="${esc(post.title)}" />` : ""}
      <div class="prose">${addHeadingIds(post.content || "")}</div>
      ${faq}
    </article>`;
}

function listBodyHtml(title, posts) {
  return `
    <main class="container" style="max-width:64rem;margin:0 auto;padding:6rem 1rem 3rem">
      <h1>${esc(title)}</h1>
      <ul>
        ${posts
          .map(
            (p) =>
              `<li><a href="/blog/${esc(p.slug)}">${esc(p.title)}</a>${
                p.excerpt ? ` — ${esc(p.excerpt)}` : ""
              }</li>`,
          )
          .join("\n        ")}
      </ul>
    </main>`;
}

function articleJsonLd(post, url) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: post.title,
    description: post.meta_description || post.excerpt || undefined,
    image: post.og_image_url || post.cover_image_url || undefined,
    author: { "@type": "Organization", name: post.author?.name || "SellerSuit" },
    publisher: {
      "@type": "Organization",
      name: "SellerSuit",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
  };
}

function breadcrumbJsonLd(post, url) {
  const items = [{ name: "Blog", url: `${SITE_URL}/blog` }];
  if (post.category)
    items.push({
      name: post.category.name,
      url: `${SITE_URL}/blog/category/${post.category.slug}`,
    });
  items.push({ name: post.title, url });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

function faqJsonLd(post) {
  if (!Array.isArray(post.faq) || !post.faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function writeHtml(routePath, html) {
  const dir = resolve(DIST, routePath.replace(/^\//, ""));
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "index.html"), html, "utf8");
}

function buildSitemap(posts, categories) {
  const staticRoutes = ["/", "/blog", "/about", "/contact", "/documentation"];
  const urls = [
    ...staticRoutes.map((p) => ({ loc: `${SITE_URL}${p === "/" ? "" : p}`, lastmod: null })),
    ...categories.map((c) => ({ loc: `${SITE_URL}/blog/category/${c.slug}`, lastmod: null })),
    ...posts.map((p) => ({
      loc: `${SITE_URL}/blog/${p.slug}`,
      lastmod: (p.updated_at || p.published_at || "").slice(0, 10) || null,
    })),
  ];
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function buildRss(posts) {
  const items = posts
    .slice(0, 50)
    .map(
      (p) =>
        `    <item>\n      <title>${esc(p.title)}</title>\n      <link>${SITE_URL}/blog/${esc(p.slug)}</link>\n      <guid>${SITE_URL}/blog/${esc(p.slug)}</guid>\n      ${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ""}\n      <description>${esc(p.excerpt || "")}</description>\n    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n    <title>SellerSuit Blog</title>\n    <link>${SITE_URL}/blog</link>\n    <description>eBay dropshipping guides, strategies, and tutorials.</description>\n${items}\n</channel></rss>\n`;
}

async function main() {
  const templatePath = resolve(DIST, "index.html");
  if (!existsSync(templatePath)) {
    console.warn("[prerender-blog] dist/index.html not found — run after vite build. Skipping.");
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[prerender-blog] Supabase env not set — skipping blog prerender (SPA still serves /blog).");
    return;
  }

  const template = readFileSync(templatePath, "utf8");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const select = `
    id, slug, title, excerpt, content, cover_image_url, status, published_at,
    seo_title, meta_description, canonical_url, og_image_url, reading_minutes, faq, updated_at,
    category:marketing_categories ( slug, name ),
    author:marketing_authors ( name )`;

  const { data: posts, error } = await supabase
    .from("marketing_posts")
    .select(select)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.warn("[prerender-blog] Supabase query failed — skipping:", error.message);
    return;
  }
  const list = posts || [];
  const { data: categories } = await supabase
    .from("marketing_categories")
    .select("slug, name, description")
    .order("sort_order", { ascending: true });
  const cats = categories || [];

  // Per-post pages
  for (const post of list) {
    const url = `${SITE_URL}/blog/${post.slug}`;
    const jsonLd = [articleJsonLd(post, url), breadcrumbJsonLd(post, url)];
    const faq = faqJsonLd(post);
    if (faq) jsonLd.push(faq);
    const html = renderPage(template, {
      title: `${post.seo_title || post.title} | SellerSuit`,
      description: post.meta_description || post.excerpt || "",
      canonical: post.canonical_url || url,
      image: post.og_image_url || post.cover_image_url || `${SITE_URL}/logo.png`,
      type: "article",
      jsonLd,
      bodyHtml: articleBodyHtml(post),
    });
    writeHtml(`/blog/${post.slug}`, html);
  }

  // Blog index
  writeHtml(
    "/blog",
    renderPage(template, {
      title: "SellerSuit Blog — eBay Dropshipping Guides & Tips",
      description:
        "Guides, strategies, and tutorials for eBay dropshipping: sourcing from Amazon and Walmart, product research, fees, and automation.",
      canonical: `${SITE_URL}/blog`,
      type: "website",
      jsonLd: [],
      bodyHtml: listBodyHtml("SellerSuit Blog", list),
    }),
  );

  // Category pages
  for (const c of cats) {
    const inCat = list.filter((p) => p.category?.slug === c.slug);
    writeHtml(
      `/blog/category/${c.slug}`,
      renderPage(template, {
        title: `${c.name} — SellerSuit Blog`,
        description: c.description || `${c.name} articles from the SellerSuit blog.`,
        canonical: `${SITE_URL}/blog/category/${c.slug}`,
        type: "website",
        jsonLd: [],
        bodyHtml: listBodyHtml(c.name, inCat),
      }),
    );
  }

  // sitemap + rss
  writeFileSync(resolve(DIST, "sitemap.xml"), buildSitemap(list, cats), "utf8");
  writeFileSync(resolve(DIST, "rss.xml"), buildRss(list), "utf8");

  console.log(
    `[prerender-blog] Wrote ${list.length} posts, ${cats.length} categories, sitemap.xml, rss.xml.`,
  );
}

// Pure helpers are exported for the self-test (scripts/prerender-blog.selftest.mjs).
export {
  esc,
  addHeadingIds,
  renderPage,
  articleBodyHtml,
  listBodyHtml,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  buildSitemap,
  buildRss,
};

// Only run the full prerender when invoked directly (not when imported by a test).
const isEntry =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntry) {
  main().catch((err) => {
    // Never fail the deploy because of blog prerendering.
    console.warn("[prerender-blog] Unhandled error — skipping:", err?.message || err);
  });
}

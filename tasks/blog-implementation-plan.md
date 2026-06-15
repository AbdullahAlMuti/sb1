# SellerSuit Marketing Blog — Analysis & Implementation Plan

> Goal: add a content-marketing blog to the **marketing site** (`apps/marketing`, sellersuit.com)
> that can rank on Google, modeled on how AutoDS runs theirs.

---

## Part 1 — How AutoDS runs their blog (teardown)

**Platform:** WordPress. Confirmed — their images are served from `wp-content/themes/autods/...`.
The blog lives at `autods.com/blog/` as a **subdirectory** of the main domain (important for SEO —
all link equity accrues to the root domain instead of a weaker subdomain).

**Authoring:** Yes — written from an admin panel. WordPress admin (Gutenberg editor). Posts have named
human authors (e.g. "Caterina Francisca") with author bylines and bio pages. They very likely use
AI-assisted drafting + human editing given the volume and consistency.

**Content style:**
- Long-form: individual posts run **5,000–6,000 words** ("24 minutes read").
- Organized into ~8–10 evergreen categories: *Dropshipping Tips & Strategies, Niches, Product Finding
  & Best Sellers, Suppliers & Marketplaces, Success Stories, Marketing, Print on Demand, AI Shopping.*
- Every post: category tag, byline, read-time, featured image, table of contents (anchor links),
  H2/H3 hierarchy, 25+ internal links, embedded images/infographics, YouTube embeds, and a dedicated
  **FAQ** section at the end.
- Heavily conversion-oriented: sticky CTA, in-content "Try for $1" banners, pull-out boxes — every
  article funnels to signup.

**SEO — yes, aggressively:**
- URL pattern: `/blog/{category}/{slug}/` — keyword-rich, hierarchical.
- Title pattern: keyword + **year** ("How To Start Dropshipping With Temu In **2026**") — captures
  "current year" searches and signals freshness.
- Long-form depth = covers full search intent for a keyword (one article ranks for hundreds of
  long-tail variants).
- Structured data: Article, Breadcrumb, and FAQ schema (FAQ schema → rich results / "People also ask").
- Internal linking builds **topical authority** clusters (pillar + supporting posts).
- Technical: WordPress + CDN = fast static-ish HTML, XML sitemaps, clean crawlability.

**Can SellerSuit rank on Google?** **Yes — realistically, but it's a 6–12 month compounding play, not
instant.** It's a competitive niche (AutoDS, AutoDS competitors, eBay's own help content). What makes it
winnable:
- A narrower, sharper focus than AutoDS — **eBay dropshipping specifically** (Amazon→eBay, Walmart→eBay,
  eBay listing optimization, eBay fees/VeRO/policy). Win the eBay sub-niche before going broad.
- Topical-authority clusters (pillar pages + supporting articles, densely interlinked).
- Genuinely useful, long-form, well-structured content with correct technical SEO.
- Consistency: 4–8 quality posts/month for 6+ months.
- **Non-negotiable: server-rendered HTML.** (See Part 3 — this is the one place our current stack
  would fail by default.)

Expect: first impressions in ~4–8 weeks, meaningful long-tail traffic in ~3–6 months, competitive
head-terms in ~9–12 months.

---

## Part 2 — What already exists in this repo (and what it is NOT)

There is already a `blog_posts` table + `blog_generation_settings` table + a
`supabase/functions/generate-blog-post/index.ts` Edge Function.

**⚠️ This is NOT the company marketing blog.** It is a **per-user SaaS feature**: it lets *customers*
auto-generate affiliate Amazon-review blog posts for *their own* listings. Evidence: every row is keyed
by `user_id` + `listing_id`, with `affiliate_link`, `amazon_asin`, `product_price`. We must **not**
reuse this table for the company blog — different owner, different access model, different lifecycle.

**Decision:** the marketing blog gets its **own** table (`marketing_posts`) and its own admin surface.
The existing AI generation code is still useful as a *reference/borrowable pattern* (JSON-structured
AI output → title/meta/excerpt/keywords/HTML), and the Lovable AI gateway is already wired.

### Current marketing-app facts that shape the plan
- `apps/marketing` = Vite + React 18 SPA, `react-router-dom` (`BrowserRouter`), deployed on **Vercel**.
- **Pure client-side rendering.** `index.html` ships static meta only; all content is JS-rendered.
  → A CSR blog gets weak indexing and **zero** social/OG link previews (crawlers for OG don't run JS).
  This is the single most important thing to fix.
- Already has **`@tailwindcss/typography`** installed → `prose` styling for article bodies is ready.
- Config-driven content pattern (`src/config/siteConfig.ts`, `themeConfig.ts`, `types.ts`).
- `@supabase/supabase-js` already a dependency; shared `@repo/*` packages available.
- Has `public/robots.txt` (no sitemap reference yet) and SPA `_redirects` / `vercel.json` rewrite.
- `apps/admin` (port 3002) is a full admin SPA with ~30 pages — natural home for the post editor.

---

## Part 3 — The one critical architecture decision: SEO delivery

A blog on a pure CSR SPA **will not rank competitively**. We must serve real HTML (article text + unique
per-page `<title>`/meta/canonical/OG + JSON-LD) on first response. Options:

| Option | How | SEO | Publish latency | Effort/Risk |
|---|---|---|---|---|
| **A. Build-time SSG** (recommended) | Adopt `vite-react-ssg` for `apps/marketing`; blog slugs fetched from Supabase at build; each post → static `/blog/{slug}/index.html` with meta+JSON-LD. "Publish" in admin triggers a **Vercel Deploy Hook** rebuild (ISR-like). | Excellent (static HTML, identical to WordPress output) | ~1–2 min (rebuild) | Medium — SSG refactor of marketing entry |
| B. On-demand SSR | Vercel serverless/edge function SSRs `/blog/*` per request. | Excellent + instant fresh | Instant | Higher — hand-rolled SSR in a Vite SPA |
| C. Next.js migration | Port marketing to Next (SSG/ISR). | Best long-term | Instant (ISR) | Highest — full app migration |
| D. CSR + react-helmet only | Tags injected client-side. | Poor (no OG previews, slow index) | Instant | Lowest — **rejected** |

**Recommendation: Option A.** It produces WordPress-equivalent static HTML, upgrades SEO for the *whole*
marketing site (not just the blog) as a bonus, and stays on the existing Vite/Vercel stack. The only
tradeoff — a ~1–2 min publish delay — is irrelevant for a blog. If instant publish ever matters, layer
B onto just the blog routes later.

---

## Part 4 — Recommended architecture

```
Authoring (admin)            Storage (Supabase)              Delivery (marketing site)
─────────────────            ──────────────────              ─────────────────────────
apps/admin                   marketing_posts (table)         apps/marketing (vite-react-ssg)
  AdminBlog.tsx      ──────►   + marketing_categories   ◄──── build: fetch published posts
  - list/search                + marketing_authors            → /blog                (index)
  - rich editor (MDX/HTML)     RLS: admin write,              → /blog/{category}     (category)
  - AI "draft" button            public read published        → /blog/{slug}          (post, static)
  - SEO fields                                                 → per-page meta + JSON-LD
  - publish/schedule         Storage bucket: blog-images       → /sitemap.xml, /rss.xml
        │                                                       → /blog/{slug}/index.html (prerendered)
        └── Publish ──► Edge fn ──► Supabase ──► Vercel Deploy Hook ──► rebuild ──► live
```

**Authoring model (recommended): admin-panel CMS** (matches AutoDS / what you asked about). Non-developers
write posts in `apps/admin`. Content stored as **MDX or sanitized HTML** in Supabase. Optional AI
"generate draft" button reuses the existing Lovable gateway pattern.
*(Lower-effort alternative if only developers will ever write: MDX files committed in-repo. Faster to
ship, but no non-dev authoring and no "admin panel" — not recommended given your goal.)*

### Data model — `marketing_posts`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| slug | text unique | URL slug, e.g. `amazon-to-ebay-dropshipping-guide` |
| title | text | H1 / `<title>` base |
| excerpt | text | list + meta description fallback |
| content | text | MDX or sanitized HTML body |
| cover_image_url | text | featured image (Supabase Storage) |
| category_id | uuid fk | → marketing_categories |
| author_id | uuid fk | → marketing_authors (name, avatar, bio) |
| status | text | `draft` \| `scheduled` \| `published` |
| published_at | timestamptz | drives ordering + scheduling |
| seo_title | text | overrides title in `<title>` |
| meta_description | text | 150–160 chars |
| canonical_url | text | optional |
| og_image_url | text | social card |
| keywords | text[] | |
| reading_minutes | int | computed on save |
| faq | jsonb | `[{q,a}]` → FAQ JSON-LD |
| created_at / updated_at | timestamptz | |

Plus `marketing_categories` (name, slug, description) and `marketing_authors` (name, slug, avatar_url, bio).
**RLS:** public `SELECT` only where `status='published'`; insert/update gated to admin role.

---

## Part 5 — Phased task breakdown

### Phase 0 — Foundations (decisions + scaffolding)
- [ ] Confirm the 3 decisions in Part 6 (authoring model, SEO delivery, MVP scope).
- [ ] Migration: create `marketing_posts`, `marketing_categories`, `marketing_authors` + RLS + indexes
      (`slug`, `status`, `published_at`). Seed 3–4 categories (eBay Dropshipping, Product Research,
      Amazon→eBay, Seller Tips).
- [ ] Storage bucket `blog-images` (public read) for cover/inline images.
- [ ] Regenerate `packages/types/src/supabase.ts`.

### Phase 1 — Public blog on the marketing site (the SEO-critical part)
- [ ] Adopt `vite-react-ssg` in `apps/marketing` (convert entry to its `createRoot`/routes API);
      verify all existing routes still build to static HTML.
- [ ] Routes + pages: `/blog` (index, paginated), `/blog/category/{slug}`, `/blog/{slug}` (post).
- [ ] Build-time data: fetch published posts from Supabase to generate static paths.
- [ ] `BlogPost` page: `prose` body, ToC from H2/H3, byline + date + read-time, cover image,
      related posts, in-content + end CTA, FAQ accordion.
- [ ] Per-page SEO head (build a small `<Seo>` component): unique `<title>`, meta description,
      canonical, OG/Twitter tags, and **JSON-LD** (`Article`, `BreadcrumbList`, `FAQPage`).
- [ ] Generate `sitemap.xml` (+ blog URLs) and `rss.xml` at build; reference sitemap in `robots.txt`.
- [ ] Add "Blog" to `Navbar` + `Footer` (via `siteConfig`).
- [ ] Markdown/MDX → HTML render pipeline with **DOMPurify** sanitization (already a dep) for
      stored HTML; syntax-safe, lazy-loaded images, `loading="lazy"`.

### Phase 2 — Admin authoring (the "written from admin panel" part)
- [ ] `apps/admin`: `AdminBlog.tsx` (list/search/filter by status), `AdminBlogEditor.tsx`.
- [ ] Editor: title, slug (auto from title, editable), category, author, cover image upload,
      body editor (rich text or markdown w/ live preview), SEO fields, FAQ repeater,
      status + schedule (`published_at`), Save draft / Publish.
- [ ] Reuse the existing AI pattern: "Generate draft" → new `generate-marketing-post` Edge Function
      (separate from the user-facing `generate-blog-post`) returning structured title/meta/excerpt/
      keywords/HTML for the editor to refine.
- [ ] On Publish: set `status='published'` + `published_at`, then call a **Vercel Deploy Hook** to
      rebuild the marketing site (ISR-like freshness).

### Phase 3 — Growth & polish
- [ ] Newsletter capture (email → Supabase table / ESP) on blog index + post footer.
- [ ] Author pages `/blog/author/{slug}`; category landing copy for topical authority.
- [ ] "Popular / related" logic, breadcrumb UI, social share buttons.
- [ ] Analytics events (reuse `src/lib/analytics.ts`) for post views + CTA clicks.
- [ ] Submit sitemap to Google Search Console; set up indexing monitoring.
- [ ] (Optional) On-demand SSR for `/blog/*` if instant publish is ever needed.

---

## Part 6 — Decisions (LOCKED 2026-06-14)

1. **Authoring model — Admin-panel CMS.** Posts live in Supabase (`marketing_posts`), authored in
   `apps/admin` with a rich editor + optional AI draft button. Non-devs can publish.
2. **SEO delivery — `vite-react-ssg` build-time SSG + Vercel Deploy Hook on publish.**
3. **MVP scope — Phase 1 + 2 together:** public SEO-ready blog **and** the admin editor in the first cut.

### Execution order (ready to build)
1. **Phase 0** — write migration SQL (`marketing_posts` / `marketing_categories` / `marketing_authors`
   + RLS + indexes) as a file in `supabase/migrations/`; create `blog-images` bucket; regen types.
   *(Do not apply to the production Supabase project until explicitly approved.)*
2. **Phase 1** — adopt `vite-react-ssg`; build `/blog`, `/blog/category/{slug}`, `/blog/{slug}`;
   `<Seo>` + JSON-LD; sitemap/RSS; nav/footer links.
3. **Phase 2** — `AdminBlog.tsx` + editor; `generate-marketing-post` Edge Function; publish → deploy hook.

---

## Part 7 — Shipped (2026-06-14)

Phases 0–2 are **implemented, built, and verified**:

**Phase 0 — DB (applied to prod `ojxzssooylmydystjvdo`)**
- Migrations `20260614040000_create_marketing_blog.sql` + `20260614041000_harden_blog_images_bucket.sql`:
  `marketing_posts` / `marketing_categories` / `marketing_authors` + RLS (public reads published,
  admin manages), indexes, `blog-images` public bucket, seeded 4 categories + 1 author.
- Shared types: `packages/types/src/marketing-blog.types.ts` (exported from `@repo/types`).

**Phase 1 — Public blog (apps/marketing) — browser-verified**
- Routes `/blog`, `/blog/category/:slug`, `/blog/:slug`; pages + `BlogCard` / `ArticleBody` /
  `BlogCta`; `prose` styling (added `@tailwindcss/typography` to the marketing Tailwind config).
- `useSeo` head manager + JSON-LD (Article + BreadcrumbList + FAQPage), auto ToC from H2/H3.
- Build-time SSG: `scripts/prerender-blog.mjs` (wired into `build`) writes static
  `dist/blog/**/index.html` + `sitemap.xml` + `rss.xml`; `robots.txt` references the sitemap.
  Resilient — a missing table/DB never fails the deploy. Self-test: `prerender-blog.selftest.mjs`.
- Nav + footer "Blog" links via `siteConfig`.

**Phase 2 — Admin authoring (apps/admin) — build-verified**
- `AdminBlog` (list) + `AdminBlogEditor` (full editor: content w/ preview, SEO, FAQ repeater,
  cover upload, schedule, AI draft) + `lib/marketing-blog.ts`; sidebar "Blog" item; routes wired.
- Edge Functions **deployed (ACTIVE)**: `generate-marketing-post` (admin-gated AI draft via Lovable
  gateway) + `trigger-marketing-deploy` (admin-gated Vercel Deploy Hook trigger). Registered in
  `config.toml`.

### ⚙️ One manual setup step (for instant auto-publish)
Create a **Vercel Deploy Hook** on the marketing project and store its URL as a Supabase secret:
`VERCEL_DEPLOY_HOOK_URL`. Then clicking **Publish** in admin rebuilds the site (~1–2 min) so the new
post is statically prerendered and live. Until it's set, publishing still saves the post; it just goes
live on the next deploy (the editor shows a non-blocking notice). Also ensure the marketing Vercel
project has `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` at build time (the prerender reads them).

### Remaining (Phase 3, optional growth)
Newsletter capture, author pages, social share, GSC sitemap submission, on-demand SSR (only if instant
publish is ever needed).

## Appendix — SEO checklist baked into the build (so we don't bolt it on later)
- Subdirectory `/blog` on the apex domain (not a subdomain). ✅ already same app/domain.
- Unique `<title>` (≤60 chars) + meta description (150–160) per post.
- Canonical URL per post; self-referencing.
- OG + Twitter card tags (server-rendered) for rich link previews.
- JSON-LD: `Article` + `BreadcrumbList` + `FAQPage`.
- Clean slugs `/blog/{slug}`; 301s if slugs ever change.
- XML sitemap + RSS; sitemap referenced in `robots.txt`; submit to GSC.
- Internal linking between related posts (topical clusters).
- `loading="lazy"` images, sized images, WebP where possible (Core Web Vitals).
- Year-in-title pattern for "current year" queries, kept fresh via re-publish.
- H1 once per page; logical H2/H3; descriptive alt text.

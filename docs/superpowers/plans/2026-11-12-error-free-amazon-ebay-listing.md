# Error-Free Amazon → eBay Listing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Amazon page থেকে title / picture / price / variation নির্ভুল scrape হবে, extension UI ভাঙবে না, eBay-তে সব required field সহ listing তৈরি হবে, আর সেই listing user dashboard-এ সঠিক status ও দাম নিয়ে দেখাবে — single এবং bulk দুই ক্ষেত্রেই।

**Architecture:** নতুন কোনো pipeline না — বিদ্যমান pipeline (scraper v2 → `SSPricingApply` → `adaptProduct` → `SellerSuitUploader.run` → `create-listing` / `sync-listing`) এর প্রতিটা ধাপে "অনুমান করে মান বসানো" বন্ধ করে "না জানলে থামো ও user-কে দেখাও" করা হবে। Panel-এ একটা readiness checklist যোগ হবে যেটা upload-এর আগে সব শর্ত দেখায়।

**Tech Stack:** Vanilla JS (MV3 extension), `node:test`, Deno Edge Functions, Postgres migrations, React dashboard।

**Spec:** `docs/listing-audit-2026-11-12.md` (আগের audit) + এই file-এর "Research findings"।

## Research findings (code পড়ে পাওয়া; live browser-এ এখনও যাচাই হয়নি)

**Scrape**
- Variant-এর দাম না পেলে parent-এর দাম বসে; parent-ও না থাকলে **$999** বসে — `amazon-scraper-v2.js:858,986`
- 24টার বেশি variant হলে বাকিগুলো যাচাই ছাড়া base price পায় (`IFRAME_CAP = 24`) — `:952`
- Price selector priority কাজ করে না, list price / per-unit price ধরতে পারে — `:298-318`
- Variant ছবি "প্রথম শব্দ মিললেই" match — "Light Blue" পেতে পারে "Light Green"-এর ছবি — `:565`
- Description শুধু `#productDescription` থেকে; A+ content নেই। Shipping শুধু text, amount নেই। `$` সবসময় USD।

**Amazon page UI**
- Panel Shadow DOM ছাড়া সরাসরি `document.body.prepend()` হয় — Amazon-এর নিজের CSS panel-এর ভেতরে ঢোকে, page layout ধাক্কা খায় — `amazon_injector.js:392`
- `ui/panel.css` দুইবার load হয় (manifest `css` + inline `<style>`) — `manifest.json`, `amazon_injector.js:374`
- `amazon_injector.js` 5,552 লাইন, ভেতরে পুরনো দ্বিতীয় scraper path আছে (`SCRAPE_PRODUCT_DATA` দুইবার handle: `:1776`, `:5181`)

**eBay listing**
- Extension eBay-তে **draft** বানায়, publish করে না। Single-এ user নিজে "List it" চাপে; **bulk-এ draft তৈরি হলেই item "listed" দেখায়** — `ebay-listing-api.js:1600-1609`
- `check-vero` ও `check-duplicate` Edge Function repo-তে **নেই**; দুটোই fail করলে listing চলতে দেয় — `:1035`, `message-router.js:925`
- Required item specific খালি থাকলে option list-এর **প্রথমটা** বসে, নয়তো "Does not apply"; Brand → "Unbranded" — `:314-325`
- Category = title search-এর প্রথম leaf, user-কে দেখানো হয় না — `:1550-1554`
- Item location সবসময় "Multiple locations"; shipping/return/payment policy set বা verify হয় না; description template-এ "30-Day Returns Policy" লেখা থাকে — `:383`, `:1144`
- ছবি সর্বোচ্চ 12টা; কিছু ছবি upload fail করলে নীরবে বাদ — `:996`, `:358`

**Dashboard**
- Publish শনাক্ত হয় eBay success page থেকে; `draftId` না পেলে "সবচেয়ে নতুন staged draft" ধরে নেয় — ভুল listing-এ item ID বসতে পারে — `ebay_success.js:49-61`
- Profit = `ebay_price − amazon_price` (fee বাদ ছাড়া) — `Listings.tsx:992`; draft গুলো stats-এ গোনা হয় না — `:465`
- Dashboard-এ দাম edit করলে শুধু DB বদলায়, eBay না — `Listings.tsx:917`

**একটা policy বাস্তবতা (code দিয়ে ঠিক হবে না):** eBay-র dropshipping policy অন্য retailer/marketplace (যেমন Amazon) থেকে কিনে সরাসরি buyer-কে পাঠানো অনুমোদন করে না। এই plan listing-এর *বাকি সব* দিক policy-সম্মত করবে (VeRO, সঠিক item specifics, category, policy, location), কিন্তু business model-এর এই ঝুঁকি থেকে যায়। eBay-র বর্তমান policy page দেখে নিজে নিশ্চিত হয়ে নিন।

## Global Constraints

- Edit শুধু `apps/extension/`-এ; `apps/web/public/chrome_extension/` কখনো হাতে না।
- কোনো দাম, stock, item specific বা category অনুমান করে বসানো যাবে না — না জানলে block বা user-কে জিজ্ঞেস।
- eBay title ≤ 80 character (`_enforceEbayTitle`)।
- CAPTCHA error সবসময় propagate; v1-এ নীরব retry না।
- `pricing-core.js` বদলালে `_shared/` copy script দিয়ে sync, হাতে না।
- প্রতিটা task: failing test লেখা → fail দেখা → implement → `cd apps/extension && npm test` সব pass → commit।
- Database migration live-এ apply করার আগে user-এর অনুমতি।

## Review Focus

1. 50+ variant-এর product — সব variant-এর নিজের দাম, নয়তো স্পষ্টভাবে "unverified" ও upload থেকে বাদ।
2. Buybox ছাড়া page ("See all buying options" / Currently unavailable) — দাম 0/999 না হয়ে পরিষ্কার error।
3. Scan চলাকালে user অন্য variant-এ click করলে বা tab বদলালে — ভুল ASIN-এর দাম না বসা।
4. eBay category-তে এমন required specific যার মান Amazon-এ নেই — নীরবে ভুল মান না বসে user-কে দেখানো।
5. eBay listing তৈরি হলো কিন্তু dashboard sync fail — পরে নিজে থেকে retry হয়ে dashboard-এ আসা।

---

## Phase 0 — Live baseline (আগে দেখা, পরে বদলানো)

### Task 0: Real Amazon page-এ বর্তমান অবস্থা record করা
**Files:** Create `apps/extension/tests/fixtures/live/README.md`, `docs/listing-live-baseline.md`
- [ ] `npm run prepare:dev` → `dist/extension-dev/` Chrome-এ load (user-এর Chrome লাগবে)
- [ ] 6 ধরনের page-এ scan: single product, classic twister, inline twister, 30+ variant, unavailable, deal/coupon price
- [ ] প্রতিটার জন্য: panel screenshot, scraped JSON, console error — baseline doc-এ সত্যিকারের দাম/ছবি সংখ্যার পাশে
- [ ] যে page-এ ফল ভুল, তার HTML `tests/fixtures/live/` -এ fixture হিসেবে save (পরের task-এর test এগুলো ব্যবহার করবে)

**Done when:** প্রতিটা page type-এর জন্য "সঠিক / ভুল + কী ভুল" লেখা আছে।

## Phase 1 — Scrape নির্ভুল করা

### Task 1: দাম কখনো বানানো হবে না
**Files:** Modify `content_scripts/amazon-scraper-v2.js:853-992`, `common/pricing-apply.js:153-172`, `common/ebay-listing-api.js:925,960-963`; Test `tests/amazon-scraper-v2.test.js`, `tests/pricing-apply.test.js`, `tests/adapt-product.test.js`
**Interfaces — Produces:** প্রতিটা variant-এ `priceVerified: boolean`; যাচাই না হলে `price: null`। Product-এ `unverifiedVariantCount: number`।
- [ ] Test: twister আছে, buybox নেই → কোনো variant-এর `price` 999 বা parent price না, `priceVerified === false`
- [ ] Test: `applyWithRules` `price: null` variant-কে price করে না, parent-এর দাম ধার নেয় না
- [ ] Test: `adaptProduct` unverified variant বাদ দেয়; সব বাদ গেলে `throw` (পুরনো list-এ ফেরত না)
- [ ] Implement, `npm test`, commit

### Task 2: Buybox price selector
**Files:** Modify `amazon-scraper-v2.js:279-332`; Test `tests/amazon-scraper-v2.test.js`
- [ ] Test: DOM-এ strikethrough list price (`.a-text-price`) আগে, `.priceToPay` পরে → `.priceToPay`-এর দাম
- [ ] Test: per-unit price (`$0.50/Count`) উপেক্ষা
- [ ] Test: buybox container-এর বাইরের `.a-price` (sponsored widget) উপেক্ষা
- [ ] Implement: selector গুলো priority order-এ একটা একটা করে, buybox root-এর ভেতরে সীমাবদ্ধ; commit

### Task 3: সব variant যাচাই (24-এর cap সরানো)
**Files:** Modify `amazon-scraper-v2.js:600-643,949-975`; Test একই
**Interfaces — Consumes:** Task 1-এর `priceVerified`
- [ ] Test: 40 variant, iframe stub প্রতিটার দাম দেয় → 40টাই `priceVerified: true`
- [ ] Test: মোট time budget (90s) পার হলে বাকিগুলো `priceVerified: false`, scan fail না
- [ ] Implement: concurrency 3, per-variant ও মোট budget; commit

### Task 4: ছবি
**Files:** Modify `amazon-scraper-v2.js:454-489,545-574`, `common/ebay-listing-api.js:996`; Test একই + `tests/adapt-product.test.js`
- [ ] Test: "Light Blue" variant "Light Green"-এর ছবি পায় না (exact, case-insensitive match; না মিললে `img: undefined`)
- [ ] Test: প্রতিটা color-এর সব ছবি `variantImages[color]`-এ; main list-এ duplicate নেই
- [ ] Test: `adaptProduct` 24টা পর্যন্ত ছবি দেয়
- [ ] Test (`ebay-listing-api`): কিছু ছবি upload fail → result-এ `imagesFailed` সংখ্যা, নীরব না
- [ ] Implement, commit

### Task 5: Title / description / brand / shipping / currency
**Files:** Modify `amazon-scraper-v2.js:344,402-408,498-525`; Test একই
**Interfaces — Produces:** `shippingCost: number|null`, `currency` (domain থেকে), `specs.Brand`
- [ ] Test: `#productDescription` খালি, A+ (`#aplus`) আছে → description A+ text থেকে
- [ ] Test: amazon.ca-তে `$` → `CAD`; non-USD হলে `SSPricingApply` reason `unsupported_currency` দিয়ে price করে না
- [ ] Test: "$6.99 delivery" → `shippingCost: 6.99`; "FREE delivery" → `0`; না পেলে `null`
- [ ] Test: `#bylineInfo` brand `specs.Brand`-এ আসে
- [ ] Implement; `pricing-apply.js:88`-এ shipping পাঠানো; commit

## Phase 2 — Amazon page-এ extension UI

### Task 6: Panel-কে Shadow DOM-এ আলাদা করা
**Files:** Modify `content_scripts/amazon_injector.js:360-395`, `manifest.json`, `manifest.dev.json`, `manifest.prod.json` (Amazon entry থেকে `css` বাদ), `ui/panel.css`; Test `tests/panel-architecture.test.js`
**Interfaces — Produces:** `window.SSPanelHost.mount(panelEl): ShadowRoot` — `#ss-root` host, `position: fixed`, body flow-এর বাইরে
- [ ] Test: mount-এর পর `document.body.firstElementChild` Amazon-এর নিজের element-ই থাকে (layout shift নেই)
- [ ] Test: panel CSS একবারই load হয়, shadow root-এর ভেতরে
- [ ] Test: manifest-এর Amazon content script-এ `css` নেই
- [ ] Implement; `body.ss-…` selector গুলো `:host` -এ বদল; commit
- [ ] Phase 0-র 6টা page-এ আবার screenshot — আগের সাথে তুলনা

### Task 7: Panel-এর সব অবস্থা
**Files:** Modify `sidepanel/panel-main.js`, `common/panel-extended.js`; Test `tests/panel-architecture.test.js`
- [ ] Test: প্রতিটা অবস্থার জন্য নির্দিষ্ট বার্তা ও action button — scanning, CAPTCHA, logged out, no pricing rule, unsupported page, N variants unverified, scan error
- [ ] Test: URL/ASIN বদলালে পুরনো product-এর data panel-এ থাকে না
- [ ] Implement, commit

### Task 8: Readiness checklist (upload-এর আগে)
**Files:** Create `common/listing-readiness.js`; Modify `sidepanel/panel-main.js`, `common/ebay-listing-api.js:1386-1433`; Test Create `tests/listing-readiness.test.js`
**Interfaces — Produces:** `SSListingReadiness.check(product): { ready: boolean, items: Array<{ key, ok, message }> }` — keys: `title`, `images`, `price`, `variants`, `specifics`, `vero`, `duplicate`, `auth`
- [ ] Test: title > 80 → `title.ok === false`; ছবি 0 → block; unverified variant → সংখ্যাসহ warning; সব ঠিক → `ready: true`
- [ ] Test: `SellerSuitUploader.run` `ready === false` হলে upload শুরু করে না (bulk-এ item fail, কারণসহ)
- [ ] Implement; panel-এ list দেখানো, "List" button `ready` না হলে disabled; commit

## Phase 3 — eBay-তে সঠিক listing

### Task 9: হারানো দুটো server check তৈরি
**Files:** Create `supabase/functions/check-duplicate/index.ts`, `supabase/functions/check-vero/index.ts`; Modify `supabase/config.toml`; Test Create `supabase/functions/check-duplicate/index.test.ts`
**Interfaces — Produces:** `check-duplicate` `{ asin }` → `{ duplicate: boolean, listing?: { id, created_at, status } }` (user-scoped); `check-vero` `{ title }` → `{ flagged: boolean, matches: Array<{ brand, risk, category }> }`
- [ ] Test: একই user-এর একই ASIN → `duplicate: true`; অন্য user-এর → `false`
- [ ] `check-vero`-র brand list কোথা থেকে আসবে — **user-এর সিদ্ধান্ত দরকার** (নিজের table, না বাইরের source)
- [ ] Client: check নিজে fail করলে (network/500) single mode-এ user-কে জানানো, bulk-এ item fail — নীরবে চালিয়ে যাওয়া না; commit

### Task 10: Item specifics অনুমান বন্ধ
**Files:** Modify `common/ebay-listing-api.js:270-326`; Test Create `tests/ebay-item-specifics.test.js`
**Interfaces — Produces:** `resolveAttributes(specs, attributeList): { attributes, unresolved: string[] }`
- [ ] Test: required attr-এর মান Amazon spec-এ নেই → `unresolved`-এ, option-এর প্রথমটা বসে না
- [ ] Test: Amazon brand আছে → Brand সেই মান; নেই → `unresolved` ("Unbranded" নিজে থেকে না)
- [ ] Test: UPC/EAN/MPN → "Does not apply" অনুমোদিত
- [ ] Implement; `unresolved` readiness checklist-এ (`specifics`) যায়; single-এ user পূরণ করে, bulk-এ item fail; commit

### Task 11: Category, policy, location
**Files:** Modify `common/ebay-listing-api.js:182-200,376-395,1126-1160,1542-1555`, `common/storage.js`; Web: `apps/web/src/pages/dashboard/Settings.tsx`; Test `tests/adapt-product.test.js`
**Interfaces — Produces:** user setting `listingDefaults: { itemLocation: { country, postalCode, cityState }, returnText: string|null }`
- [ ] Test: নির্বাচিত category (id + নাম) upload result ও panel summary-তে থাকে
- [ ] Test: `itemLocationCityState` user setting থেকে; setting না থাকলে readiness block
- [ ] Test: description template-এ return বাক্য শুধু `returnText` থাকলে
- [ ] Draft save-এর পর eBay response-এ shipping/return policy আছে কিনা পড়া; না থাকলে result-এ `missingPolicies` — **live-এ response shape যাচাই দরকার**
- [ ] Implement, commit

### Task 12: বিপজ্জনক fallback সরানো
**Files:** Modify `common/ebay-listing-api.js:399-401,635,1444`; Test `tests/adapt-product.test.js`
- [ ] Test: দাম নেই → `throw`, `0.99` না
- [ ] Test: ASIN `B08KT2Z93D` সাধারণ upload path-এ যায়; mock শুধু `product.mockUpload === true` ও dev build-এ
- [ ] Implement, commit

### Task 13: Bulk-এ সত্যি status
**Files:** Modify `background/bulk-core.js:13,172-179`, `background/listing-runner.js:299-306,390-397`; Web `apps/web/src/pages/dashboard/BulkLister.tsx`; Test `tests/bulk-core.test.js`
- [ ] Test: draft তৈরি হলে status `draft_created`, `listed` না (migration: `bulk_job_items.status` CHECK-এ নতুন মান)
- [ ] Test: scrape timeout-এর বার্তায় "CAPTCHA" নেই, job pause হয় না; আসল CAPTCHA-তে হয়
- [ ] Bulk-এ draft-এর পর auto-publish হবে, নাকি draft-ই থাকবে — **user-এর সিদ্ধান্ত দরকার** (default: draft, dashboard-এ "Review & publish")
- [ ] Implement, commit

## Phase 4 — Dashboard-এ নির্ভুল দেখানো

### Task 14: Sync কখনো হারাবে না
**Files:** Create `apps/extension/background/sync-queue.js`; Modify `background/message-router.js:861-881`, `background/alarm-handler.js`, `supabase/functions/create-listing/index.ts:682-687`; Test Create `tests/sync-queue.test.js`
**Interfaces — Produces:** `SSSyncQueue.enqueue(payload)`, `SSSyncQueue.flush(): Promise<{ sent, remaining }>`
- [ ] Test: sync fail → queue-তে থাকে; পরের `flush` সফল → queue খালি; 429 → `Retry-After` মানে
- [ ] Test (Deno): "Extension access token expired" → 401; subscription error → 402
- [ ] Implement, commit

### Task 15: Publish সঠিক listing-এ বাঁধা
**Files:** Modify `content_scripts/ebay_success.js:44-62`, `supabase/functions/sync-listing/index.ts:200-250`; Test Create `tests/ebay-success.test.js`
- [ ] Test: `draftId` না পেলে "newest staging" অনুমান না — tab-এর নিজের `uploadSessionId` থেকে, নয়তো sync বাদ + error log
- [ ] Test: publish sync-এ eBay-র আসল দাম ও `ebay_item_id` যায়; status `active`
- [ ] Implement, commit

### Task 16: Credit ও stock
**Files:** Create `supabase/migrations/<timestamp>_restore_listing_credit_deduction.sql`; Modify `supabase/functions/create-listing/index.ts:474,614`
- [ ] Live DB-তে `create_listing_with_variations`-এর বর্তমান definition পড়া (আগে যাচাই)
- [ ] Migration: `FOR UPDATE` lock + credit check + ledger row, 20260711-এর সব column রেখে
- [ ] `stock_quantity` 0 সংরক্ষণ; `price_low/high` শুধু দামওয়ালা variant থেকে
- [ ] User-এর অনুমতি নিয়ে apply; commit

### Task 17: Listings page
**Files:** Modify `apps/web/src/pages/dashboard/Listings.tsx:465-470,917,990-993`
- [ ] Draft / Active / Out of stock আলাদা count ও filter; draft row-এ "eBay-তে publish বাকি" badge
- [ ] Profit column `pricing_breakdown.profit` থেকে (না থাকলে "—", `ebay − amazon` না)
- [ ] দাম edit করলে স্পষ্ট লেখা: "শুধু SellerSuit-এ বদলায়, eBay-তে না"
- [ ] `npm --workspace @sellersuit/web run typecheck`; commit

## Phase 5 — শেষ যাচাই

### Task 18: End-to-end
- [ ] `cd apps/extension && npm test` — সব pass
- [ ] `npm run check:local` (repo root)
- [ ] Live: 1টা single, 1টা variation, 5 URL-এর bulk — প্রতিটায় Amazon-এর আসল দাম/ছবি/variant সংখ্যা বনাম eBay draft বনাম dashboard row মিলিয়ে `docs/listing-live-baseline.md`-তে "after" column
- [ ] যা যাচাই করা যায়নি তা স্পষ্ট লেখা

## User-এর সিদ্ধান্ত দরকার
1. Bulk-এ draft-ই থাকবে, নাকি auto-publish? (Task 13)
2. VeRO brand list-এর উৎস? (Task 9)
3. Item location কী হবে — user setting থেকে নেওয়া ঠিক আছে? (Task 11)

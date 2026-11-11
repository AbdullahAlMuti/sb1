# SellerSuit — Amazon → eBay listing audit (2026-11-12)

Scope: `apps/extension` (pricing, bulk runner, eBay payload, Amazon scraper v2, auth helper),
`supabase/functions/create-listing`, `_shared/pricing-*`, `_shared/rate-limit.ts`,
`amazon-inventory-sync`, এবং সংশ্লিষ্ট migrations।

যা check করা হয়নি: live database-এর actual state, live eBay/Amazon page behaviour, Walmart path,
`amazon_injector.js` (5.5k lines) পুরোটা, `sync-listing`, web dashboard UI।
Extension test suite: 529/529 pass — অর্থাৎ নিচের bug গুলো কোনো test-এ ধরা পড়ে না।

---

## A. Critical — সরাসরি টাকার ক্ষতি

| # | সমস্যা | কোথায় |
|---|---|---|
| C1 | **Listing credit কাটা হচ্ছে না (migration অনুযায়ী)।** `20260711` migration `create_listing_with_variations` RPC-কে পুরনো (20260608) version থেকে আবার লিখেছে, ফলে `20260703`-এ যোগ করা credit check + deduction হারিয়ে গেছে। Backup trigger `enforce_listing_credit_gate` service-role call-এ (`auth.uid() IS NULL`) skip করে, আর `create-listing` service-role দিয়েই call করে। Live DB-তে verify করা দরকার। | `supabase/migrations/20260711100000_central_pricing_authority.sql:92`, `20260703083802_...:293` |
| C2 | **Duplicate check কাজ করে না।** Extension `check-duplicate` Edge Function call করে, কিন্তু এই function repo-তে নেই। Call fail করলে code "fail-open" — তাই একই ASIN বারবার list হতে পারে (panel + bulk দুই জায়গায়)। | `background/listing-runner.js:282`, `background/message-router.js:925` |
| C3 | **Cost-এ shipping ধরা হয় না।** Extension সবসময় shipping = 0 দিয়ে price হিসাব করে; scraper শুধু delivery text নেয়, shipping amount parse করে না। Non-Prime / $35-এর নিচের item-এ loss। | `common/pricing-apply.js:88`, `content_scripts/amazon-scraper-v2.js:402` |
| C4 | **Sales tax model নেই।** Amazon-এ কেনার সময় tax (cost বাড়ায়) এবং eBay যে buyer-এর tax-সহ total-এর ওপর fee নেয় — কোনোটাই formula-তে নেই। | `suppliers/core/pricing-core.js` |
| C5 | **পুরনো rule-এ v1 formula এখনও default।** v1 eBay fee হিসাব করে *cost*-এর ওপর, অথচ eBay নেয় *sale price*-এর ওপর + per-order fee। উদাহরণ (cost $20, fee 13.25%, profit 25%, buffer বাদে): v1 price $27.65 → আসল fee ≈ $3.96 → profit ≈ $3.69, target ছিল $5.00। | `pricing-core.js:108-152` |
| C6 | **দামহীন variant-কে parent-এর দাম দিয়ে cost বানানো হয়।** Module-এর নিজের rule ("NEVER fabricate a cost") ভাঙে। দামি variant সস্তা parent price-এ list হতে পারে। | `common/pricing-apply.js:156`, `common/ebay-listing-api.js:963` |
| C7 | **Production code-এ hard-coded mock upload।** ASIN `B08KT2Z93D` হলে আসল upload না করে mock চালায় — কোনো user এই product list করতে পারবে না, অথচ "success" দেখবে। | `common/ebay-listing-api.js:1444` |
| C8 | **Price/stock monitor eBay-তে কিছু করে না।** `amazon-inventory-sync` শুধু DB update + notification দেয়; eBay price reprice বা out-of-stock listing end করে না। সব user-এর সব listing এক invocation-এ 1s delay দিয়ে চালায় (timeout হবে), repo-তে কোনো schedule নেই, এবং draft row-কেও `active` করে দেয়। | `supabase/functions/amazon-inventory-sync/index.ts:194-250` |

## B. High — reliability / ভুল data

| # | সমস্যা | কোথায় |
|---|---|---|
| H1 | Token expire হলে `create-listing` 401-এর বদলে **500** দেয় ("Extension access token expired" regex-এ match করে না), তাই extension refresh চেষ্টা করে না। Client-ও locally-expired token proactively refresh করে না। | `create-listing/index.ts:685`, `common/auth-helper.js:176` |
| H2 | eBay-তে list হওয়ার পর dashboard sync fail করলে শুধু toast — **কোনো retry queue নেই**। Listing eBay-তে থাকে কিন্তু SellerSuit-এ track হয় না। 429-এ retry/`Retry-After` নেই। | `common/ebay-listing-api.js:1340`, `common/auth-helper.js:333` |
| H3 | **Rate limiter atomic না** (read → পরে write): concurrent request limit পার হয়ে যায়। `create-listing`-এ আলাদা copy আছে যা DB error ignore করে; `Retry-After` header নেই; IP না পেলে সবাই `unknown` bucket share করে; `function_rate_limits` table-এর expired row মোছার কোনো job নেই; প্রতি request-এ 4–6টা extra DB round-trip। | `_shared/rate-limit.ts:53-115`, `create-listing/index.ts:33-49` |
| H4 | Post-upload sync `status: 'draft'` ও `ebay_item_id` ছাড়া যায়, তাই server নিজের হিসাব করা দাম DB-তে লেখে — rule cache stale (5–10 min) থাকলে **DB price ≠ eBay-র আসল price**। Parent-এ shipping ধরা হয়, variant-এ 0। | `create-listing/index.ts:534-543,570`, `ebay-listing-api.js:1308` |
| H5 | `stock_quantity: Number(x) \|\| 1` — stock 0 হলে 1 হয়ে যায়। দামহীন variant থাকলে `price_low` = 0। | `create-listing/index.ts:474,614` |
| H6 | Amazon price selector-এর priority কাজ করে না (`querySelectorAll(join)` DOM order দেয়); generic `.a-price .a-offscreen` list price / per-unit price ধরতে পারে। `$` সবসময় USD ধরা হয় (amazon.ca / .com.au ভুল), আর client pricing currency দেখেই না। | `amazon-scraper-v2.js:298-318,345` |
| H7 | সব variant out-of-stock হলে filter bypass হয়ে সবগুলোই upload হয়; দাম না থাকলে নীরবে **$0.99** বসে। | `ebay-listing-api.js:925,399,635` |
| H8 | Bulk: যেকোনো scrape timeout-এর message-এ "CAPTCHA" শব্দ আছে → পুরো job pause; tab `active: true` খুলে focus কেড়ে নেয়; 5-min `setTimeout` MV3 service worker-এ নির্ভরযোগ্য না। | `listing-runner.js:394,397,453`, `bulk-core.js:175` |

## C. Medium

- M1 — Pricing formula তিন জায়গায়: extension, `_shared` (auto-copy), আর web-এ হাতে লেখা TS mirror (`apps/web/src/lib/pricing-calculator.ts`) — drift-এর ঝুঁকি।
- M2 — eBay quantity সবসময় 1 (configurable না)।
- M3 — Subscription/account error গুলো 402/403-এর বদলে 500; trialing user-এরও `payment_status = paid` লাগে — ইচ্ছাকৃত কিনা confirm দরকার।
- M4 — `SYNC_LISTING` handler helper না পেলে কোনো response দেয় না (caller ঝুলে থাকে)। `message-router.js:866`
- M5 — Listing limit check (count → insert) atomic না।

---

## Fix checklist (approve করলে implement হবে)

### Phase 1 — টাকা বাঁচানো (আগে)
- [ ] C1: Live DB-তে RPC definition verify; নতুন migration-এ `FOR UPDATE` lock + credit deduction + ledger row ফিরিয়ে আনা (20260703 logic + 20260711 columns একসাথে)
- [ ] C2: `check-duplicate` Edge Function তৈরি (ASIN + supplier_product_id, user-scoped) + `config.toml` entry
- [ ] C7: mock-upload ASIN branch সরানো (শুধু explicit `mockUpload` flag, dev build-এ)
- [ ] C6: variant-এ parent price fallback বাদ; দামহীন variant unpriced থাকবে ও upload থেকে বাদ যাবে
- [ ] H7: empty-filter fallback সরিয়ে error throw; `$0.99` fallback-এর বদলে throw
- [ ] H5: `stock_quantity` 0 সংরক্ষণ; `price_low/high` শুধু priced variant থেকে

### Phase 2 — হিসাব ঠিক করা
- [ ] C3: Amazon shipping amount scrape + `supplier_shipping_cost` client ও server দুই জায়গায় pricing-এ পাঠানো (variant-সহ)
- [ ] C4: rule-এ `supplierTaxPercent` ও `buyerTaxPercent` (fee base) যোগ — core, DB column, dashboard UI, tests
- [ ] C5: v1 user-দের জন্য dashboard-এ "v2-তে migrate" prompt + আগে/পরে price preview
- [ ] H6: selector গুলো priority order-এ একটা একটা করে; strikethrough/per-unit বাদ; currency domain থেকে; non-USD হলে price না করা
- [ ] H4: post-upload sync-এ `ebay_item_id`/আসল eBay price পাঠানো; rule version mismatch হলে upload-এর আগে re-sync
- [ ] M1: web mirror-কেও generated copy বানানো অথবা parity test

### Phase 3 — reliability / rate limit
- [ ] H3: atomic Postgres function (`INSERT … ON CONFLICT DO UPDATE … RETURNING`) দিয়ে rate limit; `create-listing` shared helper ব্যবহার করবে; `Retry-After`; expired row cleanup cron
- [ ] H1: auth error → 401, subscription → 402/403; client-এ expiry-র আগে proactive refresh
- [ ] H2: failed dashboard sync-এর জন্য persistent retry queue (`chrome.storage` + alarm, exponential backoff, 429-এ `Retry-After`)
- [ ] H8: timeout message থেকে "CAPTCHA" আলাদা করা; background tab; upload timeout `chrome.alarms`-এ
- [ ] C8: inventory sync — per-user batch + cursor, cron schedule, draft status না বদলানো; eBay reprice / end-listing action (আলাদা design দরকার)
- [ ] প্রতিটি fix-এর সাথে regression test (TDD)

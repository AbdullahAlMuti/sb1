# Listing fix report — 2026-11-12

Branch: `fix/error-free-listing` (11 commits, কিছুই push বা deploy হয়নি)
Plan: `docs/superpowers/plans/2026-11-12-error-free-amazon-ebay-listing.md`

## যাচাই

| কী | ফল |
|---|---|
| Extension test suite (`npm test`) | 587 / 587 pass (আগে 529; 58টা নতুন test) |
| Dev build (`npm run prepare:dev`) | pass, verification PASSED |
| Web app typecheck | pass |
| Edge functions | শুধু syntax check (এই machine-এ Deno নেই) — type-check বা run হয়নি |
| Live Amazon page-এ নতুন scraper | 2টা product-এ চালানো হয়েছে (নিচে) |
| Extension-এর নিজের UI, eBay upload, dashboard | **live-এ দেখা হয়নি** |

### Live scrape ফল

**Apple iPhone 11 Renewed (B07ZPKBL9V), 91 variant, 4 dimension**
- 32 সেকেন্ডের সীমায় 44টা variant-এর নিজের দাম পাওয়া গেছে ($167.90–$299, 28টা আলাদা দাম); বাকি 47টা "unverified" হিসেবে বাদ। Default সীমা 90 সেকেন্ড — পুরো 91টার জন্য আলাদা করে চালানো হয়নি।
- কোনো $999 বা parent-এর দাম বসেনি; Amazon throttle করেনি।
- 91/91 variant ছবি পেয়েছে (fix-এর আগে 0)।
- মূল দাম $175.00 = page-এ দেখানো দাম।
- Condition "Refurbished" ধরা পড়েছে → upload আটকাবে।

**Instant Pot Duo (B00FLYWNYQ), 2 variant**
- 2.1 সেকেন্ডে দুটো variant-ই যাচাই ($89.99 / $109.99), মূল দাম page-এর সাথে মিলেছে, 9 ছবি, 9 bullet, condition New।

## যা ঠিক করা হয়েছে

**Scrape**
- Variant-এর দাম আর অনুমান হয় না (parent-এর দাম / $999 বাদ); যাচাই না হলে `price: null`, upload থেকে বাদ।
- প্রতিটা variant-এর দাম তার নিজের page থেকে `fetch` দিয়ে পড়া হয় (24-এর cap নেই); CAPTCHA এলে থামে।
- Price selector: কাটা list price, per-unit price, sponsored widget-এর দাম বাদ।
- Variant ছবি exact match; eBay-তে 24টা পর্যন্ত ছবি।
- Shipping cost parse হয়ে cost-এ যোগ হয়; `$` currency domain থেকে; non-USD price হয় না।
- A+ description fallback; brand item specifics-এ।
- Renewed / refurbished / used পণ্য শনাক্ত ও block।

**eBay listing**
- `check-vero` ও `check-duplicate` function তৈরি; check না চললে listing আটকায়।
- Required item specifics আর প্রথম option দিয়ে ভরা হয় না — খালি রেখে report করা হয়।
- $0.99 fallback ও hard-coded test ASIN সরানো।
- Item location United States; description থেকে shipping/return প্রতিশ্রুতি সরানো।

**Panel**
- Scan-এর পরে readiness checklist: কী ঠিক নেই, কয়টা variant বাদ পড়ল।

**Bulk**
- UI-তে "Draft on eBay" (আগে "Listed"); timeout আর পুরো job pause করে না; duplicate check fail-closed।

**Dashboard sync / server**
- Sync fail করলে retry queue (backoff, `Retry-After`)।
- Published item শুধু একটাই draft থাকলে link হয়; না হলে user-কে জানায়।
- `create-listing`: token expire-এ 401, stock 0 থাকে, `price_low` আর 0 হয় না, variant-এ shipping ধরা হয়, shared atomic rate limiter।

## আপনার করণীয় (আমি করিনি)

1. **Edge functions deploy:** `check-vero`, `check-duplicate`, `create-listing`। Deploy না করে নতুন extension চালালে প্রতিটা listing "check could not run" বলে আটকাবে।
2. **Migration apply:** `supabase/migrations/20261112090000_atomic_rate_limit.sql` (শুধু নতুন function যোগ করে)।
3. **Credit migration review:** `docs/proposed-migrations/restore_listing_credit_deduction.sql` — file-এর উপরের ৩টা ধাপ মেনে live function আগে মিলিয়ে নিন। ইচ্ছা করেই `migrations/`-এ রাখা হয়নি।
4. **VeRO list:** admin panel → Description Config → VeRO brands। এই list-ই ব্যবহার হয়; default-এ Apple, Nike, Adidas, Sony আছে।
5. **Extension reload:** `chrome://extensions` → SellerSuit → Reload (`apps/extension/dist/extension-dev`)।

## যা হয়নি

- **Amazon page-এর in-page panel-কে Shadow DOM-এ নেওয়া (plan Task 6, 7):** করা হয়নি। আপনার Chrome-এ Amazon page-এ extension-এর কোনো element পাইনি, তাই UI ভাঙে কিনা দেখতে পারিনি; না দেখে 5,500 লাইনের file-এ এই পরিবর্তন ঝুঁকিপূর্ণ।
- **Category picker ও business policy যাচাই (Task 11-এর অংশ):** eBay-র live response না দেখে করা যায় না।
- **Listings page-এ draft badge ও review তথ্য দেখানো (Task 17-এর অংশ):** তথ্য DB-তে যায় (`amazon_data.listing_review`), কিন্তু page-এ দেখানো হয়নি। শুধু CSV export-এর label ঠিক করা হয়েছে।
- **Sales tax, v1→v2 formula migration, inventory sync:** আগের audit-এর এই বিষয়গুলো এই plan-এ ছিল না।
- **Independent code review:** হয়নি; নিজে diff দেখেছি মাত্র।

## আমার নেওয়া সিদ্ধান্ত

- `priceVerified` flag ছাড়া পুরনো variant (Walmart / পুরনো draft) এখনও parent-এর cost নিতে পারে — ভুল হলে Walmart variant ভুল দামে যাবে।
- Unresolved item specifics upload আটকায় না (bulk draft থাকে, eBay editor জিজ্ঞেস করে) — ভুল হলে draft-এ হাতে পূরণ লাগবে।
- Bulk status-এর DB মান `listed`-ই আছে, শুধু label বদলেছে — analytics এখনও draft-কে listed গুনবে।
- Credit migration apply হয়নি — ততদিন credit না-ও কাটতে পারে।


লক্ষ্য: Trial প্ল্যানে সব ফিচার আগের মতো থাকবে, কিন্তু listing creation সার্ভার-সাইডে সর্বোচ্চ ১০টি পর্যন্ত সীমাবদ্ধ থাকবে। Existing business logic / listing algorithm পরিবর্তন করা হবে না—শুধু Trial প্ল্যানের limit configuration + enforcement message + ছোট UI text update।

## 1) বর্তমান অবস্থা (কোডবেস থেকে যা পাওয়া গেছে)
- Backend listing enforcement এখন `validateUserPlan(..., 'listing', 1)` দিয়ে হচ্ছে (`create-listing` এবং `sync-listing` দুটোতেই)।
- `validateUserPlan` listing limit নেয় DB থেকে: `plans.max_listings` (এবং admin override থাকলে `user_plans.admin_override_limits.max_listings`)।
- DB-তে Trial plan আছে:
  - `plans.name = "Trial"`, `is_trial = true`
  - কিন্তু `max_listings = 50` (এটা আপনার নতুন রুলের সাথে mismatch)।
- Pricing UI (`PricingSection.tsx`) ফিচার দেখায় DB-এর `plans.features` array থেকে; তাই “Up to 10 Listings” দেখাতে হলে DB features আপডেট বা UI-তে conditional injection দরকার।

আপনি নির্বাচন করেছেন: “Admin can override”  
=> Trial এর default হবে 10, কিন্তু যদি কোনো নির্দিষ্ট user এর জন্য admin override দিয়ে বেশি সেট করা হয়, তখন সেটাই effective হবে (অর্থাৎ hard-cap 10 নয়)।

## 2) DB change (Trial default max_listings = 10)
### কী করব
- `plans` টেবিলে Trial প্ল্যানের `max_listings` 10 করে দেব।
- “Existing users handling” স্বয়ংক্রিয়ভাবে কাজ করবে, কারণ limit check active listings count দিয়ে হয়; যাদের already >10 active listings আছে তারা নতুন listing তৈরি করতে পারবে না, পুরনো listing untouched থাকবে।

### প্রস্তাবিত SQL (Test environment)
Cloud View → Run SQL (Test) এ রান:
```sql
update public.plans
set max_listings = 10,
    updated_at = now()
where name = 'Trial';
```

(যদি আপনার “Trial” নামটি case-sensitive ভিন্ন হয়, উপরের query adjust করা হবে; কিন্তু বর্তমানে DB-তে নাম ঠিক “Trial”.)

## 3) Backend enforcement (কোনো নতুন algorithm নয়; শুধু Trial message + নিশ্চিত করা)
### কী করব
- Enforcement আগে থেকেই backend-only হচ্ছে `validateUserPlan` দিয়ে; তাই Trial max_listings=10 হলে hard enforcement অটোমেটিক হবে।
- কিন্তু আপনার চাহিদা অনুযায়ী Trial limit hit করলে error message আরো specific করা হবে:
  - “Trial plan listing limit reached (10 max)”

### কোথায় পরিবর্তন হবে
- `supabase/functions/_shared/plan-middleware.ts`
  - `validateUserPlan` → `case 'listing'` অংশে:
    - যদি `status.isTrial === true` এবং effective `limit === 10` এবং limit exceed হয়:
      - reason string Trial-specific সেট করা হবে।
    - Enforcement logic (current/limit হিসাব) পরিবর্তন হবে না—শুধু message।

### Edge cases
- Admin override থাকলে effective `limit` 10 নাও হতে পারে; সে ক্ষেত্রে generic message থাকবে (বা limit অনুযায়ী message)।
- Extension path `sync-listing` এবং web app `create-listing` দুটোই একই middleware ব্যবহার করে, তাই Trial block সর্বত্র কাজ করবে।

## 4) UI update (Minor): Trial card এ “Up to 10 Listings”
আপনার requirement অনুযায়ী UI-তে Trial কার্ডে ছোট করে দেখাতে হবে: “Up to 10 Listings” (কিন্তু অন্য feature hide/disable নয়)।

### অপশন A (ডেটা-ড্রিভেন, সবচেয়ে consistent)
- `plans.features` JSON array-তে Trial প্ল্যানের feature হিসেবে “Up to 10 Listings” যোগ/আপডেট করা।
- সুবিধা: UI code না বদলালেও pricing section এবং অন্য জায়গায় একই টেক্সট দেখাবে।

প্রস্তাবিত SQL:
```sql
update public.plans
set features = (
  case
    when jsonb_typeof(features) = 'array' then
      -- Trial features array-তে যদি ইতিমধ্যে “Listings” ধরনের কিছু থাকে, সেটি রেখে নতুন entry যোগ করা (simple approach)
      (features || to_jsonb(array['Up to 10 Listings']::text[]))::jsonb
    else
      to_jsonb(array['Up to 10 Listings']::text[])
  end
),
updated_at = now()
where name = 'Trial';
```

### অপশন B (কোড-সাইড injection, DB-তে features না ছুঁয়ে)
- `src/components/PricingSection.tsx` এ render করার সময়:
  - যদি `plan.is_trial === true` এবং `plan.max_listings === 10`:
    - `plan.features` এর শুরুতে “Up to 10 Listings” prepend করা (duplicate guard সহ)।
- সুবিধা: DB features untouched।
- নোট: আপনি “Database Requirement” এ Trial max_listings=10 বলেছেন, তাই Option A-ই বেশি aligned।

আমি Option A + (প্রয়োজনে) UI-side duplicate guard recommend করব যাতে DB features-এ একবার যোগ হলেই বারবার duplication না হয়।

## 5) Verification (End-to-end tests)
1) Trial user দিয়ে 10টি active listing পর্যন্ত create করুন (web app + extension flow) → success।
2) ১১তম listing create চেষ্টা করুন:
   - `create-listing` → 402 response, error message: “Trial plan listing limit reached (10 max)”।
   - `sync-listing` batch → 402 response, summary তে blocked, same reason।
3) Existing Trial user যার active listing > 10:
   - নতুন listing create blocked হবে, পুরনো listing থাকবে।
4) Admin override test:
   - কোনো Trial user এর `user_plans.admin_override_limits.max_listings = 20` দিলে 11-20 create allowed হবে (আপনার পছন্দ অনুযায়ী)।
5) Pricing page (`/#pricing`) এ Trial card এ “Up to 10 Listings” দেখা যাচ্ছে কিনা যাচাই করুন।

## 6) What will be changed (scope)
- DB:
  - `public.plans` row update: Trial `max_listings = 10`
  - (optional) Trial `features` updated to include “Up to 10 Listings”
- Code (minimal):
  - `supabase/functions/_shared/plan-middleware.ts` → Trial listing limit exceeded হলে error message specific করা
  - (optional) `src/components/PricingSection.tsx` → DB features না বদলালে conditional injection

## 7) Rollback plan
- Trial max_listings আগের মানে ফিরিয়ে দিতে:
```sql
update public.plans
set max_listings = 50,
    updated_at = now()
where name = 'Trial';
```
- features থেকে “Up to 10 Listings” remove করতে features array edit (manual) বা targeted jsonb অপারেশন ব্যবহার করা হবে।


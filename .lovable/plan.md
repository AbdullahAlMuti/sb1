
লক্ষ্য (আপনার চাহিদা অনুযায়ী)
1) ইউজারের Total / Used / Remaining credits সবসময় সঠিক দেখাবে  
2) নতুন ইউজারের ক্ষেত্রে কোনো “ডিফল্ট ক্রেডিট” (যেমন 5) ভুলভাবে দেখাবে না  
3) Expiry/Renewal date দেখাবে + Renew করার অপশন থাকবে (Billing portal)  
4) Credits ≤ 5 হলে তবেই “Credits running low” নোটিফিকেশন দেখাবে (আপনি বলেছেন: Banner + Toast, Paid + Trial users)  
5) UI/UX পরিষ্কার ও consistent হবে, এবং লজিক/ফাংশনাল বাগ ফিক্স হবে

--------------------------------------------------------------------
কেন সমস্যা হচ্ছে (কোডবেস অ্যানালাইসিস)
A) কোডে বহু জায়গায় hardcoded fallback `5` আছে (frontend + backend)।  
   ফলে কোনো plan resolve না হলে/ফ্রি plan না থাকলে/NULL হলে UI “5” দেখিয়ে ফেলতে পারে।

B) Credits tracking এখন mixed-model:
   - কিছু জায়গায় `profiles.credits` (remaining balance) ব্যবহার হচ্ছে
   - কিছু জায়গায় `plans.credits_per_month - user_plans.credits_used` দিয়ে remaining calculate করা হচ্ছে
   - Stripe renewal flow-তে `credits_used` reset না হওয়ায় remaining ভুল হতে পারে (credits_used জমতে থাকে)

C) আপনার DB-তে বর্তমানে `free` plan row নেই (read-query-তে দেখা গেছে শুধুই Trial/starter/growth/enterprise আছে), কিন্তু frontend/backend অনেক জায়গায় `name='free'` ধরে query করছে। এতে error/fallback mismatch হতে পারে।

--------------------------------------------------------------------
Clarification needed (একটাই ব্লকিং সিদ্ধান্ত)
আপনি আগে প্রশ্নে “Credits for new users” উত্তর দেননি—এটা ঠিক না করলে “নতুন ইউজার” flow সম্পূর্ণ consistent করা যাবে না।

নতুন ইউজার সাইনআপ করার পর আপনি কোনটা চান?
Option 1: Paid/Trial ছাড়া কেউ credits পাবে না (default 0; UI তে “—”; plan_id null বা একটি “free” plan with 0 credits)  
Option 2: Auto Trial (Trial plan assign হবে; credits/limits দেখাবে)  
Option 3: Starter credits (যেমন 5) — (আপনি বলেছেন এটা চান না, তাই recommend করছি না)

আমি Recommend করছি: Option 1 (0 credits + “—”), কারণ আপনার requirement: “নতুন ইউজারের জন্য ডিফল্ট কোনো ক্রেডিট দেখানো না হয়।”

এই plan-এ আমি Option 1 ধরে ডিজাইন করছি; যদি আপনি Auto Trial চান, আমি plan অনুযায়ী query/trigger গুলো adjust করব।

--------------------------------------------------------------------
Design: Single source of truth (credits)
আমরা credits কে consistent করব এইভাবে:

- credits_total = plans.credits_per_month (plan limit)
- credits_remaining = profiles.credits (actual remaining balance; deductUsage এখানেই decrement করে)
- credits_used = (credits_total - credits_remaining) অথবা user_plans.credits_used (কিন্তু এটি অবশ্যই period reset-এ 0 হতে হবে)

Best approach (সবচেয়ে কম বাগ):
1) profiles.credits = remaining balance (authoritative)
2) user_plans.credits_used = current billing period usage (analytics/display) — এবং এটি অবশ্যই renewal/period reset/plan change-এ 0 হবে
3) UI সবসময় useSubscription (check-subscription-v2) থেকে total/used/remaining নেবে; profile.credits direct display এ আর ব্যবহার করবে না

--------------------------------------------------------------------
Implementation plan (Step-by-step)

Step 1 — Backend: check-subscription-v2 কে “credits object” standard response দিতে হবে
ফাইল: `supabase/functions/check-subscription-v2/index.ts`

কাজ:
- Hardcoded fallback `?? 5` remove করে `?? 0` করা (credits-related)
- credits_total = planDetails?.credits_per_month ?? 0
- profile থেকে credits_remaining আনতে হবে: `profiles.credits`  
- credits_used = Math.max(credits_total - credits_remaining, 0)
- response structure consistent রাখবো:

```ts
{
  subscribed,
  plan_name,
  plan,
  limits: { credits_per_month, max_listings, max_auto_orders },
  usage: {
    credits_total,
    credits_used,
    credits_remaining,
    listings_active,
    orders_used,
    current_period_end,
    status
  },
  subscription_end,
  stripe_subscription_id
}
```

নোট: বর্তমানে usage তে credits_remaining আছে, credits_used আছে—কিন্তু credits_remaining derive করছে credits_total - credits_used থেকে। আমরা এটাকে profiles.credits aligned করব যাতে “নতুন ইউজার 0” আর “actual remaining” সবসময় ঠিক থাকে।

Step 2 — Stripe webhook: renewal/plan change-এ credits_used reset নিশ্চিত করা
ফাইল: `supabase/functions/stripe-webhook/index.ts`

কাজ:
- `invoice.payment_succeeded` (subscription_cycle) হলে:
  - profiles.credits = planData.credits_per_month (আছে)
  - user_plans.credits_used = 0 (এটা যোগ করতে হবে)
- subscription canceled/downgrade এ free-plan fallback `?? 5` remove করে 0 করা
- যদি free plan না থাকে: downgrade হলে credits=0 + plan_id null (safe fallback)
  - (এটা Option 1 এর সাথে consistent)

Step 3 — Shared plan middleware: defaultLimits কে 0 করা (no phantom credits)
ফাইল: `supabase/functions/_shared/plan-middleware.ts`

কাজ:
- `defaultLimits.credits_per_month: 5` → 0
- planData credits_per_month fallback 5 → 0
- এর ফলে plan resolve না হলে credits limit “0” হবে, আর কোন hidden 5 থাকবে না

Step 4 — create-listing profile auto-create bugfix (credits: 5 → 0)
ফাইল: `supabase/functions/create-listing/index.ts`

কাজ:
- profile missing হলে create করার সময় `credits: 5` → `credits: 0`
- `created?.credits ?? 5` → `created?.credits ?? 0`
- free plan lookup (name=free) failure safe করা:
  - যদি free plan row না থাকে, `plan_id` null রেখে দেব
  - (Option 1 এর সাথে consistent)

Step 5 — Frontend: UI credits display fully consistent করা
ফাইলগুলো:
- `src/hooks/useSubscription.tsx` (types)
- `src/components/dashboard/DashboardHeader.tsx`
- (সম্ভবত) `src/components/dashboard/PlanOverview.tsx`
- `src/components/dashboard/UsageSummaryCard.tsx`
- `src/pages/Dashboard.tsx` (যদি এখনও profile.credits দিয়ে banner/logic থাকে)

কাজ:
1) `useSubscription` interface-এ `usage.credits_total/credits_used/credits_remaining` যোগ/align করা (আজ usage তে credits_remaining, credits_used আছে; কিন্তু total limits থেকে নেওয়া হচ্ছে—আমরা explicit fields রাখবো)
2) `DashboardHeader` dropdown এ:
   - Credits: “Remaining / Total”
   - Used: “Used this period”
   - Free/No-plan হলে “—” show (আপনার requirement)
3) Expiry:
   - `subscriptionEnd` বা `usage.current_period_end` থেকে date show
   - Expired হলে “Expired” label
   - CTA: “Renew Subscription” → click করলে `openCustomerPortal()` (আপনি নির্বাচন করেছেন)
4) PlanOverview low-credit threshold:
   - এখন `<10` এবং `!subscribed` — এটাকে আপনার rule অনুযায়ী “<= 5” এবং Paid/Trial users এর জন্য align করব, যাতে সব জায়গায় একই threshold থাকে
5) `usePlanLimits.tsx`:
   - এখানে `credits_per_month ?? 5` remove করে 0
   - “free plan” query `.eq('name','free').single()` এখন fail করতে পারে কারণ free plan নেই; এটাকে safe fallback করতে হবে:
     - যদি planId না থাকে এবং free plan row না থাকে, then credits_per_month=0, max_listings=0 (or keep existing?), etc.
   - তবে dashboard UI ideally useSubscription-driven হবে; usePlanLimits শুধু UsageSummaryCard-এর জন্য, তাই এটাকে useSubscription থেকে data নিতে refactor করাও সম্ভব (cleaner)

Step 6 — Low credits notification (Banner + Toast, creditsRemaining <= 5)
আপনার screenshot অনুযায়ী banner style implement করবো।

কোথায় বসবে:
- `src/components/dashboard/DashboardLayout.tsx` এ `<NoticesBanner />` এর আগে একটি নতুন component:
  - `CreditsLowBanner` (dismissable)
  - Paid + Trial users only
  - Trigger condition: `usage?.credits_remaining <= 5` AND `limits?.credits_per_month > 0`
  - Expired subscription হলে banner message “Subscription expired—renew to restore credits” (optional but helpful)

Toast (once per session বা per day):
- DashboardLayout এ useEffect:
  - condition meet হলে `toast.warning("Credits running low...")` একবার
  - sessionStorage flag: `low_credits_toast_shown=true`
  - credits আবার >5 হলে flag remove করা (so it can show again later)

Banner UI (screenshot-inspired):
- Left: warning icon + title “Credits Running Low”
- Subtext: “Upgrade/renew your plan to continue creating listings.”
- Right: primary button “Upgrade Now” / “Renew Now”
  - onClick → `openCustomerPortal()` (paid/trial users)

Dismiss behavior:
- “X” close button → localStorage/sessionStorage এ dismiss store (e.g. `dismiss_low_credits_banner_until`)

Step 7 — Admin pages fallbacks cleanup (small bugs)
ফাইল: `src/pages/admin/AdminPlans.tsx`, `src/pages/admin/AdminUsers.tsx`
- credits_per_month default `?? 5` → `?? 0` (যাতে admin UI তেও phantom 5 না আসে)
- This is important কারণ admin যদি নতুন plan বানায়, defaults ভুল হয়ে যেতে পারে

--------------------------------------------------------------------
Verification / Testing checklist (end-to-end)
1) New user signup → dashboard:
   - Credits section “—” (বা 0/0, আপনার পছন্দ অনুযায়ী)  
   - কোথাও 5 দেখাবে না
2) Trial/Paid user:
   - Total/Used/Remaining consistent (Total = plan, Remaining decreases with usage, Used increases)
3) Credits remaining 6 → কোনো low-credit banner/toast নেই
4) Credits remaining 5 → banner show + toast once
5) Credits remaining 4 → banner stays; toast repeat না (unless reset condition met)
6) Renewal হলে:
   - credits_remaining reset to plan total
   - credits_used reset to 0
7) Subscription expired:
   - Expired label + “Renew Subscription” CTA works (billing portal)

--------------------------------------------------------------------
Rollback / Safety
- এই পরিবর্তনগুলো mostly fallback logic + display consistency, তাই rollback সাধারণত প্রয়োজন হবে না।
- Stripe webhook logic পরিবর্তন sensitive; deploy করার পর edge logs verify করবো।

--------------------------------------------------------------------
Deliverables summary
- Backend: credits accounting consistent + no hardcoded 5 fallbacks + credits_used reset on renew
- Frontend: clean breakdown UI + expiry + Renew CTA
- Dashboard: low-credit banner + toast only when <= 5 (paid/trial only)
- Small bug fixes: free plan assumptions safe + admin default corrections

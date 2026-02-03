
সমস্যাটা কেন হচ্ছে (root cause)
- নতুন ইউজার প্ল্যান কিনলে Stripe সাবস্ক্রিপশন “active/trialing” হয়ে যায়, তাই `subscribed = true` হচ্ছে।
- কিন্তু অনেক সময় Stripe webhook (বা `check-subscription-v2`-এর “best-effort persist”) ইউজারের `profiles.credits` এখনো আপডেট করে না/late হয়।
- আমাদের UI (DashboardLayout + CreditsLowBanner) `subscribed=true` দেখলেই low-credit warning eligibility ধরে নেয়, আর `creditsRemaining=0` হলে সাথে সাথে “Credits running low” দেখায়—যদিও ইউজার এখনো কিছু ব্যবহার করেনি।
- অর্থাৎ, subscribed true কিন্তু credits initialize হয়নি → false low-credit banner/toast।

লক্ষ্য (আপনার requirement অনুযায়ী)
1) নতুন ইউজার প্ল্যান কিনার সাথে সাথে creditsRemaining প্ল্যান অনুযায়ী সেট হবে (0 দেখাবে না)
2) Total / Used / Remaining সঠিক থাকবে
3) Low-credit banner + toast শুধু তখনই হবে যখন remaining ≤ 5 এবং সত্যিই low (paid/trial user)
4) Expiry/renew option থাকবে (billing portal)

────────────────────────────────────────────────────────────
Implementation approach (আমরা কীভাবে fix করব)

A) Backend fix (সবচেয়ে গুরুত্বপূর্ণ): `check-subscription-v2` “credits initialization” করবে
ফাইল: `supabase/functions/check-subscription-v2/index.ts`

যা করব:
1) `hasActiveSub === true` এবং `planDetails` পাওয়া গেলে:
   - `profile.credits` (remaining) যদি 0/NULL হয়
   - এবং `user_plans.credits_used` যদি 0 হয় (মানে এখনো ব্যবহার হয়নি)
   - তাহলে এটাকে “just purchased কিন্তু credits এখনও initialize হয়নি” হিসেবে ধরব
2) এই ক্ষেত্রে edge function (service-role) দিয়ে:
   - `profiles.credits = planDetails.credits_per_month` সেট করব
   - (ঐচ্ছিক কিন্তু ভালো) `credit_transactions`-এ একটি `plan_grant`/`init_grant` টাইপ log করব যাতে auditing থাকে
3) Response-এ `usage.credits_remaining` সেই updated value return করবে, ফলে UI আর 0 দেখাবে না এবং low-credit warning ট্রিগার হবে না।

Edge cases:
- যদি ইউজার সত্যি সত্যি সব credits ব্যবহার করে 0 করেছে, তাহলে `user_plans.credits_used > 0` থাকবে—তখন initialization হবে না, এবং warning ঠিকমতো দেখাবে।

B) Stripe webhook hardening (optional but recommended): free plan lookup crash-avoid + consistent resets
ফাইল: `supabase/functions/stripe-webhook/index.ts`

যা করব:
- কিছু জায়গায় এখনও `plans.name='free'` lookup আছে। আপনার DB-তে free plan row নাও থাকতে পারে।
- fallback হিসেবে:
  - free plan না পেলে `plan_id = null` এবং `credits = 0` সেট করব (যাতে error/phantom state না হয়)
- (আপনার আগের plan অনুযায়ী) renewal/period reset-এ `user_plans.credits_used = 0` আছে; নিশ্চিত করব সব paths-এ consistent আছে।

C) Frontend guard (secondary safety): “credits not initialized yet” হলে warning suppress
ফাইল: `src/components/dashboard/DashboardLayout.tsx` + `src/components/dashboard/CreditsLowBanner.tsx`

যা করব:
1) Low-credit eligibility check আরো strict করব:
   - eligible = subscribed AND creditsTotal > 0 AND NOT initializing
2) “initializing” কিভাবে ধরব:
   - subscribed true
   - creditsTotal > 0
   - creditsRemaining === 0
   - creditsUsed === 0
   - (optional) recently came from checkout success route বা just verified
3) এই অবস্থায়:
   - Banner/Toast দেখাব না
   - (ঐচ্ছিক) ছোট “Syncing your credits…” info line দেখাতে পারি (কিন্তু বাধ্যতামূলক না)

D) CheckoutSuccess reliability fix (state staleness)
ফাইল: `src/pages/CheckoutSuccess.tsx` এবং/অথবা `src/hooks/useSubscription.tsx`

বর্তমানে `CheckoutSuccess`-এ:
- `await checkSubscription()` করার পর 500ms timeout দিয়ে `subscribed` state পড়ছে, কিন্তু React state update async হওয়ায় stale value পড়ে ফেলতে পারে।
যা করব:
1) `useSubscription.checkSubscription()`-কে এমনভাবে আপডেট করব যেন এটি fetched `data` রিটার্ন করে (বা একটি boolean `isSubscribedNow` রিটার্ন করে)।
2) `CheckoutSuccess` সেই return value ধরে সিদ্ধান্ত নেবে (subscribed হয়েছে কিনা), hook state-এর stale snapshot নয়।
3) এরপর dashboard redirect হবে—আর credits initialization backend fix (A) থাকায় redirect-এর পরেও credits ঠিক থাকবে।

────────────────────────────────────────────────────────────
Testing checklist (আপনি যেভাবে verify করবেন)
1) New user signup → plan purchase → success page → dashboard
   - credits: Remaining = plan total (0 হবে না)
   - Credits running low banner/toast দেখাবে না
2) Paid/Trial user with creditsRemaining 6 → warning নেই
3) creditsRemaining 5 → banner + toast (once) দেখাবে
4) creditsRemaining 4 → banner থাকবে; toast বারবার হবে না
5) Renew/Manage billing button → Stripe billing portal খুলবে
6) Hard refresh / new session → data consistent থাকবে (no phantom 100000, no phantom low-credit)

────────────────────────────────────────────────────────────
Deliverables (শেষে কী পরিবর্তন হবে)
- New paid user purchase-এর পর instant credits initialization (no “0 remaining” glitch)
- Low-credit banner/toast only when genuinely low (≤5)
- Checkout success verification আরো reliable
- Stripe webhook free-plan lookup safe fallback (যদি free plan row না থাকে)


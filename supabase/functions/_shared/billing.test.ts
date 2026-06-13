// Runs under Node 22+ (node --experimental-strip-types --test) and Deno
// (deno test --allow-none) — uses node: builtins supported by both.
import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveAccessState,
  isTrialEligible,
  trialEndFor,
  billingIntervalForPrice,
  shouldFlipToExpired,
} from "./billing.ts";

const NOW = new Date("2026-06-13T12:00:00Z");
const FUTURE = "2026-06-20T12:00:00Z";
const PAST = "2026-06-10T12:00:00Z";

const trialPlan = { id: "t", is_trial: true };
const paidPlan = {
  id: "p",
  is_trial: false,
  stripe_price_id_monthly: "price_m",
  stripe_price_id_yearly: "price_y",
  stripe_price_id_one_time: null,
};

test("access: no plan rows -> none", () => {
  assert.equal(resolveAccessState(null, null, NOW), "none");
  assert.equal(resolveAccessState({ plan_id: null, status: "active" }, paidPlan, NOW), "none");
});

test("access: active paid subscription -> active", () => {
  assert.equal(resolveAccessState({ plan_id: "p", status: "active" }, paidPlan, NOW), "active");
});

test("access: past_due wins over everything", () => {
  assert.equal(resolveAccessState({ plan_id: "p", status: "past_due" }, paidPlan, NOW), "past_due");
  assert.equal(resolveAccessState({ plan_id: "t", status: "past_due", trial_end: FUTURE }, trialPlan, NOW), "past_due");
});

test("access: live trial -> trial", () => {
  assert.equal(resolveAccessState({ plan_id: "t", status: "trialing", trial_end: FUTURE }, trialPlan, NOW), "trial");
});

test("access: trial past trial_end -> trial_expired (reactive expiry)", () => {
  assert.equal(resolveAccessState({ plan_id: "t", status: "trialing", trial_end: PAST }, trialPlan, NOW), "trial_expired");
  assert.equal(resolveAccessState({ plan_id: "t", status: "expired", trial_end: PAST }, trialPlan, NOW), "trial_expired");
  assert.equal(resolveAccessState({ plan_id: "t", status: "trialing", trial_end: null }, trialPlan, NOW), "trial_expired");
});

test("access: canceled paid plan -> none", () => {
  assert.equal(resolveAccessState({ plan_id: "p", status: "canceled" }, paidPlan, NOW), "none");
  assert.equal(resolveAccessState({ plan_id: "p", status: "unpaid" }, paidPlan, NOW), "none");
});

test("trial eligibility: all three layers block independently", () => {
  assert.equal(isTrialEligible({ trialUsedAt: null, hadTrialPlanBefore: false, customerTrialUsed: false }).eligible, true);
  assert.equal(isTrialEligible({ trialUsedAt: "2026-01-01", hadTrialPlanBefore: false, customerTrialUsed: false }).eligible, false);
  assert.equal(isTrialEligible({ trialUsedAt: null, hadTrialPlanBefore: true, customerTrialUsed: false }).eligible, false);
  assert.equal(isTrialEligible({ trialUsedAt: null, hadTrialPlanBefore: false, customerTrialUsed: true }).eligible, false);
});

test("trialEndFor: defaults to 7 days and honors duration", () => {
  assert.equal(trialEndFor(NOW, 7).toISOString(), "2026-06-20T12:00:00.000Z");
  assert.equal(trialEndFor(NOW, 0).toISOString(), "2026-06-20T12:00:00.000Z");
  assert.equal(trialEndFor(NOW, 14).toISOString(), "2026-06-27T12:00:00.000Z");
});

test("billingIntervalForPrice resolves the matched column", () => {
  assert.equal(billingIntervalForPrice(paidPlan, "price_m"), "monthly");
  assert.equal(billingIntervalForPrice(paidPlan, "price_y"), "yearly");
  assert.equal(billingIntervalForPrice(paidPlan, "price_unknown"), null);
  assert.equal(billingIntervalForPrice(paidPlan, null), null);
});

test("shouldFlipToExpired: only live trial rows past their end", () => {
  assert.equal(shouldFlipToExpired({ plan_id: "t", status: "trialing", trial_end: PAST }, trialPlan, NOW), true);
  assert.equal(shouldFlipToExpired({ plan_id: "t", status: "trialing", trial_end: FUTURE }, trialPlan, NOW), false);
  assert.equal(shouldFlipToExpired({ plan_id: "t", status: "expired", trial_end: PAST }, trialPlan, NOW), false);
  assert.equal(shouldFlipToExpired({ plan_id: "p", status: "active", trial_end: PAST }, paidPlan, NOW), false);
});

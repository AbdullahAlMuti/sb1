import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("credit migration keeps balance writes locked, ledger-based, and service-role only", () => {
  const sql = read("supabase/migrations/20260703083802_credit_ledger_listing_gates.sql");

  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.set_user_credit_balance/);
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /metadata->>'grant_key'/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.set_user_credit_balance\(uuid, integer, text, text, jsonb\)\s+TO service_role/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.set_user_credit_balance\(uuid, integer, text, text, jsonb\) FROM authenticated/);
});

test("eBay listing RPC blocks exhausted credits atomically and records usage through the ledger", () => {
  const sql = read("supabase/migrations/20260703083802_credit_ledger_listing_gates.sql");

  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.create_listing_with_variations/);
  assert.match(sql, /WHERE id = p_user_id\s+FOR UPDATE/);
  assert.match(sql, /RAISE EXCEPTION 'INSUFFICIENT_CREDITS'/);
  assert.match(sql, /transaction_type,\s*balance_after,\s*description,\s*metadata/);
  assert.match(sql, /'usage'/);
  assert.doesNotMatch(sql, /UPDATE public\.profiles\s+SET credits = v_credits - 1/i);
});

test("active Supabase functions do not bypass the ledger for plan grants or listing deductions", () => {
  const files = [
    "supabase/functions/_shared/trial-activation.ts",
    "supabase/functions/_shared/billing-sync.ts",
    "supabase/functions/check-subscription-v2/index.ts",
    "supabase/functions/stripe-webhook/index.ts",
    "supabase/functions/admin-adjust-credits/index.ts",
    "supabase/functions/sync-listing/index.ts",
  ];

  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /from\(["']credit_transactions["']\)\.insert/, `${file} inserts credit_transactions directly`);
    assert.doesNotMatch(source, /deduct_credits/, `${file} uses legacy deduct_credits RPC`);
  }
});

test("Stripe webhook activates one-time trial checkout sessions directly", () => {
  const source = read("supabase/functions/stripe-webhook/index.ts");
  const checkoutCaseStart = source.indexOf('case "checkout.session.completed"');
  const subscriptionCaseStart = source.indexOf('case "customer.subscription.created"');
  assert.notEqual(checkoutCaseStart, -1);
  assert.notEqual(subscriptionCaseStart, -1);

  const checkoutCase = source.slice(checkoutCaseStart, subscriptionCaseStart);
  assert.match(checkoutCase, /session\.mode\s*===\s*["']payment["']/);
  assert.match(checkoutCase, /session\.payment_status\s*!==\s*["']paid["']/);
  assert.match(checkoutCase, /await activateTrialFromSession\(session\)/);
});

test("credit balance RPC reconciles stale profile credits from the ledger", () => {
  const sql = read("supabase/migrations/20260703204444_reconcile_credit_balance_rpc.sql");

  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.set_user_credit_balance/);
  assert.match(sql, /IF v_grant_key IS NOT NULL AND EXISTS/);
  assert.match(sql, /SET credits = COALESCE\(v_ledger_credits, 0\)/);
  assert.match(sql, /SET credits = p_target_balance/);
  assert.match(sql, /set_config\('app\.ledger_sync', 'true', true\)/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.set_user_credit_balance\(uuid, integer, text, text, jsonb\)\s+TO service_role/);
});

test("trial subscription check repairs profile credits from the active trial plan reference", () => {
  const source = read("supabase/functions/check-subscription-v2/index.ts");

  assert.match(source, /expectedTrialCredits/);
  assert.match(source, /planDetails\.credits_per_month - Number\(userPlan\?\.credits_used \?\? 0\)/);
  assert.match(source, /p_description:\s*"Trial credits reconciled"/);
  assert.match(source, /repair_source:\s*"check-subscription-v2"/);
  assert.match(source, /select\("credits, plan_id, stripe_customer_id, subscription_id"\)/);
});

test("shared trial activation reconciles duplicate active trial grants", () => {
  const source = read("supabase/functions/_shared/trial-activation.ts");

  assert.match(source, /already_claimed_reconciled/);
  assert.match(source, /await grantTrialCredits\("Trial credits reconciled"\)/);
  assert.match(source, /\.in\("status", \["trialing", "active"\]\)/);
});

test("direct client inserts into listings are credit-gated at the table level", () => {
  const sql = read("supabase/migrations/20260703083802_credit_ledger_listing_gates.sql");

  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.enforce_listing_credit_gate/);
  assert.match(sql, /CREATE TRIGGER trg_enforce_listing_credit_gate\s+BEFORE INSERT ON public\.listings/);
  // Client-context inserts (auth.uid() present) must lock the profile, gate on
  // balance, and record usage through the ledger.
  assert.match(sql, /WHERE id = NEW\.user_id\s+FOR UPDATE/);
  // The listing RPC must flag itself so the trigger cannot double-charge.
  assert.match(sql, /app\.listing_credit_handled/);
});

test("listing endpoints return structured insufficient-credit errors", () => {
  const createListing = read("supabase/functions/create-listing/index.ts");
  const syncListing = read("supabase/functions/sync-listing/index.ts");

  for (const source of [createListing, syncListing]) {
    assert.match(source, /code:\s*['"]INSUFFICIENT_CREDITS['"]/);
    assert.match(source, /limitType:\s*['"]credits['"]/);
    assert.match(source, /upgradeRequired:\s*true/);
  }
});

// pricing-service.test.ts — Deno unit tests for the server-side authoritative
// pricing service (pure parts: validation, supplier inference, computation).
//
// Run: deno test supabase/functions/_shared/pricing-service.test.ts
// (Also executed by CI wherever deno is available.)

import {
  PricingError,
  breakdownForStorage,
  computeFromRule,
  defaultRuleForSupplier,
  inferSupplierFromUrl,
  validatePricingInput,
} from "./pricing-service.ts";

// deno-lint-ignore no-explicit-any
function assertEquals(actual: any, expected: any, msg?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(msg ?? `assertEquals failed: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}
function assert(cond: unknown, msg?: string) {
  if (!cond) throw new Error(msg ?? "assertion failed");
}
function assertThrowsCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (e) {
    assert(e instanceof PricingError, `expected PricingError, got ${e}`);
    assertEquals((e as PricingError).code, code);
    return;
  }
  throw new Error(`expected PricingError(${code}) but nothing was thrown`);
}

const RULE = (over: Record<string, unknown> = {}) => ({
  id: "rule-1",
  supplier_key: "amazon",
  is_enabled: true,
  profit_margin_percent: 20,
  minimum_profit: 0,
  shipping_buffer: 0,
  fixed_handling_fee: 1,
  marketplace_fee_percent: 0,
  currency_buffer_percent: 0,
  rounding_rule: "ROUND_UP",
  rule_version: 3,
  updated_at: "2026-07-10T00:00:00Z",
  ...over,
});

Deno.test("computeFromRule: user A story — 12.50 + $1 handling + 20% profit, ROUND_UP → 17.00", () => {
  const c = computeFromRule(RULE(), { supplierKey: "amazon", supplierPrice: 12.5 });
  assertEquals(c.finalPrice, "17.00");
  assertEquals(c.finalPriceCents, 1700);
  assertEquals(c.supplierPrice, "12.50");
  assertEquals(c.ruleVersion, 3);
  assert(c.appliedRules.length === 6, "documented 6-step rule order");
});

Deno.test("computeFromRule: user B story — different settings → different price (END_99)", () => {
  const userB = RULE({
    profit_margin_percent: 50,
    minimum_profit: 10,
    shipping_buffer: 2,
    fixed_handling_fee: 0,
    marketplace_fee_percent: 13,
    currency_buffer_percent: 2,
    rounding_rule: "END_99",
    rule_version: 7,
  });
  const c = computeFromRule(userB, { supplierKey: "amazon", supplierPrice: 12.5 });
  assertEquals(c.finalPrice, "26.99"); // hand-computed: base 14.50 + 1.89 + 0.29 + max(7.25,10) → 26.68 → END_99
  const a = computeFromRule(RULE(), { supplierKey: "amazon", supplierPrice: 12.5 });
  assert(a.finalPrice !== c.finalPrice, "two users' settings must yield different prices");
});

Deno.test("computeFromRule: deterministic — same input twice → identical result", () => {
  const a = computeFromRule(RULE(), { supplierKey: "amazon", supplierPrice: "19.99", supplierShippingCost: "4.95" });
  const b = computeFromRule(RULE(), { supplierKey: "amazon", supplierPrice: "19.99", supplierShippingCost: "4.95" });
  assertEquals(a.finalPrice, b.finalPrice);
  assertEquals(a.finalPriceCents, b.finalPriceCents);
});

Deno.test("computeFromRule: disabled rule → RULE_DISABLED", () => {
  assertThrowsCode(
    () => computeFromRule(RULE({ is_enabled: false }), { supplierKey: "amazon", supplierPrice: 10 }),
    "RULE_DISABLED",
  );
});

Deno.test("validatePricingInput: invalid prices are rejected, never defaulted", () => {
  for (const bad of [0, -1, NaN, Infinity, "", "abc", null as unknown as number]) {
    assertThrowsCode(
      () => validatePricingInput({ supplierKey: "amazon", supplierPrice: bad as number | string }),
      "INVALID_SUPPLIER_PRICE",
    );
  }
});

Deno.test("validatePricingInput: non-USD currency is rejected (no invented FX)", () => {
  assertThrowsCode(
    () => validatePricingInput({ supplierKey: "amazon", supplierPrice: 10, sourceCurrency: "EUR" }),
    "UNSUPPORTED_CURRENCY",
  );
});

Deno.test("validatePricingInput: currency-symbol strings are normalized", () => {
  const v = validatePricingInput({ supplierKey: "amazon", supplierPrice: "$12.50", supplierShippingCost: "$2.00" });
  assertEquals(v.price, 12.5);
  assertEquals(v.shipping, 2);
  assertEquals(v.currency, "USD");
});

Deno.test("inferSupplierFromUrl: known supplier domains map to keys", () => {
  assertEquals(inferSupplierFromUrl("https://www.amazon.com/dp/B0TEST123"), "amazon");
  assertEquals(inferSupplierFromUrl("https://www.walmart.com/ip/thing/123"), "walmart");
  assertEquals(inferSupplierFromUrl("https://es.aliexpress.com/item/1.html"), "aliexpress");
  assertEquals(inferSupplierFromUrl("https://www.temu.com/x.html"), "temu");
  assertEquals(inferSupplierFromUrl("https://www.alibaba.com/product-detail/1.html"), "alibaba");
  assertEquals(inferSupplierFromUrl("https://www.ebay.com/itm/1"), null);
  assertEquals(inferSupplierFromUrl("not a url"), null);
  assertEquals(inferSupplierFromUrl(null), null);
});

Deno.test("defaultRuleForSupplier: seeds the documented defaults", () => {
  const d = defaultRuleForSupplier("user-1", "walmart");
  assertEquals(d.profit_margin_percent, 25);
  assertEquals(d.minimum_profit, 5);
  // The marketplace fee belongs to eBay (the selling venue), not the supplier:
  // all new seeds use the honest eBay default, on formula v2.
  assertEquals(d.marketplace_fee_percent, 13.25);
  assertEquals(d.rounding_rule, "END_99");
  assertEquals(d.rule_version, 1);
});

Deno.test("breakdownForStorage: auditable, JSON-serializable, carries rule identity", () => {
  const c = computeFromRule(RULE(), { supplierKey: "amazon", supplierPrice: 12.5 });
  const b = breakdownForStorage(c);
  const roundTrip = JSON.parse(JSON.stringify(b));
  assertEquals(roundTrip.finalPrice, "17.00");
  assertEquals(roundTrip.ruleVersion, 3);
  assertEquals(roundTrip.settingsId, "rule-1");
  assertEquals(roundTrip.engine, "pricing-core@cents");
  assert(Array.isArray(roundTrip.appliedRules) && roundTrip.appliedRules.length === 6);
});

// ─── Formula v2 — sale-based gross-up ─────────────────────────────────────────

const RULE_V2 = (over: Record<string, unknown> = {}) =>
  RULE({
    formula_version: 2,
    per_order_fee: 0.30,
    fixed_handling_fee: 0,
    marketplace_fee_percent: 13.25,
    rounding_rule: "NONE",
    ...over,
  });

Deno.test("v2: $10 cost, 20% profit, 13.25% of sale + $0.30 → 14.18 with exactly $2.00 realized", () => {
  const c = computeFromRule(RULE_V2(), { supplierKey: "amazon", supplierPrice: 10 });
  assertEquals(c.finalPrice, "14.18");
  assertEquals(c.profit, "2.00");
  assertEquals(c.formulaVersion, 2);
  assertEquals(c.perOrderFee, "0.30");
  assert(c.appliedRules.length === 7, "v2 documents a 7-step rule order");
});

Deno.test("v2: minimum REALIZED profit binds ($5 floor → 17.64)", () => {
  const c = computeFromRule(RULE_V2({ profit_margin_percent: 0, minimum_profit: 5 }), {
    supplierKey: "amazon",
    supplierPrice: 10,
  });
  assertEquals(c.finalPrice, "17.64");
  assertEquals(c.profit, "5.00");
});

Deno.test("v2: fees too high → FEES_TOO_HIGH domain error (never a silent fallback)", () => {
  assertThrowsCode(
    () =>
      computeFromRule(RULE_V2({ marketplace_fee_percent: 60, currency_buffer_percent: 20 }), {
        supplierKey: "amazon",
        supplierPrice: 10,
      }),
    "FEES_TOO_HIGH",
  );
});

Deno.test("v2: breakdownForStorage carries formulaVersion + perOrderFee for the audit trail", () => {
  const c = computeFromRule(RULE_V2(), { supplierKey: "amazon", supplierPrice: 10 });
  const b = JSON.parse(JSON.stringify(breakdownForStorage(c)));
  assertEquals(b.formulaVersion, 2);
  assertEquals(b.perOrderFee, "0.30");
});

Deno.test("v1 rows are untouched: missing formula_version defaults to the legacy path", () => {
  const c = computeFromRule(RULE(), { supplierKey: "amazon", supplierPrice: 12.5 });
  assertEquals(c.formulaVersion, 1);
  assertEquals(c.finalPrice, "17.00"); // same hand-computed v1 value as before
  assertEquals(c.perOrderFee, "0.00"); // v1 ignores the per-order fee entirely
});

Deno.test("v2 seeding defaults: eBay-honest fee + per-order fee + formula_version 2", () => {
  const d = defaultRuleForSupplier("user-1", "amazon") as Record<string, unknown>;
  assertEquals(d.formula_version, 2);
  assertEquals(d.per_order_fee, 0.30);
  assertEquals(d.marketplace_fee_percent, 13.25);
});

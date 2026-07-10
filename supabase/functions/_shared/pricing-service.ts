// pricing-service.ts — server-side authoritative pricing for product imports.
//
// Single entry point every price-writing edge function must use when a raw
// supplier price is present: create-listing, sync-listing (expected-price
// audit), and any future import channel (bulk, CSV, re-scrape, mobile).
//
// Responsibilities:
//   1. Resolve the AUTHENTICATED user's active per-supplier pricing rule from
//      user_pricing_settings (seeding the default row when missing — same
//      defaults as the pricing-settings edge function).
//   2. Validate raw supplier input (currency, price) with domain errors.
//   3. Compute the selling price via _shared/pricing-core.js (integer cents,
//      deterministic, identical math to the extension + dashboard mirror).
//   4. Return an auditable breakdown + rule version for persistence.
//
// This module NEVER persists anything itself (persistence belongs to the
// calling function) and NEVER trusts a client-supplied user id — callers pass
// the userId they resolved from verified auth (JWT / extension session).

import { calculatePrice } from "./pricing-core.js";
import {
  EBAY_FEE_DEFAULT_PERCENT,
  EBAY_PER_ORDER_FEE_DEFAULT,
  SUPPLIER_DEFAULTS,
  VALID_SUPPLIER_KEYS,
} from "./pricing-validation.ts";

// Minimal client surface so both supabase-js v2 clients type-check without
// dragging generated Database generics into every caller.
// deno-lint-ignore no-explicit-any
type AnyClient = any;

/** Currencies the pricing engine can process today. Conversion is not yet
 * implemented — non-USD raw prices must be rejected, never guessed. */
export const SUPPORTED_SOURCE_CURRENCIES = new Set(["USD"]);

export type PricingErrorCode =
  | "INVALID_SUPPLIER"
  | "UNSUPPORTED_CURRENCY"
  | "INVALID_SUPPLIER_PRICE"
  | "NO_ACTIVE_RULE"
  | "RULE_DISABLED"
  | "FEES_TOO_HIGH"
  | "CALCULATION_FAILED";

export class PricingError extends Error {
  code: PricingErrorCode;
  constructor(code: PricingErrorCode, message: string) {
    super(message);
    this.name = "PricingError";
    this.code = code;
  }
}

export interface PricingInput {
  /** Validated supplier key, e.g. "amazon" | "walmart" | "aliexpress" | "temu" | "alibaba". */
  supplierKey: string;
  /** Raw supplier price as scraped (decimal number or numeric string). */
  supplierPrice: number | string;
  /** Supplier-side shipping cost (0 when free/unknown). */
  supplierShippingCost?: number | string;
  /** ISO currency of the raw price. Only USD is supported today. */
  sourceCurrency?: string;
}

export interface AppliedPricingRuleStep {
  ruleType: string;
  label: string;
  configuredValue: string | number;
  calculatedAmount: string;
  sequence: number;
}

export interface PricingComputation {
  finalPrice: string;               // "24.99" — decimal string, display-safe
  finalPriceCents: number;          // 2499 — integer cents for comparisons
  supplierPrice: string;
  supplierShippingCost: string;
  sourceCurrency: string;
  targetCurrency: string;           // USD (no conversion implemented)
  baseCost: string;
  marketplaceFee: string;
  currencyBuffer: string;
  perOrderFee: string;              // "0.30" — v2 fixed fee; "0.00" under v1
  profit: string;
  marginPercent: number;
  formulaVersion: number;           // 1 = legacy additive, 2 = sale-based gross-up
  appliedRules: AppliedPricingRuleStep[];
  supplierKey: string;
  settingsId: string | null;
  ruleVersion: number | null;
  settingsUpdatedAt: string | null;
  calculatedAt: string;             // ISO-8601
}

interface PricingRuleRow {
  id: string;
  supplier_key: string;
  is_enabled: boolean;
  profit_margin_percent: number | string;
  minimum_profit: number | string;
  shipping_buffer: number | string;
  fixed_handling_fee: number | string;
  marketplace_fee_percent: number | string;
  currency_buffer_percent: number | string;
  rounding_rule: string;
  rule_version: number;
  updated_at: string;
  formula_version?: number;
  per_order_fee?: number | string;
}

/** Default rule values seeded for a supplier the user has never configured.
 * Mirrors seedMissingSuppliers in the pricing-settings edge function.
 * New seeds start on formula v2 (sale-based gross-up) with honest eBay
 * defaults — the marketplace fee belongs to eBay, not the supplier. */
export function defaultRuleForSupplier(userId: string, supplierKey: string) {
  const d = SUPPLIER_DEFAULTS[supplierKey];
  return {
    user_id: userId,
    supplier_key: supplierKey,
    supplier_name: d.supplierName,
    supplier_domains: d.domains,
    is_enabled: true,
    profit_margin_percent: 25,
    minimum_profit: 5,
    shipping_buffer: 3,
    fixed_handling_fee: 0,
    marketplace_fee_percent: EBAY_FEE_DEFAULT_PERCENT,
    currency_buffer_percent: 2,
    rounding_rule: "END_99",
    rule_version: 1,
    formula_version: 2,
    per_order_fee: EBAY_PER_ORDER_FEE_DEFAULT,
  };
}

/** Infer a supplier key from a product URL using SUPPLIER_DEFAULTS domains.
 * Returns null when no known supplier matches (callers decide the fallback). */
export function inferSupplierFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const [key, def] of Object.entries(SUPPLIER_DEFAULTS)) {
    if (def.domains.some((d) => host === d || host.endsWith(`.${d}`))) return key;
  }
  return null;
}

/**
 * Resolve the ACTIVE pricing rule for (userId, supplierKey), seeding the
 * default row when the user has never opened Supplier Pricing settings.
 *
 * @param admin  service-role client (seeding writes bypass RLS intentionally,
 *               but every query here is explicitly scoped to userId).
 */
export async function resolvePricingRule(
  admin: AnyClient,
  userId: string,
  supplierKey: string,
): Promise<PricingRuleRow> {
  if (!VALID_SUPPLIER_KEYS.has(supplierKey)) {
    throw new PricingError("INVALID_SUPPLIER", `No pricing support for supplier "${supplierKey}"`);
  }

  const { data: existing, error: fetchErr } = await admin
    .from("user_pricing_settings")
    .select("id, supplier_key, is_enabled, profit_margin_percent, minimum_profit, shipping_buffer, fixed_handling_fee, marketplace_fee_percent, currency_buffer_percent, rounding_rule, rule_version, updated_at, formula_version, per_order_fee")
    .eq("user_id", userId)
    .eq("supplier_key", supplierKey)
    .maybeSingle();

  if (fetchErr) {
    throw new PricingError("NO_ACTIVE_RULE", `Failed to load pricing rule: ${fetchErr.message}`);
  }
  if (existing) return existing as PricingRuleRow;

  // First use for this supplier — seed the default row (idempotent upsert;
  // ignoreDuplicates protects against a concurrent seed from pricing-settings).
  const { error: seedErr } = await admin
    .from("user_pricing_settings")
    .upsert(defaultRuleForSupplier(userId, supplierKey), {
      onConflict: "user_id,supplier_key",
      ignoreDuplicates: true,
    });
  if (seedErr) {
    throw new PricingError("NO_ACTIVE_RULE", `Failed to seed default pricing rule: ${seedErr.message}`);
  }

  const { data: seeded, error: reErr } = await admin
    .from("user_pricing_settings")
    .select("id, supplier_key, is_enabled, profit_margin_percent, minimum_profit, shipping_buffer, fixed_handling_fee, marketplace_fee_percent, currency_buffer_percent, rounding_rule, rule_version, updated_at, formula_version, per_order_fee")
    .eq("user_id", userId)
    .eq("supplier_key", supplierKey)
    .maybeSingle();

  if (reErr || !seeded) {
    throw new PricingError("NO_ACTIVE_RULE", `No active pricing rule for supplier "${supplierKey}"`);
  }
  return seeded as PricingRuleRow;
}

/** Validate + normalize raw pricing input. Throws PricingError on bad data —
 * a missing or malformed supplier price must NEVER silently price a product. */
export function validatePricingInput(input: PricingInput): { price: number; shipping: number; currency: string } {
  const currency = String(input.sourceCurrency ?? "USD").toUpperCase().trim() || "USD";
  if (!SUPPORTED_SOURCE_CURRENCIES.has(currency)) {
    throw new PricingError(
      "UNSUPPORTED_CURRENCY",
      `Source currency "${currency}" is not supported yet (supported: ${[...SUPPORTED_SOURCE_CURRENCIES].join(", ")}). ` +
      `Currency conversion is intentionally not guessed.`,
    );
  }

  const price = typeof input.supplierPrice === "string"
    ? parseFloat(input.supplierPrice.replace(/[^\d.-]/g, ""))
    : Number(input.supplierPrice);
  if (!isFinite(price) || price <= 0) {
    throw new PricingError(
      "INVALID_SUPPLIER_PRICE",
      `Supplier price "${input.supplierPrice}" is not a positive number. Refusing to price this product.`,
    );
  }

  const shippingRaw = input.supplierShippingCost ?? 0;
  const shipping = typeof shippingRaw === "string"
    ? parseFloat(shippingRaw.replace(/[^\d.-]/g, ""))
    : Number(shippingRaw);
  const shippingSafe = isFinite(shipping) && shipping > 0 ? shipping : 0;

  return { price, shipping: shippingSafe, currency };
}

/** Pure computation from an already-resolved rule row (unit-testable without a DB). */
export function computeFromRule(rule: PricingRuleRow, input: PricingInput): PricingComputation {
  const { price, shipping, currency } = validatePricingInput(input);

  if (rule.is_enabled === false) {
    throw new PricingError(
      "RULE_DISABLED",
      `Pricing for supplier "${input.supplierKey}" is disabled in your Supplier Pricing settings.`,
    );
  }

  const formulaVersion = Number(rule.formula_version ?? 1);

  let breakdown: ReturnType<typeof calculatePrice>;
  try {
    breakdown = calculatePrice(
      {
        supplierKey: rule.supplier_key,
        ruleVersion: rule.rule_version,
        formulaVersion,
        perOrderFee: Number(rule.per_order_fee ?? 0),
        profitMarginPercent: Number(rule.profit_margin_percent),
        minimumProfit: Number(rule.minimum_profit),
        shippingBuffer: Number(rule.shipping_buffer),
        fixedHandlingFee: Number(rule.fixed_handling_fee),
        marketplaceFeePercent: Number(rule.marketplace_fee_percent),
        currencyBufferPercent: Number(rule.currency_buffer_percent),
        roundingRule: rule.rounding_rule,
      },
      price,
      shipping,
    );
  } catch (e) {
    const msg = (e as Error).message || "";
    if (/fees too high/i.test(msg)) {
      throw new PricingError("FEES_TOO_HIGH", `Calculation refused: ${msg}`);
    }
    throw new PricingError("CALCULATION_FAILED", `Calculation error: ${msg}`);
  }

  const b = breakdown.breakdown; // integer-cent internals from pricing-core
  const perOrderFeeDisplay = (breakdown as { perOrderFee?: string }).perOrderFee ?? "0.00";

  // Deterministic, documented rule order (matches pricing-core.js).
  // v1 (legacy additive — fee bases are COST):
  //   1. baseCost = supplierPrice + shippingCost + shippingBuffer + fixedHandlingFee
  //   2. marketplaceFee = baseCost * marketplaceFeePercent%
  //   3. currencyBuffer = baseCost * currencyBufferPercent%
  //   4. targetProfit = max(baseCost * profitMarginPercent%, minimumProfit)
  //   5. rawFinal = baseCost + marketplaceFee + currencyBuffer + targetProfit
  //   6. finalPrice = rounding(rawFinal)  — rounding never reduces the price
  // v2 (sale-based gross-up — fee bases are the FINAL price):
  //   1. totalCost = supplierPrice + shippingCost + shippingBuffer + fixedHandlingFee
  //   2. price = max((totalCost*(1+profit%) + perOrderFee) / (1 - pctOfSale),
  //                  (totalCost + perOrderFee + minimumProfit) / (1 - pctOfSale))
  //   3. finalPrice = rounding(price), bump-verified so realized profit >= target
  const appliedRules: AppliedPricingRuleStep[] = formulaVersion === 2
    ? [
      { ruleType: "shipping_buffer",  label: "Shipping buffer",                configuredValue: Number(rule.shipping_buffer),         calculatedAmount: breakdown.shippingBuffer,   sequence: 1 },
      { ruleType: "fixed_handling",   label: "Fixed handling fee",             configuredValue: Number(rule.fixed_handling_fee),      calculatedAmount: breakdown.fixedHandlingFee, sequence: 2 },
      { ruleType: "per_order_fee",    label: "Marketplace per-order fee",      configuredValue: Number(rule.per_order_fee ?? 0),      calculatedAmount: perOrderFeeDisplay,         sequence: 3 },
      { ruleType: "marketplace_fee",  label: "Marketplace fee (% of sale)",    configuredValue: Number(rule.marketplace_fee_percent), calculatedAmount: breakdown.marketplaceFee,   sequence: 4 },
      { ruleType: "currency_buffer",  label: "Currency buffer (% of sale)",    configuredValue: Number(rule.currency_buffer_percent), calculatedAmount: breakdown.currencyBuffer,   sequence: 5 },
      { ruleType: "profit_margin",    label: "Realized profit (markup % vs minimum)", configuredValue: Number(rule.profit_margin_percent), calculatedAmount: breakdown.profit,     sequence: 6 },
      { ruleType: "rounding",         label: `Rounding (${rule.rounding_rule})`, configuredValue: rule.rounding_rule,                 calculatedAmount: ((b.finalCents - b.rawFinal) / 100).toFixed(2), sequence: 7 },
    ]
    : [
      { ruleType: "shipping_buffer",  label: "Shipping buffer",         configuredValue: Number(rule.shipping_buffer),          calculatedAmount: breakdown.shippingBuffer,   sequence: 1 },
      { ruleType: "fixed_handling",   label: "Fixed handling fee",      configuredValue: Number(rule.fixed_handling_fee),       calculatedAmount: breakdown.fixedHandlingFee, sequence: 2 },
      { ruleType: "marketplace_fee",  label: "Marketplace fee %",       configuredValue: Number(rule.marketplace_fee_percent),  calculatedAmount: breakdown.marketplaceFee,   sequence: 3 },
      { ruleType: "currency_buffer",  label: "Currency buffer %",       configuredValue: Number(rule.currency_buffer_percent),  calculatedAmount: breakdown.currencyBuffer,   sequence: 4 },
      { ruleType: "profit_margin",    label: "Profit (margin % vs minimum)", configuredValue: Number(rule.profit_margin_percent), calculatedAmount: (b.tgtProfit / 100).toFixed(2), sequence: 5 },
      { ruleType: "rounding",         label: `Rounding (${rule.rounding_rule})`, configuredValue: rule.rounding_rule,            calculatedAmount: ((b.finalCents - b.rawFinal) / 100).toFixed(2), sequence: 6 },
    ];

  return {
    finalPrice: breakdown.finalPrice,
    finalPriceCents: b.finalCents,
    supplierPrice: breakdown.supplierPrice,
    supplierShippingCost: breakdown.shippingCost,
    sourceCurrency: currency,
    targetCurrency: "USD",
    baseCost: breakdown.baseCost,
    marketplaceFee: breakdown.marketplaceFee,
    currencyBuffer: breakdown.currencyBuffer,
    perOrderFee: perOrderFeeDisplay,
    profit: breakdown.profit,
    marginPercent: breakdown.marginPercent,
    formulaVersion,
    appliedRules,
    supplierKey: rule.supplier_key,
    settingsId: rule.id ?? null,
    ruleVersion: rule.rule_version ?? null,
    settingsUpdatedAt: rule.updated_at ?? null,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Authoritative price for one product/variant for the AUTHENTICATED user.
 * userId must come from verified auth (never the request body).
 */
export async function priceForUser(
  admin: AnyClient,
  userId: string,
  input: PricingInput,
): Promise<PricingComputation> {
  const rule = await resolvePricingRule(admin, userId, input.supplierKey);
  return computeFromRule(rule, input);
}

/** Compact JSON persisted into listings.pricing_breakdown (audit trail). */
export function breakdownForStorage(c: PricingComputation): Record<string, unknown> {
  return {
    engine: "pricing-core@cents",
    formulaVersion: c.formulaVersion,
    supplierKey: c.supplierKey,
    ruleVersion: c.ruleVersion,
    settingsId: c.settingsId,
    settingsUpdatedAt: c.settingsUpdatedAt,
    sourceCurrency: c.sourceCurrency,
    targetCurrency: c.targetCurrency,
    supplierPrice: c.supplierPrice,
    supplierShippingCost: c.supplierShippingCost,
    baseCost: c.baseCost,
    marketplaceFee: c.marketplaceFee,
    currencyBuffer: c.currencyBuffer,
    perOrderFee: c.perOrderFee,
    profit: c.profit,
    marginPercent: c.marginPercent,
    finalPrice: c.finalPrice,
    appliedRules: c.appliedRules,
    calculatedAt: c.calculatedAt,
  };
}

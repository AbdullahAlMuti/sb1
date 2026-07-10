// pricing-validation.ts — shared input validators for pricing edge functions.
// Throws with a descriptive message; caller wraps in try/catch → 400 response.

export const VALID_SUPPLIER_KEYS = new Set(['amazon', 'walmart', 'aliexpress', 'temu', 'alibaba']);
export const VALID_ROUNDING_RULES = new Set(['NONE', 'END_99', 'END_95', 'END_49', 'ROUND_UP']);

// Honest eBay defaults used when seeding v2 rules. The marketplace fee is a
// property of eBay (the selling venue), not of the supplier: ~13.25% of the
// sale for most categories plus a $0.30 fixed per-order fee. Users adjust per
// category / store tier in Supplier Pricing.
export const EBAY_FEE_DEFAULT_PERCENT = 13.25;
export const EBAY_PER_ORDER_FEE_DEFAULT = 0.30;
export const PRICING_FORMULA_VERSIONS = new Set([1, 2]);

export const SUPPLIER_DEFAULTS: Record<string, {
  supplierName: string;
  domains: string[];
  marketplaceFeePercent: number;
}> = {
  amazon: {
    supplierName: 'Amazon',
    domains: ['amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.ca', 'amazon.com.au'],
    marketplaceFeePercent: 13,
  },
  walmart: {
    supplierName: 'Walmart',
    domains: ['walmart.com', 'walmart.ca'],
    marketplaceFeePercent: 8,
  },
  aliexpress: {
    supplierName: 'AliExpress',
    domains: ['aliexpress.com', 'aliexpress.ru', 'aliexpress.us'],
    marketplaceFeePercent: 5,
  },
  temu: {
    supplierName: 'Temu',
    domains: ['temu.com'],
    marketplaceFeePercent: 8,
  },
  alibaba: {
    supplierName: 'Alibaba',
    domains: ['alibaba.com'],
    marketplaceFeePercent: 5,
  },
};

export function validateSupplierKey(key: unknown): string {
  if (typeof key !== 'string' || !VALID_SUPPLIER_KEYS.has(key)) {
    throw new RangeError(`Invalid supplierKey "${key}". Must be one of: ${[...VALID_SUPPLIER_KEYS].join(', ')}`);
  }
  return key;
}

export function validateRoundingRule(rule: unknown): string {
  if (typeof rule !== 'string' || !VALID_ROUNDING_RULES.has(rule)) {
    throw new RangeError(`Invalid roundingRule "${rule}". Must be one of: ${[...VALID_ROUNDING_RULES].join(', ')}`);
  }
  return rule;
}

export function validateNumericRange(
  val: unknown,
  min: number,
  max: number,
  field: string,
): number {
  const n = Number(val);
  if (!isFinite(n)) throw new RangeError(`${field} must be a finite number, got "${val}"`);
  if (n < min || n > max) throw new RangeError(`${field} must be between ${min} and ${max}, got ${n}`);
  return n;
}

export function validateNonNegative(val: unknown, field: string): number {
  const n = Number(val);
  if (!isFinite(n)) throw new RangeError(`${field} must be a finite number, got "${val}"`);
  if (n < 0) throw new RangeError(`${field} must be >= 0, got ${n}`);
  return n;
}

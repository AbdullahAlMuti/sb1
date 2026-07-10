# Pricing Architecture — Single Source of Truth

> Status: authoritative since `fix/central-pricing-engine` (2026-07).
> Any supplier's raw scraped price + the authenticated user's active dashboard
> calculator settings = the correct, secure, traceable final selling price.

## The one engine

All selling prices — dashboard preview, extension scan, eBay upload, dashboard
import, re-import, variants — are produced by **one formula** with **one
settings source**:

| Piece | File | Runtime |
|---|---|---|
| Canonical engine | `apps/extension/suppliers/core/pricing-core.js` (`SSPricingCore`) | extension (bundles + panels) |
| Server copy (generated) | `supabase/functions/_shared/pricing-core.js` — written by `apps/extension/scripts/sync-pricing-core.js`; **never hand-edit** | Deno edge functions |
| Dashboard mirror | `apps/web/src/lib/pricing-calculator.ts` — TS mirror for the live preview; backend remains authoritative | web app |
| Rule application (extension) | `apps/extension/common/pricing-apply.js` (`SSPricingApply`) — the only module allowed to stamp `finalPrice`/`ebayPrice` on scraped products | extension |
| Rule resolution + server pricing | `supabase/functions/_shared/pricing-service.ts` — resolves the authenticated user's rule, validates input, computes, returns an auditable breakdown | Deno edge functions |

Settings live in **`user_pricing_settings`** (one row per user per supplier,
RLS-enforced, `rule_version` bumped on every save). They are edited in the
dashboard at **Dashboard → eBay → Supplier Pricing** (`CalculatorSettings.tsx`
→ `pricing-settings` edge function).

There is deliberately **no pricing formula** in: supplier adapters, content
scripts, the background worker, React components, controllers, or DB triggers.
`ui/calculator.js` is a what-if popup only; a price applied from it travels as
an explicit manual override.

## Formula and deterministic rule order

All math in integer cents. Parsing happens once at entry, display formatting
once at exit. Rounding never reduces the price.

```
1. baseCost        = supplierPrice + shippingCost + shippingBuffer + fixedHandlingFee
2. marketplaceFee  = round(baseCost × marketplaceFeePercent%)
3. currencyBuffer  = round(baseCost × currencyBufferPercent%)
4. targetProfit    = max(round(baseCost × profitMarginPercent%), minimumProfit)
5. rawFinal        = baseCost + marketplaceFee + currencyBuffer + targetProfit
6. finalPrice      = applyRounding(rawFinal)   // NONE | END_99 | END_95 | END_49 | ROUND_UP
```

Invalid input (missing/zero/negative/NaN price, unsupported currency) throws —
**a product is never silently priced from a fabricated cost.** (The legacy
engine's `$50` default is gone.)

Currency: only `USD` sources are supported today. Non-USD raw prices are
rejected with `UNSUPPORTED_CURRENCY` — no FX rate is ever guessed. When
conversion ships, it must happen exactly once, before step 1, with the rate +
timestamp recorded in the breakdown.

## End-to-end flow

```
Supplier page ──(adapter scrapes RAW price)──► SSPricingApply
      ▲                                            │ uses pricingRulesCache —
      │                                            │ user_pricing_settings synced via
      │                                            │ pricing-rules-sync (ETag, 10-min alarm,
      │                                            │ forced on panel open + dashboard save)
      │                                            ▼
   eBay upload ◄──(validateProductPricing)── finalPrice/ebayPrice stamped
      │                                            │
      ▼                                            ▼
 create-listing / sync-listing  ──►  _shared/pricing-service.ts
      • resolves the AUTHENTICATED user's rule server-side (never a body userId)
      • recomputes the price from the RAW supplier price
      • draft/import writes: server value is persisted (authoritative)
      • post-upload writes (real ebay_item_id): eBay price recorded as reality,
        expected price + drift stored for audit (admin_audit_logs on >1¢ drift)
      • manual overrides (price_source = 'manual') honored and flagged
      ▼
 listings / listing_variations
      • raw supplier data:   supplier, supplier_product_id, supplier_url,
                             supplier_price, supplier_currency, raw_supplier_price
      • calculated result:   ebay_price / final_price
      • audit trail:         pricing_breakdown (jsonb), pricing_rule_version,
                             price_calculated_at, pricing_drift_cents, price_source
```

Raw supplier prices are **never overwritten** by calculated values, and
re-pricing always starts from the raw price — re-imports can never compound
markup (locked by `tests/pricing-apply.test.js`).

### `price_source` vocabulary

| Value | Meaning |
|---|---|
| `calculated` | Produced by the pricing engine from the user's active rule |
| `manual` | Explicit user override — engine and server both leave it alone |
| `ebay_upload` | Recorded from the live eBay listing post-upload |
| `client` | Legacy payload without supplier data (e.g. eBay-side sync) |
| `client_unverified` | Client value kept because server pricing was unavailable (rule disabled, unsupported currency) — logged |

## API contract (create-listing)

Request additions (all optional, legacy Amazon-named fields still accepted):

```jsonc
{
  "supplier": "walmart",              // validated against known supplier keys
  "supplier_id": "123456",            // supplier product id
  "supplier_url": "https://www.walmart.com/ip/123456",
  "supplier_price": 12.50,            // RAW supplier price (never the selling price)
  "supplier_currency": "USD",
  "supplier_shipping_cost": 2.00,
  "price_source": "calculated",      // or "manual" for explicit overrides
  "variations": [{ "sku": "…", "raw_supplier_price": 8.00, "final_price": 0, "price_source": null }]
}
```

Behavior: with a resolvable supplier + raw price and no manual flag, the server
recomputes `ebay_price` and every variation `final_price` from raw prices with
the user's active rule, stores the breakdown, and audits drift vs. any
client-sent price. A payload that requests calculation but has no valid price
and no client fallback is rejected with HTTP 422 (`INVALID_SUPPLIER_PRICE`,
`UNSUPPORTED_CURRENCY`, …) — nothing is saved.

## Settings changes propagate

1. Dashboard save → `pricing-settings` PUT bumps `rule_version`, `updated_at`.
2. `CalculatorSettings.tsx` posts `SS_PRICING_RULES_UPDATED` → `bridge.js` →
   `FORCE_PRICING_SYNC` → `pricing-rule-sync.js` refreshes the cache (ETag).
3. Panel open triggers the same forced sync; a 10-minute alarm is the backstop.
4. `panel-main.js` re-prices the current product when the cache changes.
5. Server-side, every import resolves the rule fresh from the DB — an
   extension with stale rules produces a logged drift and the server value
   wins on draft/import writes.

Existing products are **not** silently recalculated when settings change
(deliberate — see Remaining work).

## Database

Migration `20260711100000_central_pricing_authority.sql` (additive, idempotent,
rollback documented in the file header):

* `listings` + supplier-neutral raw columns, pricing audit columns, provenance
  flags (`price_source`, `title_source`, `description_source`, `sku_source` —
  these were being sent by the extension and silently dropped before).
* `listing_variations` + `price_source`, `pricing_rule_version`.
* Backfill: `supplier='amazon'`, `supplier_product_id=amazon_asin`,
  `supplier_url=amazon_url`, `supplier_price=amazon_price` where inferable.
* `idx_listings_user_supplier_pid` for idempotent non-Amazon imports.
* `create_listing_with_variations` RPC replaced with a strict superset
  (same ON CONFLICT semantics, return shape unchanged; adds the new columns +
  supplier-neutral dedupe when no ASIN).

Schema invariants are locked by `supabase/tests/pricing_authority_test.sql`
(pgTAP, `supabase test db`).

## Tests

| Suite | Command | Covers |
|---|---|---|
| Engine math | `node --test apps/extension/tests/pricing-core.test.js` | cents parsing, rounding rules, formula |
| Rule application | `node --test apps/extension/tests/pricing-apply.test.js` | user isolation, settings changes, re-import safety, manual overrides, no fabricated prices |
| Scan parity | `node --test apps/extension/tests/scan-pricing-parity.test.js` | every injector delegates to SSPricingApply; bundles include the engine |
| E2E pipeline | `node --test apps/extension/tests/e2e-simulation.test.js` | scrape → price → adapt → upload validation |
| Server pricing | `deno test supabase/functions/_shared/pricing-service.test.ts` | server computation, input validation, supplier inference |
| Schema | `supabase test db` (`pricing_authority_test.sql`) | raw/calculated separation, RLS, indexes |

## Remaining work (explicitly out of scope here)

* **Recalculate existing products** — an explicit, user-triggered batch action
  (select own products → reprice from stored `supplier_price` with latest
  rule → audit). The data model now supports it (`supplier_price`,
  `pricing_rule_version`).
* **Currency conversion** — adapters should extract source currency; the
  service rejects non-USD until a real FX source exists.
* **eBay price update-back** — when a draft price drifts from a live eBay
  listing, surface it in the dashboard rather than only in audit logs.

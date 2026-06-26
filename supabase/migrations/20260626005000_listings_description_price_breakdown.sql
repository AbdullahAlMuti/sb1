-- Add price-breakdown columns and final_description to listings.
--
-- Audit findings:
--   - Only the final ebay_price was persisted; the full fee breakdown
--     (supplier cost, tax, fees, markup, profit, currency) was discarded.
--   - The final rendered description was not stored — only in eBay and ephemeral
--     in the extension; not auditable or re-generatable from the dashboard.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS final_description      text,
  ADD COLUMN IF NOT EXISTS price_supplier         numeric(12,4),
  ADD COLUMN IF NOT EXISTS price_tax_amount       numeric(12,4),
  ADD COLUMN IF NOT EXISTS price_tracking_fee     numeric(12,4),
  ADD COLUMN IF NOT EXISTS price_payment_fee      numeric(12,4),
  ADD COLUMN IF NOT EXISTS price_ebay_fee_pct     numeric(6,4),
  ADD COLUMN IF NOT EXISTS price_promo_fee_pct    numeric(6,4),
  ADD COLUMN IF NOT EXISTS price_profit_pct       numeric(6,4),
  ADD COLUMN IF NOT EXISTS price_markup_amount    numeric(12,4),
  ADD COLUMN IF NOT EXISTS price_currency         text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS price_breakdown        jsonb;

COMMENT ON COLUMN public.listings.final_description   IS 'HTML description as sent to eBay (post-sanitization).';
COMMENT ON COLUMN public.listings.price_supplier      IS 'Raw supplier price at time of listing.';
COMMENT ON COLUMN public.listings.price_tax_amount    IS 'Tax amount applied in price calculation.';
COMMENT ON COLUMN public.listings.price_tracking_fee  IS 'Tracking/shipping fee applied.';
COMMENT ON COLUMN public.listings.price_payment_fee   IS 'Payment processing fixed fee applied.';
COMMENT ON COLUMN public.listings.price_ebay_fee_pct  IS 'eBay final-value fee % used.';
COMMENT ON COLUMN public.listings.price_promo_fee_pct IS 'eBay promotional fee % used.';
COMMENT ON COLUMN public.listings.price_profit_pct    IS 'Target profit margin % used.';
COMMENT ON COLUMN public.listings.price_markup_amount IS 'Total markup added over supplier cost.';
COMMENT ON COLUMN public.listings.price_currency      IS 'Currency of the final eBay price.';
COMMENT ON COLUMN public.listings.price_breakdown     IS 'Full JSON breakdown for display and audit.';

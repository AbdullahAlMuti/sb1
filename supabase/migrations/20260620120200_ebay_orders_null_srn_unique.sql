-- SS-A4-001: close the NULL-sales-record-number duplicate race on ebay_orders.
--
-- Rows WITH a sales_record_number are already protected by the unique index
-- ebay_orders_user_id_sales_record_number_key. Rows WITHOUT one fall back to
-- ebay_order_id matching in sync-ebay-orders, which had no DB constraint, so
-- concurrent syncs could both insert. This adds a partial unique index for the
-- NULL-SRN case; the edge function now catches 23505 and treats it as a no-op
-- update.
--
-- NOTE: a unique index fails to build if duplicates already exist, so we first
-- collapse existing NULL-SRN duplicates, keeping the most-recently-synced row.
-- This DELETEs data — review before applying.

BEGIN;

-- 1) Remove duplicate NULL-SRN rows, keeping the newest per (user_id, ebay_order_id).
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, ebay_order_id
           ORDER BY synced_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.ebay_orders
  WHERE sales_record_number IS NULL
    AND deleted_at IS NULL
)
DELETE FROM public.ebay_orders o
USING ranked r
WHERE o.id = r.id
  AND r.rn > 1;

-- 2) Enforce uniqueness for NULL-SRN rows going forward.
CREATE UNIQUE INDEX IF NOT EXISTS ebay_orders_user_id_ebay_order_id_null_srn_key
  ON public.ebay_orders (user_id, ebay_order_id)
  WHERE sales_record_number IS NULL;

COMMIT;

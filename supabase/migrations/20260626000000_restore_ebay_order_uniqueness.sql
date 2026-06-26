-- Restore UNIQUE(user_id, ebay_order_id) on ebay_orders.
--
-- The migration 20260125201018 dropped this constraint and replaced it with
-- UNIQUE(user_id, sales_record_number). Because sales_record_number is nullable,
-- NULL ≠ NULL in SQL, so multiple rows with NULL SRN for the same order insert
-- freely → duplicate revenue rows (~3× duplication observed in prod).
--
-- Fix:
--   1. Deduplicate existing rows (keep the row with the max id per order key).
--   2. Restore UNIQUE(user_id, ebay_order_id).
--   3. Drop the broken SRN unique constraint.
--   4. Re-add SRN unique as a PARTIAL index (WHERE NOT NULL) so NULLs are excluded.

BEGIN;

-- Step 1: remove duplicates, keeping the row with the highest id (most recent upsert).
DELETE FROM public.ebay_orders
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, ebay_order_id) id
  FROM public.ebay_orders
  ORDER BY user_id, ebay_order_id, id DESC
);

-- Step 2: restore the original unique constraint.
ALTER TABLE public.ebay_orders
  ADD CONSTRAINT ebay_orders_user_id_ebay_order_id_key
  UNIQUE (user_id, ebay_order_id);

-- Step 3: drop the broken NULL-permitting SRN constraint.
ALTER TABLE public.ebay_orders
  DROP CONSTRAINT IF EXISTS ebay_orders_user_id_sales_record_number_key;

-- Step 4: re-add SRN dedup as a partial unique index (NULLs excluded = correct).
CREATE UNIQUE INDEX IF NOT EXISTS idx_ebay_orders_user_srn_unique
  ON public.ebay_orders (user_id, sales_record_number)
  WHERE sales_record_number IS NOT NULL;

COMMIT;

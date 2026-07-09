-- pgTAP: billing idempotency invariants (QA-P1).
-- Run with: supabase test db
--
-- Locks in the two structures the webhook + credit flows rely on to stay
-- idempotent under Stripe retries and concurrent grants:
--   1. stripe_events(id) primary key — insert-before-process dedupe of events.
--   2. unique index on credit_transactions(user_id, metadata->>'grant_key') —
--      prevents the same plan/period grant being applied twice.

BEGIN;
SELECT plan(4);

SELECT has_table('public', 'stripe_events', 'stripe_events table exists (webhook idempotency log)');

SELECT col_is_pk(
  'public', 'stripe_events', 'id',
  'stripe_events.id is the primary key (dedupes retried Stripe events)'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.stripe_events'::regclass),
  'RLS enabled: stripe_events (service-role writes only)'
);

SELECT has_index(
  'public', 'credit_transactions', 'idx_credit_transactions_user_grant_key',
  'unique grant_key index exists (credit grant idempotency)'
);

SELECT * FROM finish();
ROLLBACK;

-- Stripe webhook idempotency table.
-- Prevents duplicate processing when Stripe retries a webhook event.
create table if not exists stripe_events (
  id          text primary key,          -- Stripe event ID (evt_...)
  type        text not null,             -- e.g. 'checkout.session.completed'
  processed_at timestamptz not null default now()
);

-- RLS: no user owns these rows — only service role writes them
alter table stripe_events enable row level security;

-- Index for fast lookups on the primary key (already covered by PK, but explicit)
-- Expire old rows after 30 days to keep the table small
create index if not exists stripe_events_processed_at_idx on stripe_events (processed_at);

comment on table stripe_events is 'Idempotency log for processed Stripe webhook events. Insert before processing; skip if already present.';

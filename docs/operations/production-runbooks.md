# SellerSuit Production Operations Runbooks

Generated: 2026-06-04

## Backup And Restore Drill

Scope: Supabase Postgres, storage objects, Edge Function configuration, and Stripe billing records.

Repository-ready steps:

1. Select a non-production Supabase project with the current migration set applied.
2. Export schema and data with Supabase CLI or dashboard backup tooling.
3. Restore into an isolated project.
4. Run `npm run security:static`, `npm run typecheck`, and smoke-test auth, checkout, listings, orders, extension pairing, and admin pages against the restored project.
5. Record the drill date, project refs, elapsed restore time, RPO/RTO result, failures, and rollback notes.

External TODO: execute a dated restore drill in a real Supabase project and attach the evidence here.

## Monitoring And Alerting

Minimum production signals:

- Supabase Edge Function error rate, latency, and invocation count.
- Postgres CPU, memory, connection usage, slow queries, deadlocks, lock waits, and storage growth.
- Stripe webhook delivery failures and checkout completion failures.
- Background job queue depth, retry count, and dead-letter count.
- Auth OTP send/verify failures and rate-limit rejections.
- Extension token refresh failures and pairing approval failures.

External TODO: configure Sentry/OpenTelemetry/log drain plus PagerDuty or equivalent alert routing.

## DSAR, Export, And Deletion

Data subject request workflow:

1. Verify requester identity and account ownership.
2. Export profile, plan, listings, orders, usage logs, notification settings/logs, audit logs, extension devices, and workspace membership data.
3. Redact third-party identifiers that cannot be disclosed under policy.
4. Queue deletion/anonymization work for user-owned rows and revoke extension sessions.
5. Preserve legally required billing/security audit records with minimized identifiers.
6. Record request id, timestamps, reviewer, exported artifacts, deleted records, and retained-record rationale.

External TODO: connect this workflow to a user-facing request channel and a dated audit review process.

## Incident Response

Initial response:

1. Classify severity and affected systems.
2. Disable affected Edge Functions or feature flags if active exploitation is suspected.
3. Rotate impacted secrets and revoke extension sessions if credentials or tokens may be exposed.
4. Preserve logs and database snapshots before destructive cleanup.
5. Notify affected users and processors according to legal/privacy obligations.

Post-incident:

1. Produce timeline, root cause, blast radius, remediations, and prevention actions.
2. Add regression tests or static checks for the failure mode.
3. Review retention and monitoring gaps discovered during the incident.

## Retention Baseline

- Function logs: minimize PII; retain only as long as needed for security and reliability.
- Billing/audit records: retain according to legal and tax requirements.
- Extension debug data: avoid PII; clear stale diagnostics during support closure.
- Background jobs: archive successful job payloads after operational usefulness expires; dead letters require explicit review.

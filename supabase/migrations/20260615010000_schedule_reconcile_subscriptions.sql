-- Schedule the reconcile-subscriptions edge function (defense-in-depth sweep for
-- dropped/delayed Stripe webhooks). Idempotent and SAFE to run anywhere: the
-- schedule is only created when the required Vault secrets are present, so local
-- and CI migration runs never fail on a project that hasn't configured cron yet.
--
-- OPERATOR SETUP (Slice F / deploy time) — add these in Supabase → Vault:
--   * edge_base_url  → https://<project-ref>.functions.supabase.co
--   * cron_secret    → same value as the CRON_SECRET edge-function env var
-- After the secrets exist, re-run this migration (or the DO block) to register
-- the job. Re-running is harmless — the job is unscheduled then rescheduled.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_base_url text;
  v_secret   text;
begin
  select decrypted_secret into v_base_url
    from vault.decrypted_secrets where name = 'edge_base_url' limit 1;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'cron_secret' limit 1;

  if v_base_url is null or v_secret is null then
    raise notice 'reconcile-subscriptions cron NOT scheduled: set Vault secrets edge_base_url and cron_secret, then re-run.';
    return;
  end if;

  -- Remove any prior schedule so this block stays idempotent.
  perform cron.unschedule('reconcile-subscriptions')
    where exists (select 1 from cron.job where jobname = 'reconcile-subscriptions');

  -- Every 10 minutes.
  perform cron.schedule(
    'reconcile-subscriptions',
    '*/10 * * * *',
    format($cron$
      select net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', %L
        ),
        body    := '{}'::jsonb
      );
    $cron$, v_base_url || '/reconcile-subscriptions', v_secret)
  );

  raise notice 'reconcile-subscriptions cron scheduled (every 10 min).';
end;
$$;

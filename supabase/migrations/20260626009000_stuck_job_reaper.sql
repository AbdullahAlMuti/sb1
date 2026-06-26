-- Stuck-job reaper: reset or dead-letter background_jobs that have been in
-- 'running' state for more than 10 minutes (worker crashed, pod restarted, etc.).
-- Jobs with remaining attempts are reset to 'queued' with a 5-minute backoff;
-- jobs that have exhausted all attempts are moved to 'dead_letter'.

create extension if not exists pg_cron;

-- ── Reaper function ───────────────────────────────────────────────────────────

create or replace function public.reap_stuck_jobs()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stuck_threshold interval := interval '10 minutes';
  v_backoff_delay   interval := interval '5 minutes';
  v_reaped_queued   int;
  v_reaped_dead     int;
begin
  -- Jobs with remaining retries → back to queued with backoff delay.
  with reaped as (
    update public.background_jobs
    set
      status     = 'queued',
      locked_at  = null,
      locked_by  = null,
      run_after  = now() + v_backoff_delay,
      updated_at = now()
    where
      status = 'running'
      and locked_at < now() - v_stuck_threshold
      and attempts < max_attempts
    returning id
  )
  select count(*) into v_reaped_queued from reaped;

  -- Jobs that have hit max_attempts → dead_letter (no more retries).
  with reaped as (
    update public.background_jobs
    set
      status     = 'dead_letter',
      locked_at  = null,
      locked_by  = null,
      updated_at = now()
    where
      status = 'running'
      and locked_at < now() - v_stuck_threshold
      and attempts >= max_attempts
    returning id
  )
  select count(*) into v_reaped_dead from reaped;

  if v_reaped_queued > 0 or v_reaped_dead > 0 then
    raise notice '[reap_stuck_jobs] reset_to_queued=% dead_lettered=%',
      v_reaped_queued, v_reaped_dead;
  end if;
end;
$$;

-- Restrict execution to service_role; the cron job runs as the migration owner.
revoke execute on function public.reap_stuck_jobs() from public, anon, authenticated;
grant  execute on function public.reap_stuck_jobs() to service_role;

-- ── pg_cron schedule ──────────────────────────────────────────────────────────
-- Runs every 5 minutes. Pure SQL, no HTTP call or Vault secrets required.

do $$
begin
  -- Remove prior schedule so this block is idempotent.
  if exists (select 1 from cron.job where jobname = 'reap-stuck-jobs') then
    perform cron.unschedule('reap-stuck-jobs');
  end if;

  perform cron.schedule(
    'reap-stuck-jobs',
    '*/5 * * * *',
    'select public.reap_stuck_jobs()'
  );

  raise notice 'reap-stuck-jobs cron scheduled (every 5 min).';
end;
$$;

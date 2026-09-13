-- Phase 13.6 — bounded retry scheduling, queue monitoring, and automatic sweep invocation.
-- Password-reset emails remain excluded from scheduled retries.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'phase13_email_scheduler_token',
  'Internal token used only by the Phase 13 pg_cron email sweep.'
)
where not exists (
  select 1 from vault.secrets where name = 'phase13_email_scheduler_token'
);

create or replace function public.verify_transactional_email_scheduler_token(p_token text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'phase13_email_scheduler_token'
      and extensions.digest(coalesce(p_token, ''), 'sha256') = extensions.digest(decrypted_secret, 'sha256')
  );
$$;

create or replace function public.list_due_transactional_email_ids(p_limit integer default 10)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(id order by created_at), '[]'::jsonb)
  from (
    select id, created_at
    from public.email_logs
    where template_key <> 'admin_password_reset'
      and attempt_count < 5
      and (
        (status = 'queued' and (next_attempt_at is null or next_attempt_at <= now()))
        or
        (status = 'failed' and next_attempt_at is not null and next_attempt_at <= now())
      )
    order by created_at
    limit greatest(1, least(coalesce(p_limit, 10), 25))
  ) due;
$$;

create or replace function public.transactional_email_health_snapshot()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'queued', count(*) filter (where status = 'queued'),
    'sending', count(*) filter (where status = 'sending'),
    'sent', count(*) filter (where status in ('sent','delivered')),
    'failed', count(*) filter (where status = 'failed'),
    'retry_due', count(*) filter (where status = 'failed' and next_attempt_at is not null and next_attempt_at <= now()),
    'dead_letter', count(*) filter (where status = 'failed' and next_attempt_at is null),
    'oldest_queued_at', min(created_at) filter (where status = 'queued'),
    'last_sent_at', max(sent_at),
    'last_failure_at', max(last_attempt_at) filter (where status = 'failed')
  )
  from public.email_logs;
$$;

revoke execute on function public.verify_transactional_email_scheduler_token(text) from public, anon, authenticated;
revoke execute on function public.list_due_transactional_email_ids(integer) from public, anon, authenticated;
revoke execute on function public.transactional_email_health_snapshot() from public, anon, authenticated;
grant execute on function public.verify_transactional_email_scheduler_token(text) to service_role;
grant execute on function public.list_due_transactional_email_ids(integer) to service_role;
grant execute on function public.transactional_email_health_snapshot() to service_role;

do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'rcitcs-transactional-email-sweep' limit 1;
  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;
end
$$;

select cron.schedule(
  'rcitcs-transactional-email-sweep',
  '* * * * *',
  $cron$
    select net.http_post(
      url := 'https://chsizmffzpxcqhaptjeu.supabase.co/functions/v1/transactional-email/sweep',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-rcitcs-scheduler-token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'phase13_email_scheduler_token'
          limit 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $cron$
);

comment on function public.list_due_transactional_email_ids(integer) is
  'Phase 13.6 service-role-only retry queue reader. Password reset messages are intentionally excluded from scheduled sweeps.';
comment on function public.transactional_email_health_snapshot() is
  'Phase 13.6 service-role-only aggregate delivery health. Returns counts/timestamps only and no recipient or message content.';

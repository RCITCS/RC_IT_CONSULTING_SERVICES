-- Phase 13.7 corrective reliability hardening.
--
-- Production acceptance exposed a transient dispatcher/database failure after an
-- application acknowledgement had been claimed but before Resend accepted it.
-- The generic outer failure path recorded EMAIL_DISPATCH_FAILED with no retry.
-- This migration makes that infrastructure failure bounded-retryable for
-- application/contact notifications and recovers stale non-reset sending claims.
-- Administrator password-reset emails remain excluded from automatic retry.

create or replace function public.mark_transactional_email_failed(
  p_email_log_id uuid,
  p_error_code text,
  p_error_message text default null,
  p_retry_at timestamptz default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.email_logs
     set status = 'failed',
         error_code = left(coalesce(nullif(btrim(p_error_code), ''), 'EMAIL_DELIVERY_FAILED'), 120),
         error_message = left(coalesce(nullif(btrim(p_error_message), ''), 'Transactional email delivery failed.'), 500),
         next_attempt_at = case
           when p_retry_at is not null then p_retry_at
           when template_key <> 'admin_password_reset'
             and coalesce(nullif(btrim(p_error_code), ''), 'EMAIL_DELIVERY_FAILED') = 'EMAIL_DISPATCH_FAILED'
             and attempt_count < 5
           then now() + case attempt_count
             when 1 then interval '5 minutes'
             when 2 then interval '15 minutes'
             when 3 then interval '60 minutes'
             when 4 then interval '360 minutes'
             else interval '360 minutes'
           end
           else null
         end
   where id = p_email_log_id
     and status = 'sending';

  return found;
end;
$$;

create or replace function public.claim_transactional_email(p_email_log_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_email public.email_logs%rowtype;
begin
  update public.email_logs
     set status = 'sending',
         attempt_count = attempt_count + 1,
         last_attempt_at = now(),
         next_attempt_at = null,
         error_code = null,
         error_message = null
   where id = p_email_log_id
     and (
       (status = 'queued' and (next_attempt_at is null or next_attempt_at <= now()))
       or
       (status = 'failed' and next_attempt_at is not null and next_attempt_at <= now())
       or
       (
         status = 'sending'
         and template_key <> 'admin_password_reset'
         and last_attempt_at is not null
         and last_attempt_at <= now() - interval '15 minutes'
       )
     )
     and attempt_count < 5
  returning * into v_email;

  if v_email.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_email.id,
    'application_id', v_email.application_id,
    'contact_enquiry_id', v_email.contact_enquiry_id,
    'provider', v_email.provider,
    'template_key', v_email.template_key,
    'recipient_email', v_email.recipient_email,
    'sender_email', v_email.sender_email,
    'reply_to_email', v_email.reply_to_email,
    'subject', v_email.subject,
    'status', v_email.status,
    'idempotency_key', v_email.idempotency_key,
    'attempt_count', v_email.attempt_count,
    'metadata', v_email.metadata,
    'created_at', v_email.created_at
  );
end;
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
        or
        (status = 'sending' and last_attempt_at is not null and last_attempt_at <= now() - interval '15 minutes')
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
    'stale_sending', count(*) filter (
      where status = 'sending'
        and template_key <> 'admin_password_reset'
        and last_attempt_at is not null
        and last_attempt_at <= now() - interval '15 minutes'
    ),
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

revoke execute on function public.mark_transactional_email_failed(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.claim_transactional_email(uuid) from public, anon, authenticated;
revoke execute on function public.list_due_transactional_email_ids(integer) from public, anon, authenticated;
revoke execute on function public.transactional_email_health_snapshot() from public, anon, authenticated;

grant execute on function public.mark_transactional_email_failed(uuid, text, text, timestamptz) to service_role;
grant execute on function public.claim_transactional_email(uuid) to service_role;
grant execute on function public.list_due_transactional_email_ids(integer) to service_role;
grant execute on function public.transactional_email_health_snapshot() to service_role;

comment on function public.mark_transactional_email_failed(uuid, text, text, timestamptz) is
  'Phase 13.7 service-role delivery failure transition. Explicit retry times win; generic dispatcher infrastructure failures for non-reset mail receive the bounded retry schedule.';
comment on function public.claim_transactional_email(uuid) is
  'Phase 13.7 atomic delivery claim with bounded recovery of stale non-reset sending claims. Resend idempotency protects reclaimed provider attempts.';
comment on function public.list_due_transactional_email_ids(integer) is
  'Phase 13.7 service-role retry reader including stale non-reset claims; password reset emails remain excluded from automatic retry.';
comment on function public.transactional_email_health_snapshot() is
  'Phase 13.7 aggregate delivery health including stale-sending count; returns counts/timestamps only and no recipient or message content.';

-- Phase 13.3 — transactional email dispatch state and concurrency contract.
-- This migration does not itself send email and does not change public/admin routes.

alter table public.email_logs
  drop constraint if exists email_logs_status_check;

alter table public.email_logs
  add constraint email_logs_status_check
  check (
    status = any (
      array[
        'queued'::text,
        'sending'::text,
        'sent'::text,
        'delivered'::text,
        'bounced'::text,
        'complained'::text,
        'failed'::text,
        'suppressed'::text
      ]
    )
  );

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

create or replace function public.mark_transactional_email_sent(
  p_email_log_id uuid,
  p_provider_message_id text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_provider_message_id is null or btrim(p_provider_message_id) = '' then
    return false;
  end if;

  update public.email_logs
     set status = 'sent',
         provider_message_id = left(btrim(p_provider_message_id), 500),
         sent_at = now(),
         next_attempt_at = null,
         error_code = null,
         error_message = null
   where id = p_email_log_id
     and status = 'sending';

  return found;
end;
$$;

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
         next_attempt_at = p_retry_at
   where id = p_email_log_id
     and status = 'sending';

  return found;
end;
$$;

revoke execute on function public.claim_transactional_email(uuid) from public, anon, authenticated;
revoke execute on function public.mark_transactional_email_sent(uuid, text) from public, anon, authenticated;
revoke execute on function public.mark_transactional_email_failed(uuid, text, text, timestamptz) from public, anon, authenticated;

grant execute on function public.claim_transactional_email(uuid) to service_role;
grant execute on function public.mark_transactional_email_sent(uuid, text) to service_role;
grant execute on function public.mark_transactional_email_failed(uuid, text, text, timestamptz) to service_role;

comment on function public.claim_transactional_email(uuid) is
  'Phase 13 service-role-only atomic dispatch claim. Prevents concurrent providers from sending the same queued message.';
comment on function public.mark_transactional_email_sent(uuid, text) is
  'Phase 13 service-role-only transition from sending to sent after provider acceptance.';
comment on function public.mark_transactional_email_failed(uuid, text, text, timestamptz) is
  'Phase 13 service-role-only failure transition. Password-reset delivery uses no automatic retry timestamp.';

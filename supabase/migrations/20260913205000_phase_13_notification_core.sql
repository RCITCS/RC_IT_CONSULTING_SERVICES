-- Phase 13.2 — durable transactional email queue contract.
-- This migration does not send email and does not change any public/admin route.

alter table public.email_logs
  add column if not exists idempotency_key text,
  add column if not exists sender_email text,
  add column if not exists reply_to_email text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_attempt_at timestamptz;

create unique index if not exists email_logs_idempotency_key_uidx
  on public.email_logs(idempotency_key);

create index if not exists email_logs_dispatch_queue_idx
  on public.email_logs(status, next_attempt_at, created_at)
  where status in ('queued', 'failed');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.email_logs'::regclass
      and conname = 'email_logs_attempt_count_nonnegative'
  ) then
    alter table public.email_logs
      add constraint email_logs_attempt_count_nonnegative
      check (attempt_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.email_logs'::regclass
      and conname = 'email_logs_idempotency_key_format'
  ) then
    alter table public.email_logs
      add constraint email_logs_idempotency_key_format
      check (
        idempotency_key is null
        or (
          char_length(idempotency_key) between 1 and 256
          and idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$'
        )
      );
  end if;
end
$$;

create or replace function public.enqueue_transactional_email(
  p_idempotency_key text,
  p_template_key text,
  p_recipient_email text,
  p_sender_email text,
  p_reply_to_email text default null,
  p_subject text default null,
  p_application_id uuid default null,
  p_contact_enquiry_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_idempotency_key is null
     or char_length(p_idempotency_key) < 1
     or char_length(p_idempotency_key) > 256
     or p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$' then
    raise exception 'invalid email idempotency key' using errcode = '22023';
  end if;

  if p_template_key is null or btrim(p_template_key) = '' then
    raise exception 'email template key is required' using errcode = '22023';
  end if;

  if p_recipient_email is null
     or char_length(p_recipient_email) > 254
     or p_recipient_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid recipient email' using errcode = '22023';
  end if;

  if p_sender_email is null
     or lower(p_sender_email) not in (
       'contact@rcitcs.com',
       'career@rcitcs.com',
       'noreply@rcitcs.com'
     ) then
    raise exception 'sender identity is not approved' using errcode = '22023';
  end if;

  if p_reply_to_email is not null
     and (
       char_length(p_reply_to_email) > 254
       or p_reply_to_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     ) then
    raise exception 'invalid reply-to email' using errcode = '22023';
  end if;

  insert into public.email_logs (
    application_id,
    contact_enquiry_id,
    provider,
    template_key,
    recipient_email,
    sender_email,
    reply_to_email,
    subject,
    status,
    idempotency_key,
    metadata,
    next_attempt_at
  )
  values (
    p_application_id,
    p_contact_enquiry_id,
    'resend',
    btrim(p_template_key),
    lower(btrim(p_recipient_email)),
    lower(btrim(p_sender_email)),
    nullif(lower(btrim(p_reply_to_email)), ''),
    nullif(btrim(p_subject), ''),
    'queued',
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb),
    now()
  )
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id
      into v_id
    from public.email_logs
    where idempotency_key = p_idempotency_key;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.enqueue_transactional_email(text, text, text, text, text, text, uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.enqueue_transactional_email(text, text, text, text, text, text, uuid, uuid, jsonb)
  to service_role;

comment on column public.email_logs.idempotency_key is
  'Phase 13 durable deduplication key. Unique locally even after provider idempotency windows expire.';
comment on function public.enqueue_transactional_email(text, text, text, text, text, text, uuid, uuid, jsonb) is
  'Phase 13 service-role-only durable enqueue boundary. Repeated identical event keys return the existing email log row instead of creating duplicate mail.';

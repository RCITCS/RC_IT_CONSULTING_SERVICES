-- Phase 13.3 hardening: prevent rapid duplicate administrator reset requests
-- from generating multiple tokens/emails that invalidate one another.
-- A repeated request for the same administrator recipient within 60 seconds
-- reuses the existing queued/sending/sent email log id. Failed deliveries are
-- intentionally excluded so a genuine provider failure can be retried by a
-- fresh user request.

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
set search_path = ''
as $$
declare
  v_id uuid;
  v_template_key text := btrim(p_template_key);
  v_recipient_email text := lower(btrim(p_recipient_email));
begin
  if p_idempotency_key is null
     or char_length(p_idempotency_key) < 1
     or char_length(p_idempotency_key) > 256
     or p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$' then
    raise exception 'invalid email idempotency key' using errcode = '22023';
  end if;

  if p_template_key is null or v_template_key = '' then
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

  if v_template_key = 'admin_password_reset' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('rcitcs/admin_password_reset/' || v_recipient_email, 0)
    );

    select id
      into v_id
    from public.email_logs
    where template_key = 'admin_password_reset'
      and lower(recipient_email) = v_recipient_email
      and status in ('queued', 'sending', 'sent')
      and created_at >= now() - interval '60 seconds'
    order by created_at desc
    limit 1;

    if v_id is not null then
      return v_id;
    end if;
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
    v_template_key,
    v_recipient_email,
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

revoke execute on function public.enqueue_transactional_email(text,text,text,text,text,text,uuid,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.enqueue_transactional_email(text,text,text,text,text,text,uuid,uuid,jsonb)
  to service_role;

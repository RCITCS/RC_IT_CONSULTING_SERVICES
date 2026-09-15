-- Phase 15.1 — Admin candidate communication core.
-- Candidate-visible messages are persisted before delivery and linked to the existing
-- Phase-13 transactional email queue. Browser roles remain denied direct access.

alter table public.candidate_messages
  add column if not exists sender_email text,
  add column if not exists recipient_email text,
  add column if not exists reply_to_email text,
  add column if not exists template_key text,
  add column if not exists idempotency_key text,
  add column if not exists email_log_id uuid;

alter table public.candidate_messages
  drop constraint if exists candidate_messages_email_log_id_fkey,
  add constraint candidate_messages_email_log_id_fkey
    foreign key (email_log_id)
    references public.email_logs(id)
    on delete restrict;

alter table public.candidate_messages
  drop constraint if exists candidate_messages_outbound_email_contract,
  add constraint candidate_messages_outbound_email_contract check (
    direction <> 'outbound'
    or channel <> 'email'
    or (
      sender_email = 'careers@rcitcs.com'
      and reply_to_email = 'careers@rcitcs.com'
      and recipient_email is not null
      and char_length(recipient_email) between 3 and 254
      and recipient_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      and template_key = 'candidate_admin_reply'
      and subject is not null
      and char_length(btrim(subject)) between 1 and 300
      and subject !~ E'[\r\n]'
      and char_length(btrim(body_text)) between 1 and 10000
      and idempotency_key is not null
      and char_length(idempotency_key) between 1 and 256
      and idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$'
      and email_log_id is not null
    )
  );

create unique index if not exists candidate_messages_idempotency_key_uidx
  on public.candidate_messages(idempotency_key)
  where idempotency_key is not null;

create unique index if not exists candidate_messages_email_log_id_uidx
  on public.candidate_messages(email_log_id)
  where email_log_id is not null;

create index if not exists candidate_messages_application_timeline_idx
  on public.candidate_messages(application_id, created_at desc, id desc);

-- The approved recruitment mailbox is careers@rcitcs.com. Phase 13 originally used
-- career@rcitcs.com; all new application/candidate mail is converged here.
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
       'careers@rcitcs.com',
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

revoke all on function public.enqueue_transactional_email(text,text,text,text,text,text,uuid,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.enqueue_transactional_email(text,text,text,text,text,text,uuid,uuid,jsonb)
  to service_role;

create or replace function public.sync_candidate_message_delivery_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.candidate_messages
     set status = case new.status
       when 'sent' then 'sent'
       when 'delivered' then 'delivered'
       when 'failed' then 'failed'
       when 'bounced' then 'failed'
       when 'complained' then 'failed'
       when 'suppressed' then 'failed'
       else 'queued'
     end,
     provider_message_id = new.provider_message_id,
     sent_at = new.sent_at
   where email_log_id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_candidate_message_delivery_state()
  from public, anon, authenticated;
grant execute on function public.sync_candidate_message_delivery_state()
  to service_role;

drop trigger if exists email_logs_sync_candidate_message_delivery on public.email_logs;
create trigger email_logs_sync_candidate_message_delivery
after update of status, provider_message_id, sent_at on public.email_logs
for each row
execute function public.sync_candidate_message_delivery_state();

create or replace function public.get_admin_candidate_communication_context(
  p_admin_id uuid,
  p_application_id uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 100);
  v_application jsonb;
  v_messages jsonb := '[]'::jsonb;
begin
  if not exists (
    select 1
    from public.admins a
    where a.id = p_admin_id
      and a.status = 'active'
      and a.role = 'super_admin'
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  select jsonb_build_object(
    'id', a.id,
    'public_reference', a.public_reference,
    'status', a.status,
    'first_name', a.first_name,
    'last_name', a.last_name,
    'email', a.email,
    'job_id', a.job_id,
    'job_code', a.job_code,
    'job_title', a.job_title,
    'job_slug', a.job_slug,
    'submitted_at', a.submitted_at
  )
  into v_application
  from public.applications a
  where a.id = p_application_id
  limit 1;

  if v_application is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  select coalesce(jsonb_agg(message_row order by message_row->>'created_at', message_row->>'id'), '[]'::jsonb)
  into v_messages
  from (
    select jsonb_build_object(
      'id', m.id,
      'direction', m.direction,
      'channel', m.channel,
      'subject', m.subject,
      'body_text', m.body_text,
      'template_key', m.template_key,
      'sender_email', m.sender_email,
      'recipient_email', m.recipient_email,
      'status', m.status,
      'delivery_status', coalesce(e.status, m.status),
      'attempt_count', coalesce(e.attempt_count, 0),
      'created_at', m.created_at,
      'sent_at', coalesce(e.sent_at, m.sent_at)
    ) as message_row
    from public.candidate_messages m
    left join public.email_logs e on e.id = m.email_log_id
    where m.application_id = p_application_id
    order by m.created_at desc, m.id desc
    limit v_limit
  ) recent_messages;

  return jsonb_build_object(
    'ok', true,
    'application', v_application,
    'messages', v_messages,
    'limit', v_limit,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.get_admin_candidate_communication_context(uuid,uuid,integer)
  from public, anon, authenticated;
grant execute on function public.get_admin_candidate_communication_context(uuid,uuid,integer)
  to service_role;

create or replace function public.admin_queue_candidate_message(
  p_admin_id uuid,
  p_application_id uuid,
  p_request_id uuid,
  p_subject text,
  p_body text,
  p_ip_hash text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_application public.applications%rowtype;
  v_subject text := btrim(coalesce(p_subject, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_idempotency_key text;
  v_email_log_id uuid;
  v_existing public.candidate_messages%rowtype;
begin
  if not exists (
    select 1
    from public.admins a
    where a.id = p_admin_id
      and a.status = 'active'
      and a.role = 'super_admin'
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  if p_request_id is null then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'A message request identifier is required.');
  end if;

  if char_length(v_subject) < 1
     or char_length(v_subject) > 300
     or v_subject ~ E'[\r\n]' then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Subject must be between 1 and 300 characters and contain no line breaks.');
  end if;

  if char_length(v_body) < 1 or char_length(v_body) > 10000 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Message must be between 1 and 10,000 characters.');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rcitcs/candidate_message/' || p_application_id::text || '/' || p_request_id::text, 0)
  );

  v_idempotency_key := 'rcitcs/candidate_admin_reply/candidate_message/' || p_request_id::text;

  select * into v_existing
  from public.candidate_messages
  where idempotency_key = v_idempotency_key
  limit 1;

  if found then
    if v_existing.application_id <> p_application_id then
      return jsonb_build_object('ok', false, 'code', 'IDEMPOTENCY_CONFLICT');
    end if;
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'message_id', v_existing.id,
      'email_log_id', v_existing.email_log_id,
      'delivery_status', v_existing.status
    );
  end if;

  select * into v_application
  from public.applications
  where id = p_application_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Candidate application was not found.');
  end if;

  if v_application.status = 'archived' then
    return jsonb_build_object('ok', false, 'code', 'ARCHIVED', 'message', 'Restore the application before communicating with the candidate.');
  end if;

  if v_application.email is null
     or char_length(v_application.email) > 254
     or v_application.email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_RECIPIENT', 'message', 'The persisted candidate email address is not valid for outbound delivery.');
  end if;

  v_email_log_id := public.enqueue_transactional_email(
    v_idempotency_key,
    'candidate_admin_reply',
    lower(btrim(v_application.email)),
    'careers@rcitcs.com',
    'careers@rcitcs.com',
    v_subject,
    p_application_id,
    null,
    jsonb_build_object(
      'source', 'phase_15_candidate_communication',
      'candidate_message_id', p_request_id
    )
  );

  if v_email_log_id is null then
    raise exception 'candidate message email queue insert failed';
  end if;

  insert into public.candidate_messages(
    id,
    application_id,
    admin_id,
    direction,
    channel,
    subject,
    body_text,
    status,
    sender_email,
    recipient_email,
    reply_to_email,
    template_key,
    idempotency_key,
    email_log_id,
    metadata
  ) values (
    p_request_id,
    p_application_id,
    p_admin_id,
    'outbound',
    'email',
    v_subject,
    v_body,
    'queued',
    'careers@rcitcs.com',
    lower(btrim(v_application.email)),
    'careers@rcitcs.com',
    'candidate_admin_reply',
    v_idempotency_key,
    v_email_log_id,
    jsonb_build_object('source', 'phase_15_candidate_communication')
  );

  insert into public.application_history(
    application_id,
    actor_admin_id,
    event_type,
    from_status,
    to_status,
    notes,
    metadata
  ) values (
    p_application_id,
    p_admin_id,
    'candidate_message_queued',
    v_application.status,
    v_application.status,
    null,
    jsonb_build_object(
      'candidate_message_id', p_request_id,
      'email_log_id', v_email_log_id,
      'template_key', 'candidate_admin_reply'
    )
  );

  insert into public.audit_logs(
    admin_id,
    action,
    entity_type,
    entity_id,
    ip_hash,
    user_agent,
    before_data,
    after_data,
    metadata
  ) values (
    p_admin_id,
    'candidate_message_queued',
    'application',
    p_application_id,
    p_ip_hash,
    p_user_agent,
    jsonb_build_object('status', v_application.status),
    jsonb_build_object('status', v_application.status),
    jsonb_build_object(
      'source', 'phase_15_candidate_communication',
      'candidate_message_id', p_request_id,
      'email_log_id', v_email_log_id,
      'template_key', 'candidate_admin_reply'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'message_id', p_request_id,
    'email_log_id', v_email_log_id,
    'delivery_status', 'queued'
  );
end;
$$;

revoke all on function public.admin_queue_candidate_message(uuid,uuid,uuid,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.admin_queue_candidate_message(uuid,uuid,uuid,text,text,text,text)
  to service_role;

-- Candidate communication remains a private server-only table.
alter table public.candidate_messages enable row level security;
alter table public.candidate_messages force row level security;
revoke all on table public.candidate_messages from anon, authenticated;

comment on function public.get_admin_candidate_communication_context(uuid,uuid,integer) is
  'Phase 15 service-role-only bounded candidate communication context. Raw provider errors and credentials are intentionally excluded.';
comment on function public.admin_queue_candidate_message(uuid,uuid,uuid,text,text,text,text) is
  'Phase 15 service-role-only durable candidate message queue. Recipient is derived from the persisted application and delivery is delegated to Phase 13.';
comment on column public.candidate_messages.email_log_id is
  'Links one candidate-visible outbound message to its authoritative Phase-13 transactional delivery record.';

notify pgrst, 'reload schema';

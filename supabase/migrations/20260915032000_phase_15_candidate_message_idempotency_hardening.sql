-- Phase 15.3 — Candidate-message idempotency hardening.
-- One request UUID is a global message/idempotency authority. Replays are accepted only
-- when application, subject and body are identical; conflicting re-use is rejected.

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

  -- The idempotency key is global by request UUID, therefore the lock must be global too.
  -- Locking by application + request UUID would allow a cross-application race against the
  -- unique idempotency/message identifier before the conflict check can run.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rcitcs/candidate_message/' || p_request_id::text, 0)
  );

  v_idempotency_key := 'rcitcs/candidate_admin_reply/candidate_message/' || p_request_id::text;

  select * into v_existing
  from public.candidate_messages
  where idempotency_key = v_idempotency_key
  limit 1;

  if found then
    if v_existing.application_id <> p_application_id
       or btrim(coalesce(v_existing.subject, '')) <> v_subject
       or btrim(coalesce(v_existing.body_text, '')) <> v_body then
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

comment on function public.admin_queue_candidate_message(uuid,uuid,uuid,text,text,text,text) is
  'Phase 15 service-role-only durable candidate message queue. Request UUID replay is accepted only for the exact same application and message content; conflicting reuse is rejected.';

notify pgrst, 'reload schema';
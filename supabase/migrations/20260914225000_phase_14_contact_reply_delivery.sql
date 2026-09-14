-- Phase 14.8 — Contact-enquiry reply composer and durable outbound delivery.
-- Replies are persisted first, queued through the existing Phase-13 email authority,
-- and never sent directly by the browser or admin Edge Function.

create or replace function public.admin_queue_contact_enquiry_reply(
  p_admin_id uuid,
  p_enquiry_id uuid,
  p_expected_version integer,
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
  v_row public.contact_enquiries%rowtype;
  v_after public.contact_enquiries%rowtype;
  v_subject text := btrim(coalesce(p_subject, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_message_id uuid := gen_random_uuid();
  v_email_log_id uuid;
  v_idempotency_key text;
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

  if char_length(v_subject) < 1
     or char_length(v_subject) > 300
     or v_subject ~ E'[\r\n]' then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Reply subject must be between 1 and 300 characters and contain no line breaks.');
  end if;

  if char_length(v_body) < 1 or char_length(v_body) > 10000 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Reply body must be between 1 and 10,000 characters.');
  end if;

  select *
  into v_row
  from public.contact_enquiries
  where id = p_enquiry_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Contact enquiry was not found.');
  end if;

  if v_row.archived_at is not null then
    return jsonb_build_object('ok', false, 'code', 'ARCHIVED', 'message', 'Restore the enquiry before replying to the customer.');
  end if;

  if p_expected_version is null or p_expected_version <> v_row.version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This enquiry changed after it was loaded. Reload before continuing.');
  end if;

  if v_row.email is null
     or char_length(v_row.email) > 254
     or v_row.email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_RECIPIENT', 'message', 'The persisted customer email address is not valid for outbound delivery.');
  end if;

  v_idempotency_key := 'rcitcs/contact_admin_reply/contact_enquiry_message/' || v_message_id::text;

  v_email_log_id := public.enqueue_transactional_email(
    v_idempotency_key,
    'contact_admin_reply',
    lower(btrim(v_row.email)),
    'contact@rcitcs.com',
    'contact@rcitcs.com',
    v_subject,
    null,
    p_enquiry_id,
    jsonb_build_object(
      'source', 'phase_14_contact_admin',
      'contact_message_id', v_message_id
    )
  );

  if v_email_log_id is null then
    raise exception 'contact reply email queue insert failed';
  end if;

  insert into public.contact_enquiry_messages(
    id,
    enquiry_id,
    direction,
    sender_email,
    recipient_email,
    reply_to_email,
    subject,
    body_text,
    idempotency_key,
    email_log_id,
    created_by_admin_id
  ) values (
    v_message_id,
    p_enquiry_id,
    'outbound',
    'contact@rcitcs.com',
    lower(btrim(v_row.email)),
    'contact@rcitcs.com',
    v_subject,
    v_body,
    v_idempotency_key,
    v_email_log_id,
    p_admin_id
  );

  select * into v_after
  from public.contact_enquiries
  where id = p_enquiry_id;

  insert into public.contact_enquiry_history(
    enquiry_id,
    event_type,
    from_status,
    to_status,
    actor_admin_id,
    metadata
  ) values (
    p_enquiry_id,
    'reply_queued',
    v_row.status,
    v_after.status,
    p_admin_id,
    jsonb_build_object('message_id', v_message_id, 'email_log_id', v_email_log_id)
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
    'contact_reply_queued',
    'contact_enquiry',
    p_enquiry_id,
    p_ip_hash,
    p_user_agent,
    jsonb_build_object('status', v_row.status, 'version', v_row.version),
    jsonb_build_object('status', v_after.status, 'version', v_after.version),
    jsonb_build_object(
      'source', 'phase_14_contact_admin',
      'message_id', v_message_id,
      'email_log_id', v_email_log_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'message_id', v_message_id,
    'email_log_id', v_email_log_id,
    'delivery_status', 'queued',
    'version', v_after.version
  );
end;
$$;

revoke all on function public.admin_queue_contact_enquiry_reply(uuid,uuid,integer,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.admin_queue_contact_enquiry_reply(uuid,uuid,integer,text,text,text,text)
  to service_role;

comment on function public.admin_queue_contact_enquiry_reply(uuid,uuid,integer,text,text,text,text) is
  'Phase 14.8 service-role-only reply boundary. Persists one outbound contact message and durable Phase-13 email queue row atomically using optimistic concurrency.';

notify pgrst, 'reload schema';

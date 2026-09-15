-- Phase 15.4 — Candidate application status workflow.
-- Status mutation is independent from candidate email delivery: changing a stage never
-- queues or sends email automatically.

alter table public.applications
  add column if not exists version integer not null default 1,
  add column if not exists archived_from_status text;

alter table public.applications
  drop constraint if exists applications_version_positive,
  add constraint applications_version_positive check (version > 0),
  drop constraint if exists applications_archived_from_status_check,
  add constraint applications_archived_from_status_check check (
    archived_from_status is null
    or (
      status = 'archived'
      and archived_from_status = any(array[
        'submitted','under_review','shortlisted','interview','assessment',
        'offer','hired','rejected','withdrawn'
      ]::text[])
    )
  );

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
    'version', a.version,
    'archived_from_status', a.archived_from_status,
    'first_name', a.first_name,
    'last_name', a.last_name,
    'email', a.email,
    'job_id', a.job_id,
    'job_code', a.job_code,
    'job_title', a.job_title,
    'job_slug', a.job_slug,
    'submitted_at', a.submitted_at,
    'updated_at', a.updated_at
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

create or replace function public.admin_transition_candidate_application(
  p_admin_id uuid,
  p_application_id uuid,
  p_expected_version integer,
  p_target_status text,
  p_notes text default null,
  p_ip_hash text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.applications%rowtype;
  v_after public.applications%rowtype;
  v_requested text := lower(btrim(coalesce(p_target_status, '')));
  v_target text;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_allowed boolean := false;
  v_restoring boolean := false;
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

  if p_expected_version is null or p_expected_version < 1 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'A valid application version is required.');
  end if;

  if v_notes is not null and char_length(v_notes) > 2000 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Internal transition notes must not exceed 2,000 characters.');
  end if;

  select * into v_row
  from public.applications
  where id = p_application_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Candidate application was not found.');
  end if;

  if v_row.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This application changed after it was loaded. Reload before continuing.');
  end if;

  if v_requested = 'restore' then
    if v_row.status <> 'archived' then
      return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'Only an archived application can be restored.');
    end if;
    v_restoring := true;
    v_target := coalesce(v_row.archived_from_status, 'under_review');
  else
    v_target := v_requested;
  end if;

  if v_target <> all(array[
    'submitted','under_review','shortlisted','interview','assessment',
    'offer','hired','rejected','withdrawn','archived'
  ]::text[]) then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'The requested application status is not supported.');
  end if;

  if not v_restoring then
    v_allowed := case v_row.status
      when 'submitted' then v_target = any(array['under_review','rejected','withdrawn','archived']::text[])
      when 'under_review' then v_target = any(array['shortlisted','interview','assessment','rejected','withdrawn','archived']::text[])
      when 'shortlisted' then v_target = any(array['under_review','interview','assessment','rejected','withdrawn','archived']::text[])
      when 'interview' then v_target = any(array['under_review','assessment','offer','rejected','withdrawn','archived']::text[])
      when 'assessment' then v_target = any(array['under_review','interview','offer','rejected','withdrawn','archived']::text[])
      when 'offer' then v_target = any(array['hired','rejected','withdrawn','archived']::text[])
      when 'hired' then v_target = 'archived'
      when 'rejected' then v_target = any(array['under_review','archived']::text[])
      when 'withdrawn' then v_target = any(array['under_review','archived']::text[])
      when 'archived' then false
      else false
    end;
    if not v_allowed then
      return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'The requested stage transition is not allowed from the current application status.');
    end if;
  end if;

  update public.applications
     set status = v_target,
         archived_from_status = case when v_target = 'archived' then v_row.status else null end,
         version = v_row.version + 1,
         updated_at = now()
   where id = p_application_id
     and version = p_expected_version
  returning * into v_after;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This application changed before the transition was committed. Reload before continuing.');
  end if;

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
    case when v_restoring then 'application_restored' else 'status_changed' end,
    v_row.status,
    v_after.status,
    v_notes,
    jsonb_build_object(
      'source', 'phase_15_candidate_status',
      'version_before', v_row.version,
      'version_after', v_after.version
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
    'candidate_application_status_changed',
    'application',
    p_application_id,
    p_ip_hash,
    p_user_agent,
    jsonb_build_object('status', v_row.status, 'version', v_row.version),
    jsonb_build_object('status', v_after.status, 'version', v_after.version),
    jsonb_build_object(
      'source', 'phase_15_candidate_status',
      'restored', v_restoring
    )
  );

  return jsonb_build_object(
    'ok', true,
    'changed', true,
    'previous_status', v_row.status,
    'status', v_after.status,
    'version', v_after.version,
    'email_queued', false
  );
end;
$$;

revoke all on function public.admin_transition_candidate_application(uuid,uuid,integer,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.admin_transition_candidate_application(uuid,uuid,integer,text,text,text,text)
  to service_role;

comment on column public.applications.version is
  'Optimistic-concurrency version for administrator recruitment workflow mutations.';
comment on column public.applications.archived_from_status is
  'Prior recruitment status retained only while an application is archived so restore can return to the preceding stage.';
comment on function public.admin_transition_candidate_application(uuid,uuid,integer,text,text,text,text) is
  'Phase 15 service-role-only recruitment-stage authority. Stage changes are version-locked, historied/audited and never send candidate email automatically.';

notify pgrst, 'reload schema';
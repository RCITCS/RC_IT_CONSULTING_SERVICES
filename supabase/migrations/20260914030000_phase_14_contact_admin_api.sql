-- Phase 14.3 — Server-authoritative Contact-Enquiry Administration API
--
-- These RPCs are private service-role contracts used by the authenticated admin
-- runtime. Browser roles cannot execute them or read the underlying tables directly.
-- No provider/email operation is introduced in this sub-phase.

-- -----------------------------------------------------------------------------
-- 1. Bounded, keyset-paginated admin register.
-- -----------------------------------------------------------------------------

create or replace function public.get_admin_contact_list(
  p_admin_id uuid,
  p_limit integer default 25,
  p_status text default null,
  p_read_state text default 'all',
  p_archive_state text default 'active',
  p_query text default null,
  p_before_activity timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_limit integer := coalesce(p_limit, 25);
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_read_state text := lower(btrim(coalesce(p_read_state, 'all')));
  v_archive_state text := lower(btrim(coalesce(p_archive_state, 'active')));
  v_query text := lower(btrim(coalesce(p_query, '')));
  v_result jsonb;
begin
  if not exists (
    select 1 from public.admins a
    where a.id = p_admin_id and a.status = 'active' and a.role = 'super_admin'
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  if v_limit < 1 or v_limit > 100 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Page size must be between 1 and 100.');
  end if;

  if v_status = 'all' then v_status := null; end if;
  if v_status is not null and v_status not in ('new','open','in_progress','resolved','closed','spam') then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Contact status filter is invalid.');
  end if;

  if v_read_state not in ('all','read','unread') then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Read-state filter is invalid.');
  end if;

  if v_archive_state not in ('active','archived','all') then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Archive-state filter is invalid.');
  end if;

  if char_length(v_query) > 200 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Search text is too long.');
  end if;

  if (p_before_activity is null) <> (p_before_id is null) then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Pagination cursor is incomplete.');
  end if;

  with filtered as (
    select
      c.id,
      c.name,
      c.email,
      c.company,
      c.service,
      c.subject,
      c.status,
      c.source,
      c.read_at,
      c.first_read_at,
      c.archived_at,
      c.created_at,
      c.last_activity_at,
      c.version
    from public.contact_enquiries c
    where (v_status is null or c.status = v_status)
      and (
        v_read_state = 'all'
        or (v_read_state = 'read' and c.read_at is not null)
        or (v_read_state = 'unread' and c.read_at is null)
      )
      and (
        v_archive_state = 'all'
        or (v_archive_state = 'active' and c.archived_at is null)
        or (v_archive_state = 'archived' and c.archived_at is not null)
      )
      and (
        v_query = ''
        or strpos(lower(coalesce(c.name, '')), v_query) > 0
        or strpos(lower(coalesce(c.email, '')), v_query) > 0
        or strpos(lower(coalesce(c.company, '')), v_query) > 0
        or strpos(lower(coalesce(c.subject, '')), v_query) > 0
        or strpos(lower(coalesce(c.service, '')), v_query) > 0
      )
      and (
        p_before_activity is null
        or (c.last_activity_at, c.id) < (p_before_activity, p_before_id)
      )
    order by c.last_activity_at desc, c.id desc
    limit v_limit + 1
  ), page as (
    select * from filtered
    order by last_activity_at desc, id desc
    limit v_limit
  ), last_row as (
    select last_activity_at, id
    from page
    order by last_activity_at asc, id asc
    limit 1
  )
  select jsonb_build_object(
    'ok', true,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'email', p.email,
        'company', p.company,
        'service', p.service,
        'subject', p.subject,
        'status', p.status,
        'source', p.source,
        'read_at', p.read_at,
        'first_read_at', p.first_read_at,
        'archived_at', p.archived_at,
        'created_at', p.created_at,
        'last_activity_at', p.last_activity_at,
        'version', p.version
      ) order by p.last_activity_at desc, p.id desc)
      from page p
    ), '[]'::jsonb),
    'has_more', (select count(*) > v_limit from filtered),
    'next_cursor', case
      when (select count(*) > v_limit from filtered) then (
        select jsonb_build_object('last_activity_at', lr.last_activity_at, 'id', lr.id)
        from last_row lr
      )
      else null
    end,
    'limit', v_limit
  ) into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Authorized detail projection. Full customer content is returned only from this
--    private admin RPC; the list projection above intentionally omits message/phone.
-- -----------------------------------------------------------------------------

create or replace function public.get_admin_contact_detail(
  p_admin_id uuid,
  p_enquiry_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_enquiry public.contact_enquiries%rowtype;
  v_result jsonb;
begin
  if not exists (
    select 1 from public.admins a
    where a.id = p_admin_id and a.status = 'active' and a.role = 'super_admin'
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  select * into v_enquiry
  from public.contact_enquiries
  where id = p_enquiry_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Contact enquiry was not found.');
  end if;

  select jsonb_build_object(
    'ok', true,
    'enquiry', jsonb_build_object(
      'id', v_enquiry.id,
      'name', v_enquiry.name,
      'email', v_enquiry.email,
      'phone', v_enquiry.phone,
      'company', v_enquiry.company,
      'service', v_enquiry.service,
      'subject', v_enquiry.subject,
      'message', v_enquiry.message,
      'consent', v_enquiry.consent,
      'consent_at', v_enquiry.consent_at,
      'status', v_enquiry.status,
      'source', v_enquiry.source,
      'metadata', v_enquiry.metadata,
      'assigned_to', v_enquiry.assigned_to,
      'read_at', v_enquiry.read_at,
      'first_read_at', v_enquiry.first_read_at,
      'resolved_at', v_enquiry.resolved_at,
      'closed_at', v_enquiry.closed_at,
      'archived_at', v_enquiry.archived_at,
      'created_at', v_enquiry.created_at,
      'updated_at', v_enquiry.updated_at,
      'last_activity_at', v_enquiry.last_activity_at,
      'version', v_enquiry.version
    ),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id,
        'event_type', h.event_type,
        'from_status', h.from_status,
        'to_status', h.to_status,
        'actor_admin_id', h.actor_admin_id,
        'metadata', h.metadata,
        'created_at', h.created_at
      ) order by h.created_at asc, h.id asc)
      from (
        select * from public.contact_enquiry_history
        where enquiry_id = p_enquiry_id
        order by created_at desc, id desc
        limit 200
      ) h
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id,
        'admin_id', n.admin_id,
        'body', n.body,
        'created_at', n.created_at
      ) order by n.created_at asc, n.id asc)
      from (
        select * from public.contact_enquiry_notes
        where enquiry_id = p_enquiry_id
        order by created_at desc, id desc
        limit 200
      ) n
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'direction', m.direction,
        'sender_email', m.sender_email,
        'recipient_email', m.recipient_email,
        'reply_to_email', m.reply_to_email,
        'subject', m.subject,
        'body_text', m.body_text,
        'email_log_id', m.email_log_id,
        'delivery_status', e.status,
        'sent_at', e.sent_at,
        'created_by_admin_id', m.created_by_admin_id,
        'created_at', m.created_at
      ) order by m.created_at asc, m.id asc)
      from (
        select * from public.contact_enquiry_messages
        where enquiry_id = p_enquiry_id
        order by created_at desc, id desc
        limit 200
      ) m
      left join public.email_logs e on e.id = m.email_log_id
    ), '[]'::jsonb),
    'history_count', (select count(*) from public.contact_enquiry_history where enquiry_id = p_enquiry_id),
    'note_count', (select count(*) from public.contact_enquiry_notes where enquiry_id = p_enquiry_id),
    'message_count', (select count(*) from public.contact_enquiry_messages where enquiry_id = p_enquiry_id)
  ) into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Read/unread state. Read state is independent from workflow status and does not
--    reorder the operational inbox by last_activity_at.
-- -----------------------------------------------------------------------------

create or replace function public.admin_set_contact_read_state(
  p_admin_id uuid,
  p_enquiry_id uuid,
  p_expected_version integer,
  p_read boolean,
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
  v_before_state jsonb;
  v_after_state jsonb;
  v_event text;
begin
  if not exists (
    select 1 from public.admins a
    where a.id = p_admin_id and a.status = 'active' and a.role = 'super_admin'
  ) then return jsonb_build_object('ok', false, 'code', 'FORBIDDEN'); end if;

  if p_read is null then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Read state is required.');
  end if;

  select * into v_row from public.contact_enquiries where id = p_enquiry_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Contact enquiry was not found.'); end if;
  if v_row.archived_at is not null then return jsonb_build_object('ok', false, 'code', 'ARCHIVED', 'message', 'Restore the enquiry before changing its read state.'); end if;
  if p_expected_version is null or p_expected_version <> v_row.version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This enquiry changed after it was loaded. Reload before continuing.');
  end if;

  if (p_read and v_row.read_at is not null) or ((not p_read) and v_row.read_at is null) then
    return jsonb_build_object('ok', true, 'code', 'NO_CHANGE', 'version', v_row.version, 'read_at', v_row.read_at, 'first_read_at', v_row.first_read_at);
  end if;

  v_before_state := jsonb_build_object(
    'status', v_row.status, 'read_at', v_row.read_at, 'first_read_at', v_row.first_read_at,
    'archived_at', v_row.archived_at, 'version', v_row.version
  );

  if p_read then
    update public.contact_enquiries
    set first_read_at = coalesce(first_read_at, now()), read_at = now()
    where id = p_enquiry_id and version = p_expected_version
    returning * into v_after;
    v_event := 'read';
  else
    update public.contact_enquiries
    set read_at = null
    where id = p_enquiry_id and version = p_expected_version
    returning * into v_after;
    v_event := 'marked_unread';
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This enquiry changed after it was loaded. Reload before continuing.');
  end if;

  v_after_state := jsonb_build_object(
    'status', v_after.status, 'read_at', v_after.read_at, 'first_read_at', v_after.first_read_at,
    'archived_at', v_after.archived_at, 'version', v_after.version
  );

  insert into public.contact_enquiry_history(enquiry_id,event_type,from_status,to_status,actor_admin_id,metadata)
  values(p_enquiry_id,v_event,v_after.status,v_after.status,p_admin_id,jsonb_build_object('read',p_read));

  insert into public.audit_logs(admin_id,action,entity_type,entity_id,ip_hash,user_agent,before_data,after_data,metadata)
  values(p_admin_id,'contact_' || v_event,'contact_enquiry',p_enquiry_id,p_ip_hash,p_user_agent,v_before_state,v_after_state,jsonb_build_object('source','phase_14_contact_admin'));

  return jsonb_build_object('ok', true, 'version', v_after.version, 'read_at', v_after.read_at, 'first_read_at', v_after.first_read_at);
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Server-owned legal workflow transitions.
-- -----------------------------------------------------------------------------

create or replace function public.admin_transition_contact_enquiry(
  p_admin_id uuid,
  p_enquiry_id uuid,
  p_expected_version integer,
  p_target_status text,
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
  v_target text := lower(btrim(coalesce(p_target_status, '')));
  v_allowed boolean := false;
  v_before_state jsonb;
  v_after_state jsonb;
begin
  if not exists (
    select 1 from public.admins a
    where a.id = p_admin_id and a.status = 'active' and a.role = 'super_admin'
  ) then return jsonb_build_object('ok', false, 'code', 'FORBIDDEN'); end if;

  if v_target not in ('open','in_progress','resolved','closed','spam') then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Requested contact status is invalid.');
  end if;

  select * into v_row from public.contact_enquiries where id = p_enquiry_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Contact enquiry was not found.'); end if;
  if v_row.archived_at is not null then return jsonb_build_object('ok', false, 'code', 'ARCHIVED', 'message', 'Restore the enquiry before changing workflow status.'); end if;
  if p_expected_version is null or p_expected_version <> v_row.version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This enquiry changed after it was loaded. Reload before continuing.');
  end if;
  if v_target = v_row.status then
    return jsonb_build_object('ok', true, 'code', 'NO_CHANGE', 'status', v_row.status, 'version', v_row.version);
  end if;

  v_allowed := case v_row.status
    when 'new' then v_target in ('open','in_progress','resolved','spam')
    when 'open' then v_target in ('in_progress','resolved','closed','spam')
    when 'in_progress' then v_target in ('open','resolved','closed','spam')
    when 'resolved' then v_target in ('open','closed')
    when 'closed' then v_target = 'open'
    when 'spam' then v_target = 'open'
    else false
  end;

  if not v_allowed then
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'The requested contact workflow transition is not allowed.');
  end if;

  v_before_state := jsonb_build_object(
    'status', v_row.status, 'read_at', v_row.read_at, 'resolved_at', v_row.resolved_at,
    'closed_at', v_row.closed_at, 'archived_at', v_row.archived_at, 'version', v_row.version
  );

  update public.contact_enquiries
  set status = v_target,
      resolved_at = case
        when v_target = 'resolved' then now()
        when v_target in ('open','in_progress','spam') then null
        else resolved_at
      end,
      closed_at = case when v_target = 'closed' then now() else null end,
      last_activity_at = now()
  where id = p_enquiry_id and version = p_expected_version
  returning * into v_after;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This enquiry changed after it was loaded. Reload before continuing.');
  end if;

  v_after_state := jsonb_build_object(
    'status', v_after.status, 'read_at', v_after.read_at, 'resolved_at', v_after.resolved_at,
    'closed_at', v_after.closed_at, 'archived_at', v_after.archived_at, 'version', v_after.version
  );

  insert into public.contact_enquiry_history(enquiry_id,event_type,from_status,to_status,actor_admin_id,metadata)
  values(p_enquiry_id,'status_changed',v_row.status,v_after.status,p_admin_id,'{}'::jsonb);

  insert into public.audit_logs(admin_id,action,entity_type,entity_id,ip_hash,user_agent,before_data,after_data,metadata)
  values(p_admin_id,'contact_status_changed','contact_enquiry',p_enquiry_id,p_ip_hash,p_user_agent,v_before_state,v_after_state,jsonb_build_object('source','phase_14_contact_admin'));

  return jsonb_build_object('ok', true, 'status', v_after.status, 'version', v_after.version, 'resolved_at', v_after.resolved_at, 'closed_at', v_after.closed_at);
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Archive/restore is independent from workflow status. Only terminal states can
--    be archived; restore keeps the terminal status until an explicit reopen action.
-- -----------------------------------------------------------------------------

create or replace function public.admin_set_contact_archive_state(
  p_admin_id uuid,
  p_enquiry_id uuid,
  p_expected_version integer,
  p_archive boolean,
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
  v_event text;
  v_before_state jsonb;
  v_after_state jsonb;
begin
  if not exists (
    select 1 from public.admins a
    where a.id = p_admin_id and a.status = 'active' and a.role = 'super_admin'
  ) then return jsonb_build_object('ok', false, 'code', 'FORBIDDEN'); end if;

  if p_archive is null then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Archive state is required.');
  end if;

  select * into v_row from public.contact_enquiries where id = p_enquiry_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Contact enquiry was not found.'); end if;
  if p_expected_version is null or p_expected_version <> v_row.version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This enquiry changed after it was loaded. Reload before continuing.');
  end if;

  if p_archive and v_row.archived_at is not null then
    return jsonb_build_object('ok', true, 'code', 'NO_CHANGE', 'archived_at', v_row.archived_at, 'version', v_row.version);
  end if;
  if (not p_archive) and v_row.archived_at is null then
    return jsonb_build_object('ok', true, 'code', 'NO_CHANGE', 'archived_at', null, 'version', v_row.version);
  end if;
  if p_archive and v_row.status not in ('resolved','closed','spam') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_ARCHIVE_STATE', 'message', 'Resolve, close, or mark the enquiry as spam before archiving it.');
  end if;

  v_before_state := jsonb_build_object('status',v_row.status,'archived_at',v_row.archived_at,'version',v_row.version);
  v_event := case when p_archive then 'archived' else 'restored' end;

  update public.contact_enquiries
  set archived_at = case when p_archive then now() else null end,
      last_activity_at = now()
  where id = p_enquiry_id and version = p_expected_version
  returning * into v_after;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This enquiry changed after it was loaded. Reload before continuing.');
  end if;

  v_after_state := jsonb_build_object('status',v_after.status,'archived_at',v_after.archived_at,'version',v_after.version);

  insert into public.contact_enquiry_history(enquiry_id,event_type,from_status,to_status,actor_admin_id,metadata)
  values(p_enquiry_id,v_event,v_after.status,v_after.status,p_admin_id,'{}'::jsonb);

  insert into public.audit_logs(admin_id,action,entity_type,entity_id,ip_hash,user_agent,before_data,after_data,metadata)
  values(p_admin_id,'contact_' || v_event,'contact_enquiry',p_enquiry_id,p_ip_hash,p_user_agent,v_before_state,v_after_state,jsonb_build_object('source','phase_14_contact_admin'));

  return jsonb_build_object('ok', true, 'archived_at', v_after.archived_at, 'status', v_after.status, 'version', v_after.version);
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Internal notes. Expected-version locking prevents duplicate double-submit
--    insertion from the same loaded state; note text is never copied into audit logs.
-- -----------------------------------------------------------------------------

create or replace function public.admin_add_contact_enquiry_note(
  p_admin_id uuid,
  p_enquiry_id uuid,
  p_expected_version integer,
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
  v_body text := btrim(coalesce(p_body, ''));
  v_note public.contact_enquiry_notes%rowtype;
begin
  if not exists (
    select 1 from public.admins a
    where a.id = p_admin_id and a.status = 'active' and a.role = 'super_admin'
  ) then return jsonb_build_object('ok', false, 'code', 'FORBIDDEN'); end if;

  if char_length(v_body) < 1 or char_length(v_body) > 10000 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Internal note must be between 1 and 10,000 characters.');
  end if;

  select * into v_row from public.contact_enquiries where id = p_enquiry_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Contact enquiry was not found.'); end if;
  if v_row.archived_at is not null then return jsonb_build_object('ok', false, 'code', 'ARCHIVED', 'message', 'Restore the enquiry before adding an internal note.'); end if;
  if p_expected_version is null or p_expected_version <> v_row.version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This enquiry changed after it was loaded. Reload before continuing.');
  end if;

  insert into public.contact_enquiry_notes(enquiry_id,admin_id,body)
  values(p_enquiry_id,p_admin_id,v_body)
  returning * into v_note;

  select * into v_after from public.contact_enquiries where id = p_enquiry_id;

  insert into public.contact_enquiry_history(enquiry_id,event_type,from_status,to_status,actor_admin_id,metadata)
  values(p_enquiry_id,'note_added',v_after.status,v_after.status,p_admin_id,jsonb_build_object('note_id',v_note.id));

  insert into public.audit_logs(admin_id,action,entity_type,entity_id,ip_hash,user_agent,before_data,after_data,metadata)
  values(
    p_admin_id,'contact_note_added','contact_enquiry',p_enquiry_id,p_ip_hash,p_user_agent,
    jsonb_build_object('status',v_row.status,'version',v_row.version),
    jsonb_build_object('status',v_after.status,'version',v_after.version),
    jsonb_build_object('source','phase_14_contact_admin','note_id',v_note.id)
  );

  return jsonb_build_object(
    'ok', true,
    'version', v_after.version,
    'note', jsonb_build_object('id',v_note.id,'body',v_note.body,'admin_id',v_note.admin_id,'created_at',v_note.created_at)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Private execution boundary.
-- -----------------------------------------------------------------------------

revoke all on function public.get_admin_contact_list(uuid,integer,text,text,text,text,timestamptz,uuid) from public, anon, authenticated;
revoke all on function public.get_admin_contact_detail(uuid,uuid) from public, anon, authenticated;
revoke all on function public.admin_set_contact_read_state(uuid,uuid,integer,boolean,text,text) from public, anon, authenticated;
revoke all on function public.admin_transition_contact_enquiry(uuid,uuid,integer,text,text,text) from public, anon, authenticated;
revoke all on function public.admin_set_contact_archive_state(uuid,uuid,integer,boolean,text,text) from public, anon, authenticated;
revoke all on function public.admin_add_contact_enquiry_note(uuid,uuid,integer,text,text,text) from public, anon, authenticated;

grant execute on function public.get_admin_contact_list(uuid,integer,text,text,text,text,timestamptz,uuid) to service_role;
grant execute on function public.get_admin_contact_detail(uuid,uuid) to service_role;
grant execute on function public.admin_set_contact_read_state(uuid,uuid,integer,boolean,text,text) to service_role;
grant execute on function public.admin_transition_contact_enquiry(uuid,uuid,integer,text,text,text) to service_role;
grant execute on function public.admin_set_contact_archive_state(uuid,uuid,integer,boolean,text,text) to service_role;
grant execute on function public.admin_add_contact_enquiry_note(uuid,uuid,integer,text,text,text) to service_role;

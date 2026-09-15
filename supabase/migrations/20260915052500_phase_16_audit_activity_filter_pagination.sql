-- Phase 16.4 convergence: server-side filtering and bounded pagination for the audit viewer.
-- This is a forward-only migration; the earlier bounded projection remains historical.

create index if not exists audit_logs_action_prefix_idx
  on public.audit_logs (action text_pattern_ops, created_at desc, id desc);

create index if not exists audit_logs_entity_type_prefix_idx
  on public.audit_logs (entity_type text_pattern_ops, created_at desc, id desc);

create or replace function public.get_admin_audit_activity_page(
  p_admin_id uuid,
  p_page integer default 1,
  p_page_size integer default 25,
  p_action text default null,
  p_entity_type text default null,
  p_outcome text default null,
  p_actor text default 'all',
  p_from_date date default null,
  p_to_date date default null,
  p_search text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_page integer := coalesce(p_page, 1);
  v_page_size integer := coalesce(p_page_size, 25);
  v_offset integer;
  v_action text := nullif(lower(btrim(coalesce(p_action, ''))), '');
  v_entity_type text := nullif(lower(btrim(coalesce(p_entity_type, ''))), '');
  v_outcome text := nullif(lower(btrim(coalesce(p_outcome, ''))), '');
  v_actor text := lower(btrim(coalesce(p_actor, 'all')));
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_from timestamptz;
  v_to timestamptz;
  v_events jsonb;
  v_has_next boolean := false;
begin
  if not exists (
    select 1
    from public.admins a
    where a.id = p_admin_id
      and a.status = 'active'
      and a.role = 'super_admin'
      and lower(a.email) = 'rcitcservices@gmail.com'
  ) then
    raise exception 'administrator is not eligible' using errcode = '42501';
  end if;

  if v_page < 1 or v_page > 20 then
    raise exception 'audit page is outside the bounded range' using errcode = '22023';
  end if;
  if v_page_size < 1 or v_page_size > 50 then
    raise exception 'audit page size is outside the bounded range' using errcode = '22023';
  end if;
  if v_action is not null and v_action !~ '^[a-z0-9._-]{1,128}$' then
    raise exception 'invalid audit action filter' using errcode = '22023';
  end if;
  if v_entity_type is not null and v_entity_type !~ '^[a-z0-9._-]{1,64}$' then
    raise exception 'invalid audit entity filter' using errcode = '22023';
  end if;
  if v_outcome is not null and v_outcome not in ('success', 'failure', 'denied') then
    raise exception 'invalid audit outcome filter' using errcode = '22023';
  end if;
  if v_actor not in ('all', 'administrator', 'system') then
    raise exception 'invalid audit actor filter' using errcode = '22023';
  end if;
  if v_search is not null and (char_length(v_search) > 64 or v_search !~ '^[a-z0-9._-]+$') then
    raise exception 'invalid audit search filter' using errcode = '22023';
  end if;
  if p_from_date is not null and p_to_date is not null and p_to_date < p_from_date then
    raise exception 'invalid audit date range' using errcode = '22023';
  end if;
  if p_from_date is not null and p_to_date is not null and (p_to_date - p_from_date) > 366 then
    raise exception 'audit date range is too large' using errcode = '22023';
  end if;

  v_offset := (v_page - 1) * v_page_size;
  if p_from_date is not null then
    v_from := p_from_date::timestamp at time zone 'Europe/London';
  end if;
  if p_to_date is not null then
    v_to := (p_to_date + 1)::timestamp at time zone 'Europe/London';
  end if;

  with filtered as (
    select
      l.id,
      l.created_at,
      l.action,
      l.entity_type,
      l.entity_id,
      l.outcome,
      l.admin_id,
      l.request_id,
      l.session_id,
      l.ip_hash,
      l.metadata,
      a.full_name
    from public.audit_logs l
    left join public.admins a on a.id = l.admin_id
    where (v_action is null or l.action = v_action)
      and (v_entity_type is null or l.entity_type = v_entity_type)
      and (v_outcome is null or l.outcome = v_outcome)
      and (
        v_actor = 'all'
        or (v_actor = 'administrator' and l.admin_id is not null)
        or (v_actor = 'system' and l.admin_id is null)
      )
      and (v_from is null or l.created_at >= v_from)
      and (v_to is null or l.created_at < v_to)
      and (
        v_search is null
        or l.action like v_search || '%'
        or l.entity_type like v_search || '%'
      )
    order by l.created_at desc, l.id desc
    limit v_page_size + 1
    offset v_offset
  ), visible as (
    select * from filtered
    order by created_at desc, id desc
    limit v_page_size
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'event_ref', left(v.id::text, 8),
        'created_at', v.created_at,
        'action', v.action,
        'entity_type', v.entity_type,
        'entity_ref', case when v.entity_id is null then null else left(v.entity_id::text, 8) end,
        'outcome', v.outcome,
        'actor_label', case
          when v.admin_id is null then 'System / unauthenticated'
          else coalesce(nullif(v.full_name, ''), 'Administrator')
        end,
        'request_ref', case when v.request_id is null then null else left(v.request_id::text, 8) end,
        'session_ref', case when v.session_id is null then null else left(v.session_id::text, 8) end,
        'has_network_context', v.ip_hash is not null,
        'source_label', case
          when coalesce(v.metadata->>'source', '') ~ '^[A-Za-z0-9._-]{1,64}$'
            then v.metadata->>'source'
          else 'application'
        end
      ) order by v.created_at desc, v.id desc
    ), '[]'::jsonb)
  into v_events
  from visible v;

  with filtered as (
    select l.id, l.created_at
    from public.audit_logs l
    where (v_action is null or l.action = v_action)
      and (v_entity_type is null or l.entity_type = v_entity_type)
      and (v_outcome is null or l.outcome = v_outcome)
      and (
        v_actor = 'all'
        or (v_actor = 'administrator' and l.admin_id is not null)
        or (v_actor = 'system' and l.admin_id is null)
      )
      and (v_from is null or l.created_at >= v_from)
      and (v_to is null or l.created_at < v_to)
      and (
        v_search is null
        or l.action like v_search || '%'
        or l.entity_type like v_search || '%'
      )
    order by l.created_at desc, l.id desc
    limit v_page_size + 1
    offset v_offset
  )
  select count(*) > v_page_size into v_has_next from filtered;

  return jsonb_build_object(
    'events', v_events,
    'page', v_page,
    'page_size', v_page_size,
    'has_previous', v_page > 1,
    'has_next', v_has_next and v_page < 20,
    'max_page', 20,
    'generated_at', now(),
    'projection', 'phase_16_redacted_v2',
    'filters', jsonb_build_object(
      'search', v_search,
      'action', v_action,
      'entity_type', v_entity_type,
      'outcome', v_outcome,
      'actor', v_actor,
      'from_date', p_from_date,
      'to_date', p_to_date
    )
  );
end;
$$;

revoke execute on function public.get_admin_audit_activity_page(uuid, integer, integer, text, text, text, text, date, date, text)
  from public, anon, authenticated;
grant execute on function public.get_admin_audit_activity_page(uuid, integer, integer, text, text, text, text, date, date, text)
  to service_role;

comment on function public.get_admin_audit_activity_page(uuid, integer, integer, text, text, text, text, date, date, text) is
  'Phase 16.4 bounded, filterable, paginated and redacted audit projection. At most 20 pages and 50 rows per page; no raw audit payloads or full internal identifiers are returned.';

notify pgrst, 'reload schema';

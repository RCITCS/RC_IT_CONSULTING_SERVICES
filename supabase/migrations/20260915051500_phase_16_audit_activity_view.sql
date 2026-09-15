-- Phase 16.4: bounded, redacted security activity projection for the admin workspace.

create index if not exists audit_logs_created_id_idx
  on public.audit_logs(created_at desc, id desc);

create or replace function public.get_admin_audit_activity(
  p_admin_id uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 100);
  v_events jsonb;
  v_has_older boolean;
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

  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc, q.id desc), '[]'::jsonb)
  into v_events
  from (
    select
      l.id,
      l.created_at,
      l.action,
      l.entity_type,
      l.entity_id,
      l.outcome,
      case
        when l.admin_id is null then 'System / unauthenticated'
        else coalesce(nullif(a.full_name, ''), a.email, 'Administrator')
      end as actor_label,
      case when l.request_id is null then null else left(l.request_id::text, 8) end as request_ref,
      case when l.session_id is null then null else left(l.session_id::text, 8) end as session_ref,
      (l.ip_hash is not null) as has_network_context,
      coalesce(nullif(left(l.metadata->>'source', 64), ''), 'application') as source_label
    from public.audit_logs l
    left join public.admins a on a.id = l.admin_id
    order by l.created_at desc, l.id desc
    limit v_limit
  ) q;

  select exists (
    select 1
    from public.audit_logs l
    order by l.created_at desc, l.id desc
    offset v_limit
    limit 1
  ) into v_has_older;

  return jsonb_build_object(
    'events', v_events,
    'limit', v_limit,
    'has_older', v_has_older,
    'generated_at', now(),
    'projection', 'phase_16_redacted_v1'
  );
end;
$$;

revoke execute on function public.get_admin_audit_activity(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.get_admin_audit_activity(uuid, integer)
  to service_role;

comment on function public.get_admin_audit_activity(uuid, integer) is
  'Phase 16.4 bounded redacted audit projection for the active RC IT Services super administrator. Never returns raw IP hashes, user agents, before/after payloads, or metadata.';

notify pgrst, 'reload schema';

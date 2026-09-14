-- Phase 14.9 — Server-authoritative contact assignment.
-- Current administration has one active super administrator; the operation is
-- intentionally limited to assign-to-self or unassign so the browser cannot forge
-- another administrator identity.

create or replace function public.admin_set_contact_assignment(
  p_admin_id uuid,
  p_enquiry_id uuid,
  p_expected_version integer,
  p_assigned boolean,
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
  v_target uuid;
  v_event text;
  v_before_state jsonb;
  v_after_state jsonb;
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

  if p_assigned is null then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Assignment state is required.');
  end if;

  select * into v_row
  from public.contact_enquiries
  where id = p_enquiry_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Contact enquiry was not found.');
  end if;

  if v_row.archived_at is not null then
    return jsonb_build_object('ok', false, 'code', 'ARCHIVED', 'message', 'Restore the enquiry before changing assignment.');
  end if;

  if p_expected_version is null or p_expected_version <> v_row.version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This enquiry changed after it was loaded. Reload before continuing.');
  end if;

  v_target := case when p_assigned then p_admin_id else null end;
  if v_row.assigned_to is not distinct from v_target then
    return jsonb_build_object('ok', true, 'code', 'NO_CHANGE', 'assigned_to', v_row.assigned_to, 'version', v_row.version);
  end if;

  v_event := case when p_assigned then 'assigned' else 'unassigned' end;
  v_before_state := jsonb_build_object('assigned_to', v_row.assigned_to, 'status', v_row.status, 'version', v_row.version);

  update public.contact_enquiries
  set assigned_to = v_target,
      last_activity_at = now()
  where id = p_enquiry_id
    and version = p_expected_version
  returning * into v_after;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This enquiry changed after it was loaded. Reload before continuing.');
  end if;

  v_after_state := jsonb_build_object('assigned_to', v_after.assigned_to, 'status', v_after.status, 'version', v_after.version);

  insert into public.contact_enquiry_history(enquiry_id,event_type,from_status,to_status,actor_admin_id,metadata)
  values(
    p_enquiry_id,
    v_event,
    v_row.status,
    v_after.status,
    p_admin_id,
    jsonb_build_object('assigned_admin_id', v_after.assigned_to)
  );

  insert into public.audit_logs(admin_id,action,entity_type,entity_id,ip_hash,user_agent,before_data,after_data,metadata)
  values(
    p_admin_id,
    'contact_' || v_event,
    'contact_enquiry',
    p_enquiry_id,
    p_ip_hash,
    p_user_agent,
    v_before_state,
    v_after_state,
    jsonb_build_object('source','phase_14_contact_admin')
  );

  return jsonb_build_object('ok', true, 'assigned_to', v_after.assigned_to, 'version', v_after.version);
end;
$$;

revoke all on function public.admin_set_contact_assignment(uuid,uuid,integer,boolean,text,text)
  from public, anon, authenticated;
grant execute on function public.admin_set_contact_assignment(uuid,uuid,integer,boolean,text,text)
  to service_role;

comment on function public.admin_set_contact_assignment(uuid,uuid,integer,boolean,text,text) is
  'Phase 14.9 service-role-only assign-to-self/unassign boundary with optimistic concurrency, history and audit evidence.';

notify pgrst, 'reload schema';

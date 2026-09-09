-- Phase 10 — read-only administrator dashboard snapshot.
-- Self-contained final definition reconciled from the verified production function.

create or replace function public.get_admin_dashboard_snapshot(p_admin_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with active_admin as (
  select id
  from public.admins
  where id = p_admin_id
    and status = 'active'
    and role = 'super_admin'
),
time_bounds as (
  select
    (date_trunc('day', now() at time zone 'Europe/London') at time zone 'Europe/London') as day_start,
    ((date_trunc('day', now() at time zone 'Europe/London') + interval '1 day') at time zone 'Europe/London') as day_end,
    (date_trunc('week', now() at time zone 'Europe/London') at time zone 'Europe/London') as week_start
),
job_counts as (
  select
    count(*) filter (where status = 'published' and (closes_at is null or closes_at > now()))::bigint as open_positions,
    count(*) filter (where status = 'published')::bigint as published_positions,
    count(*) filter (where status = 'draft')::bigint as draft_positions
  from public.jobs
),
application_counts as (
  select
    count(*) filter (where a.submitted_at >= t.day_start and a.submitted_at < t.day_end)::bigint as applications_today,
    count(*) filter (where a.submitted_at >= t.week_start)::bigint as applications_week,
    count(*) filter (where a.status = 'submitted')::bigint as unread_applications
  from public.applications a
  cross join time_bounds t
),
enquiry_counts as (
  select count(*)::bigint as contact_enquiries
  from public.contact_enquiries
  where status in ('new','open','in_progress')
),
notification_counts as (
  select count(*)::bigint as unread_notifications
  from public.notifications n
  where n.read_at is null
    and (n.admin_id is null or n.admin_id = p_admin_id)
),
recent as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'action', x.action,
    'entity_type', x.entity_type,
    'created_at', x.created_at
  ) order by x.created_at desc), '[]'::jsonb) as value
  from (
    select action, entity_type, created_at
    from public.audit_logs
    where admin_id = p_admin_id or admin_id is null
    order by created_at desc
    limit 8
  ) x
)
select jsonb_build_object(
  'metrics', jsonb_build_object(
    'open_positions', jc.open_positions,
    'published_positions', jc.published_positions,
    'draft_positions', jc.draft_positions,
    'applications_today', ac.applications_today,
    'applications_week', ac.applications_week,
    'unread_applications', ac.unread_applications,
    'contact_enquiries', ec.contact_enquiries,
    'unread_notifications', nc.unread_notifications
  ),
  'recent_activity', recent.value,
  'generated_at', now(),
  'timezone', 'Europe/London'
)
from active_admin
cross join job_counts jc
cross join application_counts ac
cross join enquiry_counts ec
cross join notification_counts nc
cross join recent;
$$;

revoke all on function public.get_admin_dashboard_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.get_admin_dashboard_snapshot(uuid) to service_role;

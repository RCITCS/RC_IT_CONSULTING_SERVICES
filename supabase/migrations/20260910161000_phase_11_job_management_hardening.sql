-- Phase 11 — Job-management CMS hardening
-- Removes an obsolete publication-window constraint, avoids per-job application count queries,
-- bounds duplicate identifiers, and adds one-round-trip public Careers context.

-- Phase 8 used published_at as the lower bound for closes_at. Phase 11 separates historical
-- publication time from the editable opening window, so that obsolete constraint must not
-- remain authoritative after a job is unpublished/restored and scheduled again.
alter table public.jobs drop constraint if exists jobs_check;

create or replace function public.get_admin_job_management_context(
  p_admin_id uuid,
  p_job_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
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
    'ok', true,
    'jobs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', j.id,
          'category_id', j.category_id,
          'category_name', c.name,
          'category_slug', c.slug,
          'code', j.code,
          'slug', j.slug,
          'title', j.title,
          'summary', j.summary,
          'description', j.description,
          'location', j.location,
          'workplace_type', j.workplace_type,
          'employment_type', j.employment_type,
          'experience', j.experience,
          'technologies', j.technologies,
          'responsibilities', j.responsibilities,
          'qualifications', j.qualifications,
          'benefits', j.benefits,
          'status', j.status,
          'opens_at', j.opens_at,
          'published_at', j.published_at,
          'closes_at', j.closes_at,
          'archived_at', j.archived_at,
          'version', j.version,
          'application_count', coalesce(ac.application_count, 0),
          'created_at', j.created_at,
          'updated_at', j.updated_at
        ) order by j.updated_at desc
      )
      from (
        select * from public.jobs order by updated_at desc limit 500
      ) j
      left join public.job_categories c on c.id = j.category_id
      left join (
        select ap.job_id, count(*)::bigint as application_count
        from public.applications ap
        group by ap.job_id
      ) ac on ac.job_id = j.id
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'is_active', c.is_active,
        'display_order', c.display_order
      ) order by c.display_order, c.name)
      from public.job_categories c
    ), '[]'::jsonb),
    'selected', (
      select jsonb_build_object(
        'id', j.id,
        'category_id', j.category_id,
        'category_name', c.name,
        'code', j.code,
        'slug', j.slug,
        'title', j.title,
        'summary', j.summary,
        'description', j.description,
        'location', j.location,
        'workplace_type', j.workplace_type,
        'employment_type', j.employment_type,
        'experience', j.experience,
        'technologies', j.technologies,
        'responsibilities', j.responsibilities,
        'qualifications', j.qualifications,
        'benefits', j.benefits,
        'status', j.status,
        'opens_at', j.opens_at,
        'published_at', j.published_at,
        'closes_at', j.closes_at,
        'archived_at', j.archived_at,
        'version', j.version,
        'application_count', coalesce(ac.application_count, 0),
        'created_at', j.created_at,
        'updated_at', j.updated_at
      )
      from public.jobs j
      left join public.job_categories c on c.id = j.category_id
      left join (
        select ap.job_id, count(*)::bigint as application_count
        from public.applications ap
        group by ap.job_id
      ) ac on ac.job_id = j.id
      where j.id = p_job_id
      limit 1
    )
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_duplicate_job(
  p_admin_id uuid,
  p_job_id uuid,
  p_expected_version integer,
  p_ip_hash text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_job public.jobs%rowtype;
  v_suffix text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_new jsonb;
  v_slug text;
  v_code text;
begin
  if not exists (
    select 1 from public.admins a
    where a.id = p_admin_id and a.status = 'active' and a.role = 'super_admin'
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Job was not found.');
  end if;
  if p_expected_version is null or p_expected_version <> v_job.version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This job changed after the page was loaded. Reload before duplicating.');
  end if;

  v_slug := left(v_job.slug, 145) || '-copy-' || v_suffix;
  -- 18 + 6 ("-COPY-") + 8 = 32, matching the CMS job-code maximum.
  v_code := case when v_job.code is null then null else left(v_job.code, 18) || '-COPY-' || upper(v_suffix) end;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, responsibilities, qualifications, benefits,
    status, opens_at, closes_at, created_by, updated_by, version
  ) values (
    v_job.category_id, v_code, v_slug, left(v_job.title || ' — Copy', 160), v_job.summary,
    v_job.description, v_job.location, v_job.workplace_type, v_job.employment_type,
    v_job.experience, v_job.technologies, v_job.responsibilities, v_job.qualifications,
    v_job.benefits, 'draft', null, null, p_admin_id, p_admin_id, 1
  ) returning to_jsonb(public.jobs.*) into v_new;

  insert into public.audit_logs (
    admin_id, action, entity_type, entity_id, ip_hash, user_agent, before_data, after_data, metadata
  ) values (
    p_admin_id, 'job_duplicated', 'job', (v_new->>'id')::uuid, p_ip_hash, p_user_agent,
    null, v_new, jsonb_build_object('source_job_id', p_job_id, 'source', 'phase_11_cms')
  );

  return jsonb_build_object('ok', true, 'job', v_new);
end;
$$;

create or replace function public.get_public_careers_context(p_slug text default null)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with eligible as materialized (
    select
      j.id,
      j.code,
      j.slug,
      j.title,
      c.name as category,
      j.summary,
      j.description,
      j.location,
      j.workplace_type,
      j.employment_type,
      j.experience,
      j.technologies,
      j.responsibilities,
      j.qualifications,
      j.benefits,
      j.opens_at,
      j.published_at,
      j.closes_at,
      j.updated_at,
      coalesce(j.opens_at, j.published_at, j.created_at) as sort_at
    from public.jobs j
    left join public.job_categories c on c.id = j.category_id
    where j.status = 'published'
      and (j.opens_at is null or j.opens_at <= now())
      and (j.closes_at is null or j.closes_at > now())
  )
  select jsonb_build_object(
    'jobs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'code', e.code,
        'slug', e.slug,
        'title', e.title,
        'category', e.category,
        'location', e.location,
        'workplace_type', e.workplace_type,
        'employment_type', e.employment_type,
        'experience', e.experience,
        'sort_at', e.sort_at
      ) order by e.sort_at desc, e.title, e.id)
      from eligible e
    ), '[]'::jsonb),
    'selected', (
      select jsonb_build_object(
        'id', e.id,
        'code', e.code,
        'slug', e.slug,
        'title', e.title,
        'category', e.category,
        'summary', e.summary,
        'description', e.description,
        'location', e.location,
        'workplace_type', e.workplace_type,
        'employment_type', e.employment_type,
        'experience', e.experience,
        'technologies', e.technologies,
        'responsibilities', e.responsibilities,
        'qualifications', e.qualifications,
        'benefits', e.benefits,
        'opens_at', e.opens_at,
        'published_at', e.published_at,
        'closes_at', e.closes_at,
        'updated_at', e.updated_at
      )
      from eligible e
      where p_slug is null or e.slug = lower(btrim(p_slug))
      order by e.sort_at desc, e.title, e.id
      limit 1
    )
  );
$$;

revoke all on function public.get_admin_job_management_context(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_duplicate_job(uuid, uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.get_public_careers_context(text) from public, anon, authenticated;

grant execute on function public.get_admin_job_management_context(uuid, uuid) to service_role;
grant execute on function public.admin_duplicate_job(uuid, uuid, integer, text, text) to service_role;
grant execute on function public.get_public_careers_context(text) to service_role;

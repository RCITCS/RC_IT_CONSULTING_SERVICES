-- Phase 11 — preserve approved Careers content while moving runtime authority to PostgreSQL.
-- These fields already exist in the approved public vacancy model. They remain database-owned
-- after the static catalogue is retired; normal Phase 11 publishing does not depend on them.

alter table public.jobs add column if not exists industries jsonb not null default '[]'::jsonb;
alter table public.jobs add column if not exists preferred_qualifications jsonb not null default '[]'::jsonb;
alter table public.jobs add column if not exists working_style_details jsonb not null default '[]'::jsonb;
alter table public.jobs add column if not exists location_details text;

update public.jobs set industries = '[]'::jsonb where industries is null;
update public.jobs set preferred_qualifications = '[]'::jsonb where preferred_qualifications is null;
update public.jobs set working_style_details = '[]'::jsonb where working_style_details is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.jobs'::regclass and conname = 'jobs_preserved_content_arrays_check'
  ) then
    alter table public.jobs add constraint jobs_preserved_content_arrays_check check (
      jsonb_typeof(industries) = 'array'
      and jsonb_typeof(preferred_qualifications) = 'array'
      and jsonb_typeof(working_style_details) = 'array'
    );
  end if;
end $$;

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
  v_code := case when v_job.code is null then null else left(v_job.code, 18) || '-COPY-' || upper(v_suffix) end;

  insert into public.jobs (
    category_id, code, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, industries, responsibilities, qualifications,
    preferred_qualifications, benefits, working_style_details, location_details,
    status, opens_at, closes_at, created_by, updated_by, version
  ) values (
    v_job.category_id, v_code, v_slug, left(v_job.title || ' — Copy', 160), v_job.summary,
    v_job.description, v_job.location, v_job.workplace_type, v_job.employment_type,
    v_job.experience, v_job.technologies, v_job.industries, v_job.responsibilities,
    v_job.qualifications, v_job.preferred_qualifications, v_job.benefits,
    v_job.working_style_details, v_job.location_details,
    'draft', null, null, p_admin_id, p_admin_id, 1
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
      j.industries,
      j.responsibilities,
      j.qualifications,
      j.preferred_qualifications,
      j.benefits,
      j.working_style_details,
      j.location_details,
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
        'industries', e.industries,
        'responsibilities', e.responsibilities,
        'qualifications', e.qualifications,
        'preferred_qualifications', e.preferred_qualifications,
        'benefits', e.benefits,
        'working_style_details', e.working_style_details,
        'location_details', e.location_details,
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

revoke all on function public.admin_duplicate_job(uuid, uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.get_public_careers_context(text) from public, anon, authenticated;
grant execute on function public.admin_duplicate_job(uuid, uuid, integer, text, text) to service_role;
grant execute on function public.get_public_careers_context(text) to service_role;

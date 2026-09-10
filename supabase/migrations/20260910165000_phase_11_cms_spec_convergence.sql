-- Phase 11 — locked CMS specification convergence
-- Enforces server-generated immutable/non-reusable job identifiers, captures the remaining
-- candidate-facing fields, and gives admin preview/public Careers one canonical content document.

alter table public.jobs add column if not exists required_skills jsonb not null default '[]'::jsonb;
alter table public.jobs add column if not exists preferred_skills jsonb not null default '[]'::jsonb;
alter table public.jobs add column if not exists application_response_window text;

update public.jobs set required_skills = '[]'::jsonb where required_skills is null;
update public.jobs set preferred_skills = '[]'::jsonb where preferred_skills is null;

create table if not exists public.job_code_registry (
  code text primary key,
  job_id uuid not null,
  issued_at timestamptz not null default now(),
  retired_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.job_code_registry enable row level security;
revoke all on table public.job_code_registry from public, anon, authenticated;

create policy deny_browser_access on public.job_code_registry
  for all to anon, authenticated
  using (false)
  with check (false);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.jobs'::regclass and conname = 'jobs_skills_arrays_check'
  ) then
    alter table public.jobs add constraint jobs_skills_arrays_check check (
      jsonb_typeof(required_skills) = 'array'
      and jsonb_typeof(preferred_skills) = 'array'
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.jobs'::regclass and conname = 'jobs_response_window_length_check'
  ) then
    alter table public.jobs add constraint jobs_response_window_length_check check (
      application_response_window is null or length(application_response_window) <= 300
    );
  end if;
end $$;

-- Retire every pre-convergence identifier first. The registry deliberately has no foreign key:
-- a deleted vacancy's identifier remains reserved permanently and can never be issued again.
insert into public.job_code_registry (code, job_id, issued_at, retired_at, metadata)
select j.code, j.id, coalesce(j.created_at, now()), now(), jsonb_build_object(
  'source', 'phase_11_spec_convergence',
  'reason', 'legacy_identifier_retired'
)
from public.jobs j
where j.code is not null
on conflict (code) do nothing;

-- Convert the 46 approved legacy vacancies from serial-looking identifiers into stable opaque
-- corporate identifiers. The suffix is deterministic from the slug so fresh environments converge.
do $$
declare
  v_job record;
  v_function text;
  v_mode text;
  v_year text;
  v_suffix text;
  v_code text;
  v_attempt integer;
begin
  for v_job in
    select j.id, j.slug, j.code, j.created_at, j.published_at, j.workplace_type, j.location, c.name as category_name
    from public.jobs j
    left join public.job_categories c on c.id = j.category_id
    order by j.slug, j.id
  loop
    v_function := case
      when lower(coalesce(v_job.category_name, '')) like '%data%' then 'DATA'
      when lower(coalesce(v_job.category_name, '')) like '%cloud%' then 'CLOUD'
      when lower(coalesce(v_job.category_name, '')) like '%security%' or lower(coalesce(v_job.category_name, '')) like '%cyber%' then 'SEC'
      when lower(coalesce(v_job.category_name, '')) like '%quality%' or lower(coalesce(v_job.category_name, '')) like '%test%' then 'QA'
      when lower(coalesce(v_job.category_name, '')) like '%devops%' or lower(coalesce(v_job.category_name, '')) like '%platform%' or lower(coalesce(v_job.category_name, '')) like '%infrastructure%' then 'OPS'
      when lower(coalesce(v_job.category_name, '')) like '%architecture%' then 'ARCH'
      when lower(coalesce(v_job.category_name, '')) like '%consult%' or lower(coalesce(v_job.category_name, '')) like '%advis%' then 'ADV'
      when lower(coalesce(v_job.category_name, '')) like '%ai%' or lower(coalesce(v_job.category_name, '')) like '%automation%' then 'AI'
      when lower(coalesce(v_job.category_name, '')) like '%application%' or lower(coalesce(v_job.category_name, '')) like '%software%' or lower(coalesce(v_job.category_name, '')) like '%engineering%' then 'ENG'
      else 'TECH'
    end;

    v_mode := case
      when v_job.workplace_type = 'remote' then 'REM'
      when v_job.workplace_type = 'hybrid' then 'HYB'
      when v_job.workplace_type = 'onsite' and lower(coalesce(v_job.location, '')) like '%london%' then 'LDN'
      when v_job.workplace_type = 'onsite' then 'ONS'
      when v_job.workplace_type = 'flexible' then 'FLX'
      else 'UNK'
    end;

    v_year := to_char(coalesce(v_job.published_at, v_job.created_at, now()) at time zone 'Europe/London', 'YY');
    v_attempt := 0;
    loop
      v_suffix := upper(substr(md5(v_job.slug || '|rcitcs-phase11|' || v_attempt::text), 1, 6));
      v_code := 'RC-' || v_function || '-' || v_year || '-' || v_mode || '-' || v_suffix;
      exit when not exists (select 1 from public.job_code_registry r where r.code = v_code)
        and not exists (select 1 from public.jobs j where j.id <> v_job.id and lower(j.code) = lower(v_code));
      v_attempt := v_attempt + 1;
      if v_attempt > 100 then
        raise exception 'Unable to generate a unique Phase 11 identifier for %', v_job.slug;
      end if;
    end loop;

    if v_job.code is distinct from v_code then
      update public.jobs set code = v_code where id = v_job.id;
      insert into public.audit_logs (
        admin_id, action, entity_type, entity_id, before_data, after_data, metadata
      ) values (
        null, 'job_code_modernized', 'job', v_job.id,
        jsonb_build_object('code', v_job.code),
        jsonb_build_object('code', v_code),
        jsonb_build_object('source', 'phase_11_spec_convergence')
      );
    end if;

    insert into public.job_code_registry (code, job_id, issued_at, metadata)
    values (v_code, v_job.id, now(), jsonb_build_object('source', 'phase_11_spec_convergence'))
    on conflict (code) do nothing;
  end loop;
end $$;

alter table public.jobs alter column code set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.jobs'::regclass and conname = 'jobs_corporate_code_format_check'
  ) then
    alter table public.jobs add constraint jobs_corporate_code_format_check check (
      code ~ '^RC-[A-Z0-9]{2,5}-[0-9]{2}-[A-Z0-9]{3}-[A-Z0-9]{6}$'
    );
  end if;
end $$;

create or replace function public.rcitcs_assign_job_code()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_category text;
  v_function text;
  v_mode text;
  v_year text;
  v_suffix text;
  v_code text;
  v_attempt integer := 0;
begin
  select c.name into v_category from public.job_categories c where c.id = new.category_id;

  v_function := case
    when lower(coalesce(v_category, '')) like '%data%' then 'DATA'
    when lower(coalesce(v_category, '')) like '%cloud%' then 'CLOUD'
    when lower(coalesce(v_category, '')) like '%security%' or lower(coalesce(v_category, '')) like '%cyber%' then 'SEC'
    when lower(coalesce(v_category, '')) like '%quality%' or lower(coalesce(v_category, '')) like '%test%' then 'QA'
    when lower(coalesce(v_category, '')) like '%devops%' or lower(coalesce(v_category, '')) like '%platform%' or lower(coalesce(v_category, '')) like '%infrastructure%' then 'OPS'
    when lower(coalesce(v_category, '')) like '%architecture%' then 'ARCH'
    when lower(coalesce(v_category, '')) like '%consult%' or lower(coalesce(v_category, '')) like '%advis%' then 'ADV'
    when lower(coalesce(v_category, '')) like '%ai%' or lower(coalesce(v_category, '')) like '%automation%' then 'AI'
    when lower(coalesce(v_category, '')) like '%application%' or lower(coalesce(v_category, '')) like '%software%' or lower(coalesce(v_category, '')) like '%engineering%' then 'ENG'
    else 'TECH'
  end;

  v_mode := case
    when new.workplace_type = 'remote' then 'REM'
    when new.workplace_type = 'hybrid' then 'HYB'
    when new.workplace_type = 'onsite' and lower(coalesce(new.location, '')) like '%london%' then 'LDN'
    when new.workplace_type = 'onsite' then 'ONS'
    when new.workplace_type = 'flexible' then 'FLX'
    else 'UNK'
  end;
  v_year := to_char(coalesce(new.created_at, now()) at time zone 'Europe/London', 'YY');

  loop
    v_suffix := upper(substr(md5(gen_random_uuid()::text || '|' || clock_timestamp()::text || '|' || v_attempt::text), 1, 6));
    v_code := 'RC-' || v_function || '-' || v_year || '-' || v_mode || '-' || v_suffix;
    begin
      insert into public.job_code_registry (code, job_id, metadata)
      values (v_code, new.id, jsonb_build_object('source', 'server_generated'));
      new.code := v_code;
      return new;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 100 then
        raise exception 'Unable to allocate a unique job identifier';
      end if;
    end;
  end loop;
end;
$$;

create or replace function public.rcitcs_preserve_job_code()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.code is distinct from old.code then
    new.code := old.code;
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_assign_job_code on public.jobs;
create trigger jobs_assign_job_code
  before insert on public.jobs
  for each row execute function public.rcitcs_assign_job_code();

drop trigger if exists jobs_preserve_job_code on public.jobs;
create trigger jobs_preserve_job_code
  before update of code on public.jobs
  for each row execute function public.rcitcs_preserve_job_code();

revoke all on function public.rcitcs_assign_job_code() from public, anon, authenticated;
revoke all on function public.rcitcs_preserve_job_code() from public, anon, authenticated;

create or replace function public.get_job_content_document(p_job_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'id', j.id,
    'code', j.code,
    'slug', j.slug,
    'title', j.title,
    'category', c.name,
    'summary', j.summary,
    'description', j.description,
    'location', j.location,
    'workplace_type', j.workplace_type,
    'employment_type', j.employment_type,
    'experience', j.experience,
    'technologies', j.technologies,
    'required_skills', j.required_skills,
    'preferred_skills', j.preferred_skills,
    'industries', j.industries,
    'responsibilities', j.responsibilities,
    'qualifications', j.qualifications,
    'preferred_qualifications', j.preferred_qualifications,
    'benefits', j.benefits,
    'working_style_details', j.working_style_details,
    'location_details', j.location_details,
    'application_response_window', j.application_response_window,
    'status', j.status,
    'opens_at', j.opens_at,
    'published_at', j.published_at,
    'closes_at', j.closes_at,
    'archived_at', j.archived_at,
    'created_at', j.created_at,
    'updated_at', j.updated_at
  )
  from public.jobs j
  left join public.job_categories c on c.id = j.category_id
  where j.id = p_job_id
  limit 1;
$$;

revoke all on function public.get_job_content_document(uuid) from public, anon, authenticated;
grant execute on function public.get_job_content_document(uuid) to service_role;

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
    select 1 from public.admins a
    where a.id = p_admin_id and a.status = 'active' and a.role = 'super_admin'
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  select jsonb_build_object(
    'ok', true,
    'jobs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', j.id,
        'category_id', j.category_id,
        'category_name', c.name,
        'code', j.code,
        'slug', j.slug,
        'title', j.title,
        'location', j.location,
        'workplace_type', j.workplace_type,
        'status', j.status,
        'published_at', j.published_at,
        'version', j.version,
        'application_count', coalesce(ac.application_count, 0),
        'updated_at', j.updated_at
      ) order by j.updated_at desc)
      from (select * from public.jobs order by updated_at desc limit 500) j
      left join public.job_categories c on c.id = j.category_id
      left join (
        select ap.job_id, count(*)::bigint as application_count
        from public.applications ap group by ap.job_id
      ) ac on ac.job_id = j.id
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'slug', c.slug,
        'is_active', c.is_active, 'display_order', c.display_order
      ) order by c.display_order, c.name)
      from public.job_categories c
    ), '[]'::jsonb),
    'selected', (
      select public.get_job_content_document(j.id) || jsonb_build_object(
        'category_id', j.category_id,
        'category_name', c.name,
        'version', j.version,
        'application_count', coalesce(ac.application_count, 0)
      )
      from public.jobs j
      left join public.job_categories c on c.id = j.category_id
      left join (
        select ap.job_id, count(*)::bigint as application_count
        from public.applications ap group by ap.job_id
      ) ac on ac.job_id = j.id
      where j.id = p_job_id
      limit 1
    )
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_save_job(
  p_admin_id uuid,
  p_job_id uuid,
  p_expected_version integer,
  p_payload jsonb,
  p_ip_hash text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_title text;
  v_slug text;
  v_category_name text;
  v_category_slug text;
  v_category_id uuid;
  v_summary text;
  v_description text;
  v_location text;
  v_workplace_type text;
  v_employment_type text;
  v_experience text;
  v_technologies jsonb;
  v_required_skills jsonb;
  v_preferred_skills jsonb;
  v_industries jsonb;
  v_responsibilities jsonb;
  v_qualifications jsonb;
  v_preferred_qualifications jsonb;
  v_benefits jsonb;
  v_working_style_details jsonb;
  v_location_details text;
  v_application_response_window text;
  v_opens_at timestamptz;
  v_closes_at timestamptz;
  v_before jsonb;
  v_after jsonb;
  v_current_version integer;
begin
  if not exists (
    select 1 from public.admins a
    where a.id = p_admin_id and a.status = 'active' and a.role = 'super_admin'
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Job payload is invalid.');
  end if;

  v_title := btrim(coalesce(p_payload->>'title', ''));
  v_slug := lower(btrim(coalesce(p_payload->>'slug', '')));
  v_category_name := btrim(coalesce(p_payload->>'category', ''));
  v_summary := btrim(coalesce(p_payload->>'summary', ''));
  v_description := btrim(coalesce(p_payload->>'description', ''));
  v_location := btrim(coalesce(p_payload->>'location', ''));
  v_workplace_type := nullif(lower(btrim(coalesce(p_payload->>'workplace_type', ''))), '');
  v_employment_type := nullif(lower(btrim(coalesce(p_payload->>'employment_type', ''))), '');
  v_experience := btrim(coalesce(p_payload->>'experience', ''));
  v_technologies := coalesce(p_payload->'technologies', '[]'::jsonb);
  v_required_skills := coalesce(p_payload->'required_skills', '[]'::jsonb);
  v_preferred_skills := coalesce(p_payload->'preferred_skills', '[]'::jsonb);
  v_industries := coalesce(p_payload->'industries', '[]'::jsonb);
  v_responsibilities := coalesce(p_payload->'responsibilities', '[]'::jsonb);
  v_qualifications := coalesce(p_payload->'qualifications', '[]'::jsonb);
  v_preferred_qualifications := coalesce(p_payload->'preferred_qualifications', '[]'::jsonb);
  v_benefits := coalesce(p_payload->'benefits', '[]'::jsonb);
  v_working_style_details := coalesce(p_payload->'working_style_details', '[]'::jsonb);
  v_location_details := btrim(coalesce(p_payload->>'location_details', ''));
  v_application_response_window := btrim(coalesce(p_payload->>'application_response_window', ''));

  if length(v_title) < 3 or length(v_title) > 160 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Title must be between 3 and 160 characters.');
  end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(v_slug) > 160 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Slug must use lowercase letters, numbers and hyphens only.');
  end if;
  if v_category_name = '' or length(v_category_name) > 100 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Category is required and must be 100 characters or fewer.');
  end if;
  if length(v_summary) > 500 or length(v_description) > 20000 or length(v_location) > 200
     or length(v_experience) > 200 or length(v_location_details) > 2000
     or length(v_application_response_window) > 300 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'One or more job fields exceed the allowed length.');
  end if;
  if v_workplace_type is null or v_workplace_type not in ('onsite','hybrid','remote','flexible') then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Work model is required and invalid.');
  end if;
  if v_employment_type is not null and v_employment_type not in ('full_time','part_time','contract','temporary','internship','other') then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Employment type is invalid.');
  end if;

  if jsonb_typeof(v_technologies) <> 'array' or jsonb_array_length(v_technologies) > 50
     or jsonb_typeof(v_required_skills) <> 'array' or jsonb_array_length(v_required_skills) > 50
     or jsonb_typeof(v_preferred_skills) <> 'array' or jsonb_array_length(v_preferred_skills) > 50
     or jsonb_typeof(v_industries) <> 'array' or jsonb_array_length(v_industries) > 50
     or jsonb_typeof(v_responsibilities) <> 'array' or jsonb_array_length(v_responsibilities) > 50
     or jsonb_typeof(v_qualifications) <> 'array' or jsonb_array_length(v_qualifications) > 50
     or jsonb_typeof(v_preferred_qualifications) <> 'array' or jsonb_array_length(v_preferred_qualifications) > 50
     or jsonb_typeof(v_benefits) <> 'array' or jsonb_array_length(v_benefits) > 50
     or jsonb_typeof(v_working_style_details) <> 'array' or jsonb_array_length(v_working_style_details) > 50 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Structured job lists are invalid or too large.');
  end if;

  begin
    if nullif(p_payload->>'opens_at', '') is not null then v_opens_at := (p_payload->>'opens_at')::timestamptz; end if;
    if nullif(p_payload->>'closes_at', '') is not null then v_closes_at := (p_payload->>'closes_at')::timestamptz; end if;
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Opening or closing date is invalid.');
  end;
  if v_opens_at is not null and v_closes_at is not null and v_closes_at <= v_opens_at then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Closing date must be after opening date.');
  end if;

  v_category_slug := trim(both '-' from regexp_replace(lower(v_category_name), '[^a-z0-9]+', '-', 'g'));
  if v_category_slug = '' then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Job category is invalid.');
  end if;

  if p_job_id is null then
    begin
      insert into public.job_categories (slug, name, is_active, updated_at)
      values (v_category_slug, v_category_name, true, now())
      on conflict (slug) do update set name = excluded.name, is_active = true, updated_at = now()
      returning id into v_category_id;

      insert into public.jobs (
        category_id, slug, title, summary, description, location, workplace_type,
        employment_type, experience, technologies, required_skills, preferred_skills,
        industries, responsibilities, qualifications, preferred_qualifications, benefits,
        working_style_details, location_details, application_response_window,
        status, opens_at, closes_at, created_by, updated_by, version
      ) values (
        v_category_id, v_slug, v_title, nullif(v_summary, ''), nullif(v_description, ''), nullif(v_location, ''), v_workplace_type,
        v_employment_type, nullif(v_experience, ''), v_technologies, v_required_skills, v_preferred_skills,
        v_industries, v_responsibilities, v_qualifications, v_preferred_qualifications, v_benefits,
        v_working_style_details, nullif(v_location_details, ''), nullif(v_application_response_window, ''),
        'draft', v_opens_at, v_closes_at, p_admin_id, p_admin_id, 1
      ) returning to_jsonb(public.jobs.*) into v_after;

      insert into public.audit_logs (admin_id, action, entity_type, entity_id, ip_hash, user_agent, before_data, after_data, metadata)
      values (p_admin_id, 'job_created', 'job', (v_after->>'id')::uuid, p_ip_hash, p_user_agent, null, v_after, jsonb_build_object('source', 'phase_11_cms'));
      return jsonb_build_object('ok', true, 'job', v_after);
    exception when unique_violation then
      return jsonb_build_object('ok', false, 'code', 'DUPLICATE_IDENTIFIER', 'message', 'Slug is already in use.');
    end;
  end if;

  select to_jsonb(j), j.version into v_before, v_current_version
  from public.jobs j where j.id = p_job_id for update;
  if v_before is null then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Job was not found.'); end if;
  if p_expected_version is null or p_expected_version <> v_current_version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This job changed after the page was loaded. Reload before saving.');
  end if;

  begin
    insert into public.job_categories (slug, name, is_active, updated_at)
    values (v_category_slug, v_category_name, true, now())
    on conflict (slug) do update set name = excluded.name, is_active = true, updated_at = now()
    returning id into v_category_id;

    update public.jobs j
    set category_id = v_category_id,
        slug = v_slug,
        title = v_title,
        summary = nullif(v_summary, ''),
        description = nullif(v_description, ''),
        location = nullif(v_location, ''),
        workplace_type = v_workplace_type,
        employment_type = v_employment_type,
        experience = nullif(v_experience, ''),
        technologies = v_technologies,
        required_skills = v_required_skills,
        preferred_skills = v_preferred_skills,
        industries = case when p_payload ? 'industries' then v_industries else j.industries end,
        responsibilities = v_responsibilities,
        qualifications = v_qualifications,
        preferred_qualifications = case when p_payload ? 'preferred_qualifications' then v_preferred_qualifications else j.preferred_qualifications end,
        benefits = v_benefits,
        working_style_details = case when p_payload ? 'working_style_details' then v_working_style_details else j.working_style_details end,
        location_details = case when p_payload ? 'location_details' then nullif(v_location_details, '') else j.location_details end,
        application_response_window = nullif(v_application_response_window, ''),
        opens_at = v_opens_at,
        closes_at = v_closes_at,
        updated_by = p_admin_id,
        version = j.version + 1
    where j.id = p_job_id and j.version = p_expected_version
    returning to_jsonb(j.*) into v_after;

    if v_after is null then
      return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This job changed after the page was loaded. Reload before saving.');
    end if;
    insert into public.audit_logs (admin_id, action, entity_type, entity_id, ip_hash, user_agent, before_data, after_data, metadata)
    values (p_admin_id, 'job_updated', 'job', p_job_id, p_ip_hash, p_user_agent, v_before, v_after, jsonb_build_object('source', 'phase_11_cms'));
    return jsonb_build_object('ok', true, 'job', v_after);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_IDENTIFIER', 'message', 'Slug is already in use.');
  end;
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
begin
  if not exists (
    select 1 from public.admins a
    where a.id = p_admin_id and a.status = 'active' and a.role = 'super_admin'
  ) then return jsonb_build_object('ok', false, 'code', 'FORBIDDEN'); end if;

  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Job was not found.'); end if;
  if p_expected_version is null or p_expected_version <> v_job.version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This job changed after the page was loaded. Reload before duplicating.');
  end if;

  v_slug := left(v_job.slug, 145) || '-copy-' || v_suffix;
  insert into public.jobs (
    category_id, slug, title, summary, description, location, workplace_type,
    employment_type, experience, technologies, required_skills, preferred_skills,
    industries, responsibilities, qualifications, preferred_qualifications, benefits,
    working_style_details, location_details, application_response_window,
    status, opens_at, closes_at, created_by, updated_by, version
  ) values (
    v_job.category_id, v_slug, left(v_job.title || ' — Copy', 160), v_job.summary,
    v_job.description, v_job.location, v_job.workplace_type, v_job.employment_type,
    v_job.experience, v_job.technologies, v_job.required_skills, v_job.preferred_skills,
    v_job.industries, v_job.responsibilities, v_job.qualifications, v_job.preferred_qualifications,
    v_job.benefits, v_job.working_style_details, v_job.location_details, v_job.application_response_window,
    'draft', null, null, p_admin_id, p_admin_id, 1
  ) returning to_jsonb(public.jobs.*) into v_new;

  insert into public.audit_logs (admin_id, action, entity_type, entity_id, ip_hash, user_agent, before_data, after_data, metadata)
  values (p_admin_id, 'job_duplicated', 'job', (v_new->>'id')::uuid, p_ip_hash, p_user_agent, null, v_new,
          jsonb_build_object('source_job_id', p_job_id, 'source', 'phase_11_cms'));
  return jsonb_build_object('ok', true, 'job', v_new);
end;
$$;

create or replace function public.admin_delete_job(
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
  v_before jsonb;
  v_application_count bigint;
begin
  if not exists (
    select 1 from public.admins a
    where a.id = p_admin_id and a.status = 'active' and a.role = 'super_admin'
  ) then return jsonb_build_object('ok', false, 'code', 'FORBIDDEN'); end if;

  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Job was not found.'); end if;
  if p_expected_version is null or p_expected_version <> v_job.version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This job changed after the page was loaded. Reload before deleting.');
  end if;
  select count(*) into v_application_count from public.applications where job_id = p_job_id;
  if v_job.status <> 'draft' or v_job.published_at is not null or v_application_count > 0 then
    return jsonb_build_object('ok', false, 'code', 'DELETE_POLICY', 'message', 'Only never-published drafts with no applications can be permanently deleted.');
  end if;

  v_before := to_jsonb(v_job);
  update public.job_code_registry
    set retired_at = coalesce(retired_at, now()),
        metadata = metadata || jsonb_build_object('retired_reason', 'draft_deleted')
    where code = v_job.code;
  delete from public.jobs where id = p_job_id;
  insert into public.audit_logs (admin_id, action, entity_type, entity_id, ip_hash, user_agent, before_data, after_data, metadata)
  values (p_admin_id, 'job_deleted', 'job', p_job_id, p_ip_hash, p_user_agent, v_before, null, jsonb_build_object('source', 'phase_11_cms'));
  return jsonb_build_object('ok', true, 'deleted_id', p_job_id);
end;
$$;

create or replace function public.get_public_careers_context(p_slug text default null)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with eligible as materialized (
    select j.id, j.slug, j.title, j.code, c.name as category, j.location,
           j.workplace_type, j.employment_type, j.experience,
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
        'id', e.id, 'code', e.code, 'slug', e.slug, 'title', e.title,
        'category', e.category, 'location', e.location,
        'workplace_type', e.workplace_type, 'employment_type', e.employment_type,
        'experience', e.experience, 'sort_at', e.sort_at
      ) order by e.sort_at desc, e.title, e.id)
      from eligible e
    ), '[]'::jsonb),
    'selected', (
      select public.get_job_content_document(e.id)
      from eligible e
      where p_slug is null or e.slug = lower(btrim(p_slug))
      order by e.sort_at desc, e.title, e.id
      limit 1
    )
  );
$$;

revoke all on function public.get_admin_job_management_context(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_save_job(uuid, uuid, integer, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.admin_duplicate_job(uuid, uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.admin_delete_job(uuid, uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.get_public_careers_context(text) from public, anon, authenticated;

grant execute on function public.get_admin_job_management_context(uuid, uuid) to service_role;
grant execute on function public.admin_save_job(uuid, uuid, integer, jsonb, text, text) to service_role;
grant execute on function public.admin_duplicate_job(uuid, uuid, integer, text, text) to service_role;
grant execute on function public.admin_delete_job(uuid, uuid, integer, text, text) to service_role;
grant execute on function public.get_public_careers_context(text) to service_role;
-- Phase 11 — Job-management CMS
-- Forward-only schema convergence, transactional CMS mutations, optimistic concurrency,
-- publication policy, public-read projections, and audit authority.

alter table public.jobs add column if not exists code text;
alter table public.jobs add column if not exists experience text;
alter table public.jobs add column if not exists technologies jsonb not null default '[]'::jsonb;
alter table public.jobs add column if not exists responsibilities jsonb not null default '[]'::jsonb;
alter table public.jobs add column if not exists qualifications jsonb not null default '[]'::jsonb;
alter table public.jobs add column if not exists benefits jsonb not null default '[]'::jsonb;
alter table public.jobs add column if not exists opens_at timestamptz;
alter table public.jobs add column if not exists archived_at timestamptz;
alter table public.jobs add column if not exists version integer not null default 1;

update public.jobs set technologies = '[]'::jsonb where technologies is null;
update public.jobs set responsibilities = '[]'::jsonb where responsibilities is null;
update public.jobs set qualifications = '[]'::jsonb where qualifications is null;
update public.jobs set benefits = '[]'::jsonb where benefits is null;
update public.jobs set version = 1 where version is null or version < 1;

create unique index if not exists jobs_code_lower_uidx
  on public.jobs (lower(code))
  where code is not null;

create index if not exists jobs_public_runtime_idx
  on public.jobs (status, opens_at, closes_at, published_at desc);

create index if not exists jobs_updated_at_idx
  on public.jobs (updated_at desc);

create index if not exists applications_job_status_idx
  on public.applications (job_id, status);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.jobs'::regclass and conname = 'jobs_version_positive_check'
  ) then
    alter table public.jobs add constraint jobs_version_positive_check check (version > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.jobs'::regclass and conname = 'jobs_content_arrays_check'
  ) then
    alter table public.jobs add constraint jobs_content_arrays_check check (
      jsonb_typeof(technologies) = 'array'
      and jsonb_typeof(responsibilities) = 'array'
      and jsonb_typeof(qualifications) = 'array'
      and jsonb_typeof(benefits) = 'array'
    );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.jobs'::regclass and conname = 'jobs_open_close_window_check'
  ) then
    alter table public.jobs add constraint jobs_open_close_window_check check (
      closes_at is null or opens_at is null or closes_at > opens_at
    );
  end if;
end $$;

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
      select jsonb_agg(row_data order by (row_data->>'updated_at')::timestamptz desc)
      from (
        select jsonb_build_object(
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
          'application_count', (select count(*) from public.applications ap where ap.job_id = j.id),
          'created_at', j.created_at,
          'updated_at', j.updated_at
        ) as row_data
        from public.jobs j
        left join public.job_categories c on c.id = j.category_id
        order by j.updated_at desc
        limit 500
      ) q
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
        'application_count', (select count(*) from public.applications ap where ap.job_id = j.id),
        'created_at', j.created_at,
        'updated_at', j.updated_at
      )
      from public.jobs j
      left join public.job_categories c on c.id = j.category_id
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
  v_code text;
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
  v_responsibilities jsonb;
  v_qualifications jsonb;
  v_benefits jsonb;
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
  v_code := upper(nullif(btrim(coalesce(p_payload->>'code', '')), ''));
  v_category_name := btrim(coalesce(p_payload->>'category', ''));
  v_summary := btrim(coalesce(p_payload->>'summary', ''));
  v_description := btrim(coalesce(p_payload->>'description', ''));
  v_location := btrim(coalesce(p_payload->>'location', ''));
  v_workplace_type := nullif(lower(btrim(coalesce(p_payload->>'workplace_type', ''))), '');
  v_employment_type := nullif(lower(btrim(coalesce(p_payload->>'employment_type', ''))), '');
  v_experience := btrim(coalesce(p_payload->>'experience', ''));
  v_technologies := coalesce(p_payload->'technologies', '[]'::jsonb);
  v_responsibilities := coalesce(p_payload->'responsibilities', '[]'::jsonb);
  v_qualifications := coalesce(p_payload->'qualifications', '[]'::jsonb);
  v_benefits := coalesce(p_payload->'benefits', '[]'::jsonb);

  if length(v_title) < 3 or length(v_title) > 160 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Title must be between 3 and 160 characters.');
  end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(v_slug) > 160 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Slug must use lowercase letters, numbers and hyphens only.');
  end if;
  if v_code is not null and (v_code !~ '^[A-Z0-9][A-Z0-9-]{1,31}$') then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Job code must use 2-32 uppercase letters, numbers or hyphens.');
  end if;
  if length(v_category_name) > 100 or length(v_summary) > 500 or length(v_description) > 20000
     or length(v_location) > 200 or length(v_experience) > 200 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'One or more job fields exceed the allowed length.');
  end if;
  if v_workplace_type is not null and v_workplace_type not in ('onsite','hybrid','remote','flexible') then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Work model is invalid.');
  end if;
  if v_employment_type is not null and v_employment_type not in ('full_time','part_time','contract','temporary','internship','other') then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Employment type is invalid.');
  end if;
  if jsonb_typeof(v_technologies) <> 'array'
     or jsonb_typeof(v_responsibilities) <> 'array'
     or jsonb_typeof(v_qualifications) <> 'array'
     or jsonb_typeof(v_benefits) <> 'array'
     or jsonb_array_length(v_technologies) > 50
     or jsonb_array_length(v_responsibilities) > 50
     or jsonb_array_length(v_qualifications) > 50
     or jsonb_array_length(v_benefits) > 50 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Structured job lists are invalid or too large.');
  end if;

  begin
    if nullif(p_payload->>'opens_at', '') is not null then
      v_opens_at := (p_payload->>'opens_at')::timestamptz;
    end if;
    if nullif(p_payload->>'closes_at', '') is not null then
      v_closes_at := (p_payload->>'closes_at')::timestamptz;
    end if;
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Opening or closing date is invalid.');
  end;

  if v_opens_at is not null and v_closes_at is not null and v_closes_at <= v_opens_at then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Closing date must be after opening date.');
  end if;

  if v_category_name <> '' then
    v_category_slug := trim(both '-' from regexp_replace(lower(v_category_name), '[^a-z0-9]+', '-', 'g'));
    if v_category_slug = '' then
      return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Job category is invalid.');
    end if;
  end if;

  if p_job_id is null then
    begin
      if v_category_name <> '' then
        insert into public.job_categories (slug, name, is_active, updated_at)
        values (v_category_slug, v_category_name, true, now())
        on conflict (slug) do update
          set name = excluded.name, is_active = true, updated_at = now()
        returning id into v_category_id;
      end if;

      insert into public.jobs (
        category_id, code, slug, title, summary, description, location,
        workplace_type, employment_type, experience, technologies,
        responsibilities, qualifications, benefits, status, opens_at, closes_at,
        created_by, updated_by, version
      ) values (
        v_category_id, v_code, v_slug, v_title, nullif(v_summary, ''), nullif(v_description, ''), nullif(v_location, ''),
        v_workplace_type, v_employment_type, nullif(v_experience, ''), v_technologies,
        v_responsibilities, v_qualifications, v_benefits, 'draft', v_opens_at, v_closes_at,
        p_admin_id, p_admin_id, 1
      )
      returning to_jsonb(public.jobs.*) into v_after;

      insert into public.audit_logs (admin_id, action, entity_type, entity_id, ip_hash, user_agent, before_data, after_data, metadata)
      values (p_admin_id, 'job_created', 'job', (v_after->>'id')::uuid, p_ip_hash, p_user_agent, null, v_after, jsonb_build_object('source', 'phase_11_cms'));

      return jsonb_build_object('ok', true, 'job', v_after);
    exception when unique_violation then
      return jsonb_build_object('ok', false, 'code', 'DUPLICATE_IDENTIFIER', 'message', 'Slug or job code is already in use.');
    end;
  end if;

  select to_jsonb(j), j.version
    into v_before, v_current_version
  from public.jobs j
  where j.id = p_job_id
  for update;

  if v_before is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Job was not found.');
  end if;
  if p_expected_version is null or p_expected_version <> v_current_version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This job changed after the page was loaded. Reload before saving.');
  end if;

  begin
    if v_category_name <> '' then
      insert into public.job_categories (slug, name, is_active, updated_at)
      values (v_category_slug, v_category_name, true, now())
      on conflict (slug) do update
        set name = excluded.name, is_active = true, updated_at = now()
      returning id into v_category_id;
    end if;

    update public.jobs j
    set category_id = v_category_id,
        code = v_code,
        slug = v_slug,
        title = v_title,
        summary = nullif(v_summary, ''),
        description = nullif(v_description, ''),
        location = nullif(v_location, ''),
        workplace_type = v_workplace_type,
        employment_type = v_employment_type,
        experience = nullif(v_experience, ''),
        technologies = v_technologies,
        responsibilities = v_responsibilities,
        qualifications = v_qualifications,
        benefits = v_benefits,
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
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_IDENTIFIER', 'message', 'Slug or job code is already in use.');
  end;
end;
$$;

create or replace function public.admin_transition_job(
  p_admin_id uuid,
  p_job_id uuid,
  p_expected_version integer,
  p_action text,
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
  v_after jsonb;
  v_action text := lower(btrim(coalesce(p_action, '')));
begin
  if not exists (
    select 1 from public.admins a
    where a.id = p_admin_id and a.status = 'active' and a.role = 'super_admin'
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Job was not found.'); end if;
  if p_expected_version is null or p_expected_version <> v_job.version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This job changed after the page was loaded. Reload before continuing.');
  end if;
  v_before := to_jsonb(v_job);

  if v_action = 'publish' then
    if v_job.status <> 'draft' then
      return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'Only a draft job can be published.');
    end if;
    if v_job.code is null or v_job.category_id is null or coalesce(btrim(v_job.summary), '') = ''
       or coalesce(btrim(v_job.description), '') = '' or coalesce(btrim(v_job.location), '') = ''
       or v_job.workplace_type is null or v_job.employment_type is null
       or coalesce(btrim(v_job.experience), '') = ''
       or jsonb_array_length(v_job.responsibilities) = 0
       or jsonb_array_length(v_job.qualifications) = 0 then
      return jsonb_build_object('ok', false, 'code', 'PUBLISH_VALIDATION', 'message', 'Complete code, category, summary, description, location, work model, employment type, experience, responsibilities and qualifications before publishing.');
    end if;
    if v_job.closes_at is not null and v_job.closes_at <= now() then
      return jsonb_build_object('ok', false, 'code', 'PUBLISH_VALIDATION', 'message', 'Closing date must be in the future before publishing.');
    end if;
    update public.jobs j
      set status = 'published',
          published_at = coalesce(j.published_at, now()),
          opens_at = coalesce(j.opens_at, now()),
          archived_at = null,
          updated_by = p_admin_id,
          version = j.version + 1
      where j.id = p_job_id
      returning to_jsonb(j.*) into v_after;
  elsif v_action = 'unpublish' then
    if v_job.status <> 'published' then return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'Only a published job can be unpublished.'); end if;
    update public.jobs j set status = 'draft', updated_by = p_admin_id, version = j.version + 1 where j.id = p_job_id returning to_jsonb(j.*) into v_after;
  elsif v_action = 'close' then
    if v_job.status <> 'published' then return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'Only a published job can be closed.'); end if;
    update public.jobs j set status = 'closed', updated_by = p_admin_id, version = j.version + 1 where j.id = p_job_id returning to_jsonb(j.*) into v_after;
  elsif v_action = 'archive' then
    if v_job.status not in ('draft','closed') then return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'Only a draft or closed job can be archived.'); end if;
    update public.jobs j set status = 'archived', archived_at = now(), updated_by = p_admin_id, version = j.version + 1 where j.id = p_job_id returning to_jsonb(j.*) into v_after;
  elsif v_action = 'restore' then
    if v_job.status <> 'archived' then return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'Only an archived job can be restored.'); end if;
    update public.jobs j set status = 'draft', archived_at = null, updated_by = p_admin_id, version = j.version + 1 where j.id = p_job_id returning to_jsonb(j.*) into v_after;
  else
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'Requested job transition is not supported.');
  end if;

  insert into public.audit_logs (admin_id, action, entity_type, entity_id, ip_hash, user_agent, before_data, after_data, metadata)
  values (p_admin_id, 'job_' || v_action, 'job', p_job_id, p_ip_hash, p_user_agent, v_before, v_after, jsonb_build_object('source', 'phase_11_cms'));

  return jsonb_build_object('ok', true, 'job', v_after);
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
  ) then return jsonb_build_object('ok', false, 'code', 'FORBIDDEN'); end if;

  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Job was not found.'); end if;
  if p_expected_version is null or p_expected_version <> v_job.version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This job changed after the page was loaded. Reload before duplicating.');
  end if;

  v_slug := left(v_job.slug, 145) || '-copy-' || v_suffix;
  v_code := case when v_job.code is null then null else left(v_job.code, 20) || '-COPY-' || upper(v_suffix) end;

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

  insert into public.audit_logs (admin_id, action, entity_type, entity_id, ip_hash, user_agent, before_data, after_data, metadata)
  values (p_admin_id, 'job_duplicated', 'job', (v_new->>'id')::uuid, p_ip_hash, p_user_agent, null, v_new, jsonb_build_object('source_job_id', p_job_id, 'source', 'phase_11_cms'));

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
    return jsonb_build_object('ok', false, 'code', 'DELETE_POLICY', 'message', 'Only never-published drafts with no applications can be permanently deleted. Close or archive other jobs.');
  end if;

  v_before := to_jsonb(v_job);
  delete from public.jobs where id = p_job_id;
  insert into public.audit_logs (admin_id, action, entity_type, entity_id, ip_hash, user_agent, before_data, after_data, metadata)
  values (p_admin_id, 'job_deleted', 'job', p_job_id, p_ip_hash, p_user_agent, v_before, null, jsonb_build_object('source', 'phase_11_cms'));
  return jsonb_build_object('ok', true, 'deleted_id', p_job_id);
end;
$$;

create or replace function public.get_public_jobs()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(row_data order by (row_data->>'sort_at')::timestamptz desc), '[]'::jsonb)
  from (
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
      'responsibilities', j.responsibilities,
      'qualifications', j.qualifications,
      'benefits', j.benefits,
      'opens_at', j.opens_at,
      'published_at', j.published_at,
      'closes_at', j.closes_at,
      'updated_at', j.updated_at,
      'sort_at', coalesce(j.opens_at, j.published_at, j.created_at)
    ) as row_data
    from public.jobs j
    left join public.job_categories c on c.id = j.category_id
    where j.status = 'published'
      and (j.opens_at is null or j.opens_at <= now())
      and (j.closes_at is null or j.closes_at > now())
  ) q;
$$;

create or replace function public.get_public_job(p_slug text)
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
    'responsibilities', j.responsibilities,
    'qualifications', j.qualifications,
    'benefits', j.benefits,
    'opens_at', j.opens_at,
    'published_at', j.published_at,
    'closes_at', j.closes_at,
    'updated_at', j.updated_at
  )
  from public.jobs j
  left join public.job_categories c on c.id = j.category_id
  where j.slug = lower(btrim(p_slug))
    and j.status = 'published'
    and (j.opens_at is null or j.opens_at <= now())
    and (j.closes_at is null or j.closes_at > now())
  limit 1;
$$;

revoke all on function public.get_admin_job_management_context(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_save_job(uuid, uuid, integer, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.admin_transition_job(uuid, uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_duplicate_job(uuid, uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.admin_delete_job(uuid, uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.get_public_jobs() from public, anon, authenticated;
revoke all on function public.get_public_job(text) from public, anon, authenticated;

grant execute on function public.get_admin_job_management_context(uuid, uuid) to service_role;
grant execute on function public.admin_save_job(uuid, uuid, integer, jsonb, text, text) to service_role;
grant execute on function public.admin_transition_job(uuid, uuid, integer, text, text, text) to service_role;
grant execute on function public.admin_duplicate_job(uuid, uuid, integer, text, text) to service_role;
grant execute on function public.admin_delete_job(uuid, uuid, integer, text, text) to service_role;
grant execute on function public.get_public_jobs() to service_role;
grant execute on function public.get_public_job(text) to service_role;

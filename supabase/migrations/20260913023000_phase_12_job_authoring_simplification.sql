-- Phase 12 — final streamlined job authoring and controlled category authority.
-- Scope: private admin/job-management database authority only.
-- Public Careers continues to consume the existing category relationship and availability window.

insert into public.job_categories (slug, name, is_active, display_order, updated_at)
values
  ('software-development', 'Software Development', true, 180, now()),
  ('data-engineering', 'Data Engineering', true, 190, now()),
  ('full-stack-development', 'Full Stack Development', true, 200, now()),
  ('devops', 'DevOps', true, 210, now()),
  ('network-engineering', 'Network Engineering', true, 220, now()),
  ('frontend-engineering', 'Frontend Engineering', true, 230, now()),
  ('backend-engineering', 'Backend Engineering', true, 240, now()),
  ('generative-ai-gen-ai', 'Generative AI (Gen AI)', true, 250, now())
on conflict (slug) do update
set name = excluded.name,
    is_active = true,
    display_order = excluded.display_order,
    updated_at = now();

-- The legacy seed contains two rows named Data & Analytics. Keep the established
-- data-and-analytics category as the single canonical group and move any jobs
-- attached to the duplicate before removing it.
do $$
declare
  v_canonical uuid;
  v_duplicate uuid;
begin
  select id into v_canonical
  from public.job_categories
  where slug = 'data-and-analytics'
  limit 1;

  select id into v_duplicate
  from public.job_categories
  where slug = 'data-analytics'
  limit 1;

  if v_canonical is not null and v_duplicate is not null and v_canonical <> v_duplicate then
    update public.jobs set category_id = v_canonical where category_id = v_duplicate;
    delete from public.job_categories where id = v_duplicate;
  elsif v_canonical is null and v_duplicate is not null then
    update public.job_categories
      set slug = 'data-and-analytics', display_order = 50, updated_at = now()
      where id = v_duplicate;
  end if;
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
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Generated job URL is invalid.');
  end if;
  if v_category_name = '' or length(v_category_name) > 100 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Department / category is required.');
  end if;

  select c.id into v_category_id
  from public.job_categories c
  where c.is_active = true
    and lower(c.name) = lower(v_category_name)
  order by c.display_order, c.id
  limit 1;

  if v_category_id is null then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Select a valid active job category.');
  end if;

  if length(v_summary) > 500 or length(v_description) > 20000 or length(v_location) > 200
     or length(v_experience) > 200 or length(v_location_details) > 2000
     or length(v_application_response_window) > 300 then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'One or more job fields exceed the allowed length.');
  end if;
  if v_workplace_type is null or v_workplace_type not in ('onsite','hybrid','remote','flexible') then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Work mode is required and invalid.');
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
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'Start or end date is invalid.');
  end;
  if v_opens_at is not null and v_closes_at is not null and v_closes_at <= v_opens_at then
    return jsonb_build_object('ok', false, 'code', 'VALIDATION', 'message', 'End date must be after the opening boundary.');
  end if;

  if p_job_id is null then
    begin
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
      values (p_admin_id, 'job_created', 'job', (v_after->>'id')::uuid, p_ip_hash, p_user_agent, null, v_after,
              jsonb_build_object('source', 'phase_12_controlled_job_authoring'));
      return jsonb_build_object('ok', true, 'job', v_after);
    exception when unique_violation then
      return jsonb_build_object('ok', false, 'code', 'DUPLICATE_IDENTIFIER', 'message', 'The generated job URL collided with an existing vacancy. Submit again.');
    end;
  end if;

  select to_jsonb(j), j.version into v_before, v_current_version
  from public.jobs j where j.id = p_job_id for update;
  if v_before is null then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Job was not found.'); end if;
  if p_expected_version is null or p_expected_version <> v_current_version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This job changed after the page was loaded. Reload before saving.');
  end if;

  begin
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
    values (p_admin_id, 'job_updated', 'job', p_job_id, p_ip_hash, p_user_agent, v_before, v_after,
            jsonb_build_object('source', 'phase_12_controlled_job_authoring'));
    return jsonb_build_object('ok', true, 'job', v_after);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_IDENTIFIER', 'message', 'The generated job URL is already in use.');
  end;
end;
$$;

revoke all on function public.admin_save_job(uuid, uuid, integer, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.admin_save_job(uuid, uuid, integer, jsonb, text, text) to service_role;

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
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Job was not found.');
  end if;
  if p_expected_version is null or p_expected_version <> v_job.version then
    return jsonb_build_object('ok', false, 'code', 'STALE_VERSION', 'message', 'This job changed after the page was loaded. Reload before continuing.');
  end if;
  v_before := to_jsonb(v_job);

  if v_action = 'publish' then
    if v_job.status <> 'draft' then
      return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'Only a draft job can be published.');
    end if;
    if v_job.code is null
       or v_job.category_id is null
       or coalesce(btrim(v_job.description), '') = ''
       or coalesce(btrim(v_job.location), '') = ''
       or v_job.workplace_type is null
       or coalesce(btrim(v_job.experience), '') = ''
       or jsonb_typeof(v_job.required_skills) <> 'array'
       or jsonb_array_length(v_job.required_skills) = 0 then
      return jsonb_build_object(
        'ok', false,
        'code', 'PUBLISH_VALIDATION',
        'message', 'Complete department, job description, location, work mode, experience and required skills before publishing.'
      );
    end if;
    if v_job.closes_at is not null and v_job.closes_at <= now() then
      return jsonb_build_object('ok', false, 'code', 'PUBLISH_VALIDATION', 'message', 'End date must not already have passed.');
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
    update public.jobs j set status = 'draft', updated_by = p_admin_id, version = j.version + 1
      where j.id = p_job_id returning to_jsonb(j.*) into v_after;
  elsif v_action = 'close' then
    if v_job.status <> 'published' then return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'Only a published job can be closed.'); end if;
    update public.jobs j set status = 'closed', updated_by = p_admin_id, version = j.version + 1
      where j.id = p_job_id returning to_jsonb(j.*) into v_after;
  elsif v_action = 'archive' then
    if v_job.status not in ('draft','closed') then return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'Only a draft or closed job can be archived.'); end if;
    update public.jobs j set status = 'archived', archived_at = now(), updated_by = p_admin_id, version = j.version + 1
      where j.id = p_job_id returning to_jsonb(j.*) into v_after;
  elsif v_action = 'restore' then
    if v_job.status <> 'archived' then return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'Only an archived job can be restored.'); end if;
    update public.jobs j set status = 'draft', archived_at = null, updated_by = p_admin_id, version = j.version + 1
      where j.id = p_job_id returning to_jsonb(j.*) into v_after;
  else
    return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'message', 'Requested job transition is not supported.');
  end if;

  insert into public.audit_logs (
    admin_id, action, entity_type, entity_id, ip_hash, user_agent,
    before_data, after_data, metadata
  ) values (
    p_admin_id, 'job_' || v_action, 'job', p_job_id, p_ip_hash, p_user_agent,
    v_before, v_after, jsonb_build_object('source', 'phase_12_streamlined_job_authoring')
  );

  return jsonb_build_object('ok', true, 'job', v_after);
end;
$$;

revoke all on function public.admin_transition_job(uuid, uuid, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_transition_job(uuid, uuid, integer, text, text, text) to service_role;

-- Phase 12 production regression fix: signed-upload retries must not consume the
-- per-job/email intake allowance after the client cancels a failed technical session.
-- The raw per-IP 8/15m limiter remains unchanged so start/cancel loops cannot bypass
-- the public intake abuse boundary.

create or replace function public.begin_candidate_application_intake(
  p_intake_id uuid,
  p_job_slug text,
  p_token_hash text,
  p_email_hash text,
  p_ip_hash text,
  p_document_manifest jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_job public.jobs%rowtype;
  v_doc jsonb;
  v_doc_id uuid;
  v_extension text;
  v_expected_path text;
  v_expected_mime text;
  v_expected_size bigint;
  v_expires_at timestamptz := now() + interval '2 hours';
begin
  if p_intake_id is null
     or p_job_slug is null
     or p_job_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or p_token_hash !~ '^[0-9a-f]{64}$'
     or p_email_hash !~ '^[0-9a-f]{64}$'
     or p_ip_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_REQUEST');
  end if;

  if jsonb_typeof(p_document_manifest) <> 'array'
     or jsonb_array_length(p_document_manifest) < 1
     or jsonb_array_length(p_document_manifest) > 2
     or (select count(*) from jsonb_array_elements(p_document_manifest) d where d->>'kind' = 'resume') <> 1
     or (select count(*) from jsonb_array_elements(p_document_manifest) d where d->>'kind' not in ('resume','cover_letter')) > 0
     or (select count(*) from jsonb_array_elements(p_document_manifest) d where d->>'kind' = 'cover_letter') > 1 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_DOCUMENT_MANIFEST');
  end if;

  for v_doc in select value from jsonb_array_elements(p_document_manifest)
  loop
    begin
      v_doc_id := (v_doc->>'id')::uuid;
      v_extension := lower(v_doc->>'extension');
      v_expected_mime := v_doc->>'mime_type';
      v_expected_size := (v_doc->>'size_bytes')::bigint;
    exception when others then
      return jsonb_build_object('ok', false, 'code', 'INVALID_DOCUMENT_MANIFEST');
    end;

    if v_extension not in ('pdf','doc','docx')
       or v_expected_size <= 0
       or v_expected_size > 20971520
       or char_length(coalesce(v_doc->>'original_filename','')) < 1
       or char_length(v_doc->>'original_filename') > 255 then
      return jsonb_build_object('ok', false, 'code', 'INVALID_DOCUMENT_MANIFEST');
    end if;

    v_expected_path := 'applications/' || p_intake_id::text || '/documents/' || v_doc_id::text || '.' || v_extension;
    if v_doc->>'object_path' <> v_expected_path then
      return jsonb_build_object('ok', false, 'code', 'INVALID_DOCUMENT_MANIFEST');
    end if;

    if (v_extension = 'pdf' and v_expected_mime <> 'application/pdf')
       or (v_extension = 'doc' and v_expected_mime <> 'application/msword')
       or (v_extension = 'docx' and v_expected_mime <> 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') then
      return jsonb_build_object('ok', false, 'code', 'INVALID_DOCUMENT_MANIFEST');
    end if;
  end loop;

  select j.* into v_job
  from public.jobs j
  where j.slug = p_job_slug
    and j.status = 'published'
    and (j.opens_at is null or j.opens_at <= now())
    and (j.closes_at is null or j.closes_at > now())
  limit 1;

  if v_job.id is null then
    return jsonb_build_object('ok', false, 'code', 'JOB_UNAVAILABLE');
  end if;

  if exists (
    select 1 from public.applications a
    where a.job_id = v_job.id and a.email_hash = p_email_hash
  ) then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_APPLICATION');
  end if;

  -- Raw start attempts remain rate limited by network even if the client later
  -- cancels, preserving the abuse boundary around signed-token generation.
  if (
    select count(*)
    from public.application_intake_sessions s
    where s.ip_hash = p_ip_hash
      and s.created_at > now() - interval '15 minutes'
  ) >= 8 then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;

  -- Only live, incomplete sessions consume the per-job/email concurrency
  -- allowance. Cancelled technical retries must not lock a legitimate
  -- candidate out for 24 hours.
  if (
    select count(*)
    from public.application_intake_sessions s
    where s.job_id = v_job.id
      and s.email_hash = p_email_hash
      and s.created_at > now() - interval '24 hours'
      and s.cancelled_at is null
      and s.consumed_at is null
      and s.expires_at > now()
  ) >= 3 then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;

  insert into public.application_intake_sessions (
    id, job_id, token_hash, email_hash, ip_hash, document_manifest, expires_at
  ) values (
    p_intake_id, v_job.id, p_token_hash, p_email_hash, p_ip_hash, p_document_manifest, v_expires_at
  );

  return jsonb_build_object(
    'ok', true,
    'intake_id', p_intake_id,
    'expires_at', v_expires_at,
    'documents', p_document_manifest,
    'job', jsonb_build_object(
      'id', v_job.id,
      'code', v_job.code,
      'slug', v_job.slug,
      'title', v_job.title,
      'application_response_window', v_job.application_response_window
    )
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'INTAKE_CONFLICT');
end;
$$;

comment on function public.begin_candidate_application_intake(uuid, text, text, text, text, jsonb) is
  'Starts a private candidate upload session. Raw network attempts remain bounded while cancelled/expired technical retries do not consume the per-job/email live-session allowance.';

notify pgrst, 'reload schema';

-- Phase 12: read-only administration of persisted candidate applications.
-- Communication/status workflows remain later phases. Candidate documents stay private;
-- the browser never receives storage object paths or service credentials from these RPCs.

create or replace function public.get_admin_application_management_context(
  p_admin_id uuid,
  p_application_id uuid default null,
  p_job_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allowed boolean := false;
  v_applications jsonb := '[]'::jsonb;
  v_selected jsonb := null;
begin
  select exists (
    select 1
    from public.admins a
    where a.id = p_admin_id
      and a.status = 'active'
      and a.role = 'super_admin'
  ) into v_allowed;

  if not v_allowed then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  select coalesce(jsonb_agg(row_data order by row_data->>'submitted_at' desc), '[]'::jsonb)
  into v_applications
  from (
    select jsonb_build_object(
      'id', a.id,
      'public_reference', a.public_reference,
      'status', a.status,
      'first_name', a.first_name,
      'last_name', a.last_name,
      'email', a.email,
      'phone', a.phone,
      'location', a.location,
      'job_id', a.job_id,
      'job_code', a.job_code,
      'job_title', a.job_title,
      'job_slug', a.job_slug,
      'submitted_at', a.submitted_at,
      'document_count', (
        select count(*) from public.application_documents d where d.application_id = a.id
      )
    ) as row_data
    from public.applications a
    where (p_job_id is null or a.job_id = p_job_id)
    order by a.submitted_at desc, a.id desc
    limit 200
  ) rows_for_admin;

  if p_application_id is not null then
    select jsonb_build_object(
      'id', a.id,
      'public_reference', a.public_reference,
      'status', a.status,
      'first_name', a.first_name,
      'last_name', a.last_name,
      'email', a.email,
      'phone', a.phone,
      'location', a.location,
      'linkedin_url', a.linkedin_url,
      'portfolio_url', a.portfolio_url,
      'cover_letter_text', a.cover_letter_text,
      'source', a.source,
      'consent', a.consent,
      'consent_at', a.consent_at,
      'consent_version', a.consent_version,
      'job_id', a.job_id,
      'job_code', a.job_code,
      'job_title', a.job_title,
      'job_slug', a.job_slug,
      'submitted_at', a.submitted_at,
      'documents', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', d.id,
            'kind', d.kind,
            'original_filename', d.original_filename,
            'mime_type', d.mime_type,
            'size_bytes', d.size_bytes,
            'sha256', d.sha256
          ) order by case when d.kind = 'resume' then 0 else 1 end, d.created_at, d.id
        )
        from public.application_documents d
        where d.application_id = a.id
      ), '[]'::jsonb),
      'history', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'event_type', h.event_type,
            'from_status', h.from_status,
            'to_status', h.to_status,
            'notes', h.notes,
            'created_at', h.created_at
          ) order by h.created_at, h.id
        )
        from public.application_history h
        where h.application_id = a.id
      ), '[]'::jsonb)
    )
    into v_selected
    from public.applications a
    where a.id = p_application_id
      and (p_job_id is null or a.job_id = p_job_id)
    limit 1;
  end if;

  return jsonb_build_object(
    'ok', true,
    'applications', v_applications,
    'selected', v_selected,
    'generated_at', now()
  );
end;
$$;

create or replace function public.get_admin_application_document(
  p_admin_id uuid,
  p_application_id uuid,
  p_document_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allowed boolean := false;
  v_document public.application_documents%rowtype;
begin
  select exists (
    select 1
    from public.admins a
    where a.id = p_admin_id
      and a.status = 'active'
      and a.role = 'super_admin'
  ) into v_allowed;

  if not v_allowed then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  select d.* into v_document
  from public.application_documents d
  where d.id = p_document_id
    and d.application_id = p_application_id
  limit 1;

  if v_document.id is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;

  return jsonb_build_object(
    'ok', true,
    'document', jsonb_build_object(
      'id', v_document.id,
      'application_id', v_document.application_id,
      'kind', v_document.kind,
      'bucket_id', v_document.bucket_id,
      'object_path', v_document.object_path,
      'original_filename', v_document.original_filename,
      'mime_type', v_document.mime_type,
      'size_bytes', v_document.size_bytes,
      'sha256', v_document.sha256
    )
  );
end;
$$;

revoke all on function public.get_admin_application_management_context(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.get_admin_application_document(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.get_admin_application_management_context(uuid,uuid,uuid) to service_role;
grant execute on function public.get_admin_application_document(uuid,uuid,uuid) to service_role;

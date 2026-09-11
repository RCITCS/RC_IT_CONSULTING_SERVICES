-- Phase 12: candidate application workflow persistence and intake contract.
-- Forward-only and safe over both the checked-in Phase 8 baseline and the
-- already-hardened hosted schema. Public/browser roles never receive direct table
-- or RPC authority; the public Edge Function is the validation/trust boundary.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Applications: converge the legacy and hosted shapes onto one Phase 12 model.
-- ---------------------------------------------------------------------------

alter table public.applications
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists location text,
  add column if not exists linkedin_url text,
  add column if not exists portfolio_url text,
  add column if not exists cover_letter_text text,
  add column if not exists source text,
  add column if not exists consent boolean,
  add column if not exists consent_version text,
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz,
  add column if not exists email_hash text,
  add column if not exists public_reference text,
  add column if not exists job_code text,
  add column if not exists job_title text,
  add column if not exists job_slug text;

do $$
begin
  -- The repository Phase-8 baseline stored one candidate_name. Preserve existing
  -- names when they are safely separable. Ambiguous historical single-part names
  -- deliberately fail the later NOT NULL gate instead of inventing identity data.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'applications' and column_name = 'candidate_name'
  ) then
    execute $sql$
      update public.applications
      set
        first_name = coalesce(
          first_name,
          case
            when position(' ' in btrim(candidate_name)) > 0
              then split_part(btrim(candidate_name), ' ', 1)
            else nullif(btrim(candidate_name), '')
          end
        ),
        last_name = coalesce(
          last_name,
          case
            when position(' ' in btrim(candidate_name)) > 0
              then nullif(btrim(substring(btrim(candidate_name) from position(' ' in btrim(candidate_name)) + 1)), '')
            else null
          end
        )
      where candidate_name is not null
    $sql$;
    execute 'alter table public.applications alter column candidate_name drop not null';
  end if;
end
$$;

update public.applications
set
  source = coalesce(nullif(btrim(source), ''), 'website'),
  consent = coalesce(consent, consent_at is not null),
  consent_version = coalesce(nullif(btrim(consent_version), ''), case when consent_at is not null then 'legacy-unversioned' else null end),
  metadata = coalesce(metadata, '{}'::jsonb),
  created_at = coalesce(created_at, submitted_at, now()),
  email_hash = coalesce(
    email_hash,
    encode(extensions.digest(lower(btrim(email)), 'sha256'), 'hex')
  ),
  status = case status
    when 'new' then 'submitted'
    when 'reviewing' then 'under_review'
    else status
  end;

create or replace function public.generate_candidate_application_reference()
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_reference text;
begin
  loop
    v_reference := 'RC-APP-'
      || to_char(clock_timestamp() at time zone 'Europe/London', 'YY')
      || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    exit when not exists (
      select 1 from public.applications a where a.public_reference = v_reference
    );
  end loop;
  return v_reference;
end;
$$;

update public.applications
set public_reference = public.generate_candidate_application_reference()
where public_reference is null or btrim(public_reference) = '';

update public.applications a
set
  job_code = coalesce(a.job_code, j.code),
  job_title = coalesce(a.job_title, j.title),
  job_slug = coalesce(a.job_slug, j.slug)
from public.jobs j
where a.job_id = j.id
  and (a.job_code is null or a.job_title is null or a.job_slug is null);

do $$
begin
  if exists (select 1 from public.applications where job_id is null) then
    raise exception 'Phase 12 requires every application to retain a job_id; reconcile null legacy rows before migration.';
  end if;
  if exists (select 1 from public.applications where first_name is null or btrim(first_name) = '' or last_name is null or btrim(last_name) = '') then
    raise exception 'Phase 12 cannot infer an unambiguous first/last name for one or more legacy applications.';
  end if;
  if exists (select 1 from public.applications where email is null or btrim(email) = '') then
    raise exception 'Phase 12 requires an email address for every application.';
  end if;
  if exists (select 1 from public.applications where consent is distinct from true or consent_at is null or consent_version is null) then
    raise exception 'Phase 12 requires affirmative, timestamped consent for every persisted application.';
  end if;
  if exists (select 1 from public.applications where job_code is null or job_title is null or job_slug is null) then
    raise exception 'Phase 12 requires an immutable job snapshot for every application.';
  end if;
  if exists (
    select 1 from public.applications
    group by job_id, email_hash
    having count(*) > 1
  ) then
    raise exception 'Duplicate legacy applications must be reconciled before Phase 12 can enforce one application per email/job.';
  end if;
end
$$;

alter table public.applications alter column first_name set not null;
alter table public.applications alter column last_name set not null;
alter table public.applications alter column email_hash set not null;
alter table public.applications alter column job_id set not null;
alter table public.applications alter column consent set default false;
alter table public.applications alter column consent set not null;
alter table public.applications alter column consent_at set not null;
alter table public.applications alter column consent_version set not null;
alter table public.applications alter column source set default 'website';
alter table public.applications alter column source set not null;
alter table public.applications alter column metadata set default '{}'::jsonb;
alter table public.applications alter column metadata set not null;
alter table public.applications alter column created_at set default now();
alter table public.applications alter column created_at set not null;
alter table public.applications alter column public_reference set default public.generate_candidate_application_reference();
alter table public.applications alter column public_reference set not null;
alter table public.applications alter column job_code set not null;
alter table public.applications alter column job_title set not null;
alter table public.applications alter column job_slug set not null;
alter table public.applications alter column status set default 'submitted';

alter table public.applications drop constraint if exists applications_job_id_fkey;
alter table public.applications
  add constraint applications_job_id_fkey
  foreign key (job_id) references public.jobs(id) on delete restrict;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications
  add constraint applications_status_check
  check (status in ('submitted','under_review','shortlisted','interview','assessment','offer','hired','rejected','withdrawn','archived'));

alter table public.applications drop constraint if exists applications_check;
alter table public.applications drop constraint if exists applications_consent_check;
alter table public.applications
  add constraint applications_consent_check
  check (consent = true and consent_at is not null and btrim(consent_version) <> '');

alter table public.applications drop constraint if exists applications_candidate_fields_check;
alter table public.applications
  add constraint applications_candidate_fields_check
  check (
    char_length(btrim(first_name)) between 1 and 80
    and char_length(btrim(last_name)) between 1 and 80
    and char_length(btrim(email)) between 3 and 254
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and (phone is null or char_length(btrim(phone)) between 7 and 30)
    and (location is null or char_length(btrim(location)) <= 200)
    and (linkedin_url is null or char_length(btrim(linkedin_url)) <= 500)
    and (portfolio_url is null or char_length(btrim(portfolio_url)) <= 500)
    and (cover_letter_text is null or char_length(cover_letter_text) <= 10000)
  );

alter table public.applications drop constraint if exists applications_email_hash_check;
alter table public.applications
  add constraint applications_email_hash_check
  check (email_hash ~ '^[0-9a-f]{64}$');

alter table public.applications drop constraint if exists applications_public_reference_check;
alter table public.applications
  add constraint applications_public_reference_check
  check (public_reference ~ '^RC-APP-[0-9]{2}-[A-F0-9]{12}$');

create unique index if not exists applications_public_reference_uidx
  on public.applications(public_reference);
create unique index if not exists applications_job_email_hash_uidx
  on public.applications(job_id, email_hash);
create index if not exists applications_status_submitted_idx
  on public.applications(status, submitted_at desc);

-- ---------------------------------------------------------------------------
-- Candidate documents: normalize hosted/source column names and path contract.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'application_documents' and column_name = 'storage_bucket'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'application_documents' and column_name = 'bucket_id'
  ) then
    alter table public.application_documents rename column storage_bucket to bucket_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'application_documents' and column_name = 'storage_path'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'application_documents' and column_name = 'object_path'
  ) then
    alter table public.application_documents rename column storage_path to object_path;
  end if;
end
$$;

alter table public.application_documents
  add column if not exists bucket_id text,
  add column if not exists object_path text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'application_documents' and column_name = 'storage_bucket'
  ) then
    execute $sql$
      update public.application_documents
      set bucket_id = coalesce(bucket_id, storage_bucket)
      where bucket_id is null
    $sql$;
    execute 'alter table public.application_documents alter column storage_bucket drop not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'application_documents' and column_name = 'storage_path'
  ) then
    execute $sql$
      update public.application_documents
      set object_path = coalesce(object_path, storage_path)
      where object_path is null
    $sql$;
    execute 'alter table public.application_documents alter column storage_path drop not null';
  end if;
end
$$;

update public.application_documents set bucket_id = 'candidate-documents' where bucket_id is null;

alter table public.application_documents alter column bucket_id set default 'candidate-documents';
alter table public.application_documents alter column bucket_id set not null;
alter table public.application_documents alter column object_path set not null;

alter table public.application_documents drop constraint if exists application_documents_kind_check;
alter table public.application_documents
  add constraint application_documents_kind_check
  check (kind in ('resume','cover_letter'));

alter table public.application_documents drop constraint if exists application_documents_bucket_id_check;
alter table public.application_documents
  add constraint application_documents_bucket_id_check
  check (bucket_id = 'candidate-documents');

alter table public.application_documents drop constraint if exists application_documents_storage_path_check;
alter table public.application_documents drop constraint if exists application_documents_object_path_format_check;
alter table public.application_documents
  add constraint application_documents_object_path_format_check
  check (
    object_path ~* '^applications/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/documents/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|doc|docx)$'
  );

alter table public.application_documents drop constraint if exists application_documents_size_bytes_check;
alter table public.application_documents
  add constraint application_documents_size_bytes_check
  check (size_bytes > 0 and size_bytes <= 20971520);

alter table public.application_documents drop constraint if exists application_documents_mime_type_check;
alter table public.application_documents
  add constraint application_documents_mime_type_check
  check (mime_type in ('application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'));

alter table public.application_documents drop constraint if exists application_documents_check;
alter table public.application_documents
  add constraint application_documents_extension_mime_check
  check (
    (mime_type = 'application/pdf' and lower(original_filename) like '%.pdf')
    or (mime_type = 'application/msword' and lower(original_filename) like '%.doc')
    or (mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' and lower(original_filename) like '%.docx')
  );

-- Phase 8 legitimately allowed historical rows without a content hash. Do not
-- fabricate one or block the forward migration. NOT VALID preserves those rows
-- while PostgreSQL still enforces the hash contract for every new/updated row.
alter table public.application_documents drop constraint if exists application_documents_sha256_check;
alter table public.application_documents
  add constraint application_documents_sha256_check
  check (sha256 is not null and sha256 ~ '^[0-9a-f]{64}$') not valid;

create unique index if not exists application_documents_object_path_uidx
  on public.application_documents(bucket_id, object_path);

-- ---------------------------------------------------------------------------
-- History / notification compatibility.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'application_history' and column_name = 'changed_by'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'application_history' and column_name = 'actor_admin_id'
  ) then
    alter table public.application_history rename column changed_by to actor_admin_id;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'application_history' and column_name = 'note'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'application_history' and column_name = 'notes'
  ) then
    alter table public.application_history rename column note to notes;
  end if;
end
$$;

alter table public.application_history
  add column if not exists event_type text,
  add column if not exists actor_admin_id uuid,
  add column if not exists notes text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;
update public.application_history set event_type = coalesce(event_type, 'status_changed');
alter table public.application_history alter column event_type set not null;

alter table public.notifications
  add column if not exists data jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Ephemeral public intake sessions. Only the trusted Edge Function may use them.
-- ---------------------------------------------------------------------------

create table if not exists public.application_intake_sessions (
  id uuid primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  document_manifest jsonb not null check (jsonb_typeof(document_manifest) = 'array'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (consumed_at is null or cancelled_at is null)
);

create index if not exists application_intake_sessions_expiry_idx
  on public.application_intake_sessions(expires_at)
  where consumed_at is null and cancelled_at is null;
create index if not exists application_intake_sessions_ip_created_idx
  on public.application_intake_sessions(ip_hash, created_at desc);
create index if not exists application_intake_sessions_job_email_idx
  on public.application_intake_sessions(job_id, email_hash, created_at desc);

alter table public.application_intake_sessions enable row level security;
drop policy if exists deny_browser_access on public.application_intake_sessions;
create policy deny_browser_access on public.application_intake_sessions
  for all to anon, authenticated using (false) with check (false);

revoke all on table public.application_intake_sessions from anon, authenticated;
grant select, insert, update, delete on table public.application_intake_sessions to service_role;

-- ---------------------------------------------------------------------------
-- Service-only application intake RPCs. SECURITY INVOKER preserves RLS/grants.
-- ---------------------------------------------------------------------------

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

  if (
    select count(*)
    from public.application_intake_sessions s
    where s.ip_hash = p_ip_hash
      and s.created_at > now() - interval '15 minutes'
  ) >= 8 then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;

  if (
    select count(*)
    from public.application_intake_sessions s
    where s.job_id = v_job.id
      and s.email_hash = p_email_hash
      and s.created_at > now() - interval '24 hours'
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

create or replace function public.get_candidate_application_intake(
  p_token_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.application_intake_sessions%rowtype;
  v_application public.applications%rowtype;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INTAKE');
  end if;

  select s.* into v_session
  from public.application_intake_sessions s
  where s.token_hash = p_token_hash
  limit 1;

  if v_session.id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INTAKE');
  end if;

  if v_session.consumed_at is not null then
    select a.* into v_application from public.applications a where a.id = v_session.id;
    if v_application.id is null then
      return jsonb_build_object('ok', false, 'code', 'INTAKE_INCONSISTENT');
    end if;
    return jsonb_build_object(
      'ok', true,
      'completed', true,
      'application_id', v_application.id,
      'reference', v_application.public_reference,
      'submitted_at', v_application.submitted_at,
      'job', jsonb_build_object('code', v_application.job_code, 'slug', v_application.job_slug, 'title', v_application.job_title)
    );
  end if;

  if v_session.cancelled_at is not null then
    return jsonb_build_object('ok', false, 'code', 'INTAKE_CANCELLED');
  end if;
  if v_session.expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'INTAKE_EXPIRED', 'documents', v_session.document_manifest);
  end if;

  return jsonb_build_object(
    'ok', true,
    'completed', false,
    'intake_id', v_session.id,
    'job_id', v_session.job_id,
    'email_hash', v_session.email_hash,
    'expires_at', v_session.expires_at,
    'documents', v_session.document_manifest
  );
end;
$$;

create or replace function public.cancel_candidate_application_intake(
  p_token_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.application_intake_sessions%rowtype;
begin
  update public.application_intake_sessions s
  set cancelled_at = coalesce(s.cancelled_at, now()), updated_at = now()
  where s.token_hash = p_token_hash
    and s.consumed_at is null
  returning s.* into v_session;

  if v_session.id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INTAKE');
  end if;

  return jsonb_build_object('ok', true, 'documents', v_session.document_manifest);
end;
$$;

create or replace function public.finalize_candidate_application(
  p_token_hash text,
  p_payload jsonb,
  p_documents jsonb,
  p_ip_hash text,
  p_user_agent text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.application_intake_sessions%rowtype;
  v_job public.jobs%rowtype;
  v_application public.applications%rowtype;
  v_first_name text := btrim(coalesce(p_payload->>'first_name',''));
  v_last_name text := btrim(coalesce(p_payload->>'last_name',''));
  v_email text := lower(btrim(coalesce(p_payload->>'email','')));
  v_email_hash text;
  v_phone text := btrim(coalesce(p_payload->>'phone',''));
  v_location text := btrim(coalesce(p_payload->>'location',''));
  v_linkedin text := btrim(coalesce(p_payload->>'linkedin_url',''));
  v_portfolio text := btrim(coalesce(p_payload->>'portfolio_url',''));
  v_cover_letter_text text := nullif(btrim(coalesce(p_payload->>'cover_letter_text','')), '');
  v_consent boolean := coalesce((p_payload->>'consent')::boolean, false);
  v_consent_version text := btrim(coalesce(p_payload->>'consent_version',''));
  v_document jsonb;
  v_expected jsonb;
  v_reference text;
  v_submitted_at timestamptz := now();
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INTAKE');
  end if;

  select s.* into v_session
  from public.application_intake_sessions s
  where s.token_hash = p_token_hash
  for update;

  if v_session.id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INTAKE');
  end if;

  if v_session.consumed_at is not null then
    select a.* into v_application from public.applications a where a.id = v_session.id;
    if v_application.id is null then
      return jsonb_build_object('ok', false, 'code', 'INTAKE_INCONSISTENT');
    end if;
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'reference', v_application.public_reference,
      'submitted_at', v_application.submitted_at,
      'job', jsonb_build_object('code', v_application.job_code, 'slug', v_application.job_slug, 'title', v_application.job_title)
    );
  end if;

  if v_session.cancelled_at is not null then
    return jsonb_build_object('ok', false, 'code', 'INTAKE_CANCELLED');
  end if;
  if v_session.expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'INTAKE_EXPIRED');
  end if;

  select j.* into v_job
  from public.jobs j
  where j.id = v_session.job_id
    and j.status = 'published'
    and (j.opens_at is null or j.opens_at <= now())
    and (j.closes_at is null or j.closes_at > now())
  limit 1;
  if v_job.id is null then
    return jsonb_build_object('ok', false, 'code', 'JOB_UNAVAILABLE');
  end if;

  if char_length(v_first_name) not between 1 and 80
     or char_length(v_last_name) not between 1 and 80
     or char_length(v_email) not between 3 and 254
     or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or char_length(v_phone) not between 7 and 30
     or char_length(v_location) > 200
     or char_length(v_linkedin) > 500
     or char_length(v_portfolio) > 500
     or char_length(coalesce(v_cover_letter_text,'')) > 10000
     or v_consent is distinct from true
     or v_consent_version <> 'rcitcs-candidate-privacy-v1' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CANDIDATE');
  end if;

  v_email_hash := encode(extensions.digest(v_email, 'sha256'), 'hex');
  if v_email_hash <> v_session.email_hash then
    return jsonb_build_object('ok', false, 'code', 'CANDIDATE_MISMATCH');
  end if;

  if exists (
    select 1 from public.applications a
    where a.job_id = v_job.id and a.email_hash = v_email_hash
  ) then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_APPLICATION');
  end if;

  if jsonb_typeof(p_documents) <> 'array'
     or jsonb_array_length(p_documents) <> jsonb_array_length(v_session.document_manifest)
     or (select count(*) from jsonb_array_elements(p_documents) d where d->>'kind' = 'resume') <> 1 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_DOCUMENTS');
  end if;

  -- The start contract is not trusted as the final authority: a hostile client can
  -- change the candidate payload between start and finalize. Reassert the business
  -- rule at the transaction boundary before persistence.
  if v_cover_letter_text is null
     and (select count(*) from jsonb_array_elements(p_documents) d where d->>'kind' = 'cover_letter') <> 1 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CANDIDATE');
  end if;

  for v_document in select value from jsonb_array_elements(p_documents)
  loop
    select value into v_expected
    from jsonb_array_elements(v_session.document_manifest)
    where value->>'id' = v_document->>'id'
      and value->>'kind' = v_document->>'kind'
    limit 1;

    if v_expected is null
       or v_document->>'object_path' <> v_expected->>'object_path'
       or v_document->>'original_filename' <> v_expected->>'original_filename'
       or v_document->>'mime_type' <> v_expected->>'mime_type'
       or (v_document->>'size_bytes')::bigint <> (v_expected->>'size_bytes')::bigint
       or coalesce(v_document->>'sha256','') !~ '^[0-9a-f]{64}$' then
      return jsonb_build_object('ok', false, 'code', 'INVALID_DOCUMENTS');
    end if;
  end loop;

  v_reference := public.generate_candidate_application_reference();

  insert into public.applications (
    id, job_id, first_name, last_name, email, email_hash, phone, location,
    linkedin_url, portfolio_url, cover_letter_text, status, source, consent,
    consent_at, consent_version, public_reference, job_code, job_title, job_slug,
    submitted_at, metadata, created_at, updated_at
  ) values (
    v_session.id, v_job.id, v_first_name, v_last_name, v_email, v_email_hash,
    nullif(v_phone,''), nullif(v_location,''), nullif(v_linkedin,''), nullif(v_portfolio,''),
    v_cover_letter_text, 'submitted', 'website', true, v_submitted_at, v_consent_version,
    v_reference, v_job.code, v_job.title, v_job.slug, v_submitted_at,
    jsonb_build_object('intake_id', v_session.id), v_submitted_at, v_submitted_at
  ) returning * into v_application;

  insert into public.application_documents (
    id, application_id, kind, bucket_id, object_path, original_filename,
    mime_type, size_bytes, sha256
  )
  select
    (d->>'id')::uuid,
    v_application.id,
    d->>'kind',
    'candidate-documents',
    d->>'object_path',
    d->>'original_filename',
    d->>'mime_type',
    (d->>'size_bytes')::bigint,
    d->>'sha256'
  from jsonb_array_elements(p_documents) d;

  insert into public.application_history (
    application_id, actor_admin_id, event_type, from_status, to_status, notes, metadata
  ) values (
    v_application.id, null, 'candidate_submitted', null, 'submitted', null,
    jsonb_build_object('source', 'website')
  );

  insert into public.notifications (admin_id, type, title, body, data)
  select
    a.id,
    'new_application',
    'New application: ' || v_job.title,
    v_first_name || ' ' || v_last_name || ' submitted an application.',
    jsonb_build_object(
      'application_id', v_application.id,
      'application_reference', v_reference,
      'job_id', v_job.id,
      'job_code', v_job.code,
      'job_title', v_job.title
    )
  from public.admins a
  where a.status = 'active' and a.role = 'super_admin';

  insert into public.audit_logs (
    admin_id, action, entity_type, entity_id, ip_hash, user_agent, before_data, after_data, metadata
  ) values (
    null, 'candidate_application_submitted', 'application', v_application.id,
    nullif(p_ip_hash,''), left(coalesce(p_user_agent,''),500), null,
    jsonb_build_object('status','submitted','job_id',v_job.id,'job_code',v_job.code),
    jsonb_build_object('source','website')
  );

  update public.application_intake_sessions
  set consumed_at = v_submitted_at, updated_at = v_submitted_at
  where id = v_session.id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'reference', v_reference,
    'submitted_at', v_submitted_at,
    'response_window', v_job.application_response_window,
    'job', jsonb_build_object('code', v_job.code, 'slug', v_job.slug, 'title', v_job.title)
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_APPLICATION');
end;
$$;

revoke all on function public.generate_candidate_application_reference() from public, anon, authenticated;
revoke all on function public.begin_candidate_application_intake(uuid,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.get_candidate_application_intake(text) from public, anon, authenticated;
revoke all on function public.cancel_candidate_application_intake(text) from public, anon, authenticated;
revoke all on function public.finalize_candidate_application(text,jsonb,jsonb,text,text) from public, anon, authenticated;

grant execute on function public.generate_candidate_application_reference() to service_role;
grant execute on function public.begin_candidate_application_intake(uuid,text,text,text,text,jsonb) to service_role;
grant execute on function public.get_candidate_application_intake(text) to service_role;
grant execute on function public.cancel_candidate_application_intake(text) to service_role;
grant execute on function public.finalize_candidate_application(text,jsonb,jsonb,text,text) to service_role;

-- Reassert private table access after convergence.
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.application_history enable row level security;
alter table public.notifications enable row level security;

revoke all on table public.applications from anon, authenticated;
revoke all on table public.application_documents from anon, authenticated;
revoke all on table public.application_history from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;

grant select, insert, update, delete on table public.applications to service_role;
grant select, insert, update, delete on table public.application_documents to service_role;
grant select, insert, update, delete on table public.application_history to service_role;
grant select, insert, update, delete on table public.notifications to service_role;

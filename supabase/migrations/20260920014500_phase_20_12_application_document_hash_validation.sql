-- Phase 20.12: close the remaining historical application-document hash validation gap.
-- Forward-only and data-preserving. Existing rows are checked before PostgreSQL marks
-- the already-enforced NOT VALID constraint as fully validated.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.application_documents'::regclass
      and conname = 'application_documents_sha256_check'
  ) then
    raise exception 'Phase 20.12 requires application_documents_sha256_check to exist before validation.';
  end if;

  if exists (
    select 1
    from public.application_documents
    where sha256 is null
       or sha256 !~ '^[0-9a-f]{64}$'
  ) then
    raise exception 'Phase 20.12 cannot validate application_documents_sha256_check while historical violations exist.';
  end if;
end
$$;

alter table public.application_documents
  validate constraint application_documents_sha256_check;

notify pgrst, 'reload schema';

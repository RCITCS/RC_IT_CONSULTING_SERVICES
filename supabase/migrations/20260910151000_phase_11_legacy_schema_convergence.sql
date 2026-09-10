-- Phase 11 prerequisite: converge the checked-in Phase 8 recruitment schema before
-- the Phase 11 CMS migrations reference the newer column names and publication state.
-- This file is intentionally idempotent and forward-only. It does not rewrite any
-- migration that has already been applied to production.

alter table public.jobs add column if not exists published_at timestamptz;
alter table public.jobs add column if not exists workplace_type text;
alter table public.job_categories add column if not exists display_order integer not null default 0;

-- Preserve legacy values when upgrading directly from the checked-in Phase 8 baseline.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'jobs' and column_name = 'work_model'
  ) then
    execute 'update public.jobs set workplace_type = work_model where workplace_type is null and work_model is not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'job_categories' and column_name = 'sort_order'
  ) then
    execute 'update public.job_categories set display_order = sort_order where display_order = 0 and sort_order <> 0';
  end if;
end $$;

-- Phase 11 allows incomplete drafts. The immutable non-null job code is introduced
-- later in the convergence migration together with its server-side allocator, so the
-- legacy Phase 8 NOT NULL constraint must not block initial draft creation here.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.jobs'::regclass
      and tgname = 'jobs_assign_job_code'
      and not tgisinternal
  ) then
    alter table public.jobs alter column code drop not null;
  end if;

  alter table public.jobs alter column description drop not null;
end $$;

-- Normalize and constrain the new work-model authority without destroying the legacy
-- column. Removing the old column can be considered only after migration history no
-- longer depends on it.
update public.jobs
set workplace_type = null
where workplace_type is not null
  and workplace_type not in ('onsite', 'hybrid', 'remote', 'flexible');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.jobs'::regclass
      and conname = 'jobs_workplace_type_check'
  ) then
    alter table public.jobs add constraint jobs_workplace_type_check check (
      workplace_type is null or workplace_type in ('onsite', 'hybrid', 'remote', 'flexible')
    );
  end if;
end $$;

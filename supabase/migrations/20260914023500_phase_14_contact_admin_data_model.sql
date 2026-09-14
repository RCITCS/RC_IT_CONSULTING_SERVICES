-- Phase 14.2 — Contact-Enquiry Administration data model
-- Forward-only convergence from the repository's historical Phase-8 contact shape
-- to the live production compatibility baseline, followed by additive Phase-14 state.
--
-- Important: this migration does not remove legacy columns or rewrite historical
-- migrations. Existing enquiry intake values are preserved.

-- -----------------------------------------------------------------------------
-- 1. Converge the checked-in historical contact schema to the live compatibility
--    surface without dropping legacy columns or overwriting authoritative values.
-- -----------------------------------------------------------------------------

alter table public.contact_enquiries add column if not exists source text;
alter table public.contact_enquiries add column if not exists service text;
alter table public.contact_enquiries add column if not exists subject text;
alter table public.contact_enquiries add column if not exists consent boolean not null default false;
alter table public.contact_enquiries add column if not exists consent_at timestamptz;
alter table public.contact_enquiries add column if not exists assigned_to uuid references public.admins(id) on delete set null;
alter table public.contact_enquiries add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.contact_enquiries add column if not exists created_at timestamptz;

-- Preserve legacy data only when the historical columns exist. Current production
-- already has the destination columns and therefore remains unchanged by these
-- compatibility assignments.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_enquiries' and column_name = 'source_type'
  ) then
    execute $sql$
      update public.contact_enquiries
      set source = coalesce(source, source_type)
      where source is null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_enquiries' and column_name = 'topic'
  ) then
    execute $sql$
      update public.contact_enquiries
      set service = coalesce(service, topic)
      where service is null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_enquiries' and column_name = 'privacy_consent_at'
  ) then
    execute $sql$
      update public.contact_enquiries
      set consent_at = coalesce(consent_at, privacy_consent_at),
          consent = case when consent then true else privacy_consent_at is not null end
      where consent_at is null or consent is false
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_enquiries' and column_name = 'assigned_admin_id'
  ) then
    execute $sql$
      update public.contact_enquiries
      set assigned_to = coalesce(assigned_to, assigned_admin_id)
      where assigned_to is null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_enquiries' and column_name = 'received_at'
  ) then
    execute $sql$
      update public.contact_enquiries
      set created_at = coalesce(created_at, received_at)
      where created_at is null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_enquiries' and column_name = 'details'
  ) then
    execute $sql$
      update public.contact_enquiries
      set metadata = coalesce(details, '{}'::jsonb) || coalesce(metadata, '{}'::jsonb)
      where details is not null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_enquiries' and column_name = 'request_id'
  ) then
    execute $sql$
      update public.contact_enquiries
      set metadata = jsonb_strip_nulls(coalesce(metadata, '{}'::jsonb) || jsonb_build_object('request_id', request_id))
      where request_id is not null and not (coalesce(metadata, '{}'::jsonb) ? 'request_id')
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_enquiries' and column_name = 'job_title'
  ) then
    execute $sql$
      update public.contact_enquiries
      set metadata = jsonb_strip_nulls(coalesce(metadata, '{}'::jsonb) || jsonb_build_object('job_title', job_title))
      where job_title is not null and not (coalesce(metadata, '{}'::jsonb) ? 'job_title')
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_enquiries' and column_name = 'first_name'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contact_enquiries' and column_name = 'last_name'
  ) then
    execute $sql$
      update public.contact_enquiries
      set name = nullif(btrim(concat_ws(' ', nullif(btrim(first_name), ''), nullif(btrim(last_name), ''))), '')
      where name is null
    $sql$;
  end if;
end $$;

update public.contact_enquiries
set created_at = coalesce(created_at, updated_at, now())
where created_at is null;

alter table public.contact_enquiries alter column created_at set default now();
alter table public.contact_enquiries alter column created_at set not null;
alter table public.contact_enquiries alter column metadata set default '{}'::jsonb;
alter table public.contact_enquiries alter column metadata set not null;
alter table public.contact_enquiries alter column consent set default false;
alter table public.contact_enquiries alter column consent set not null;

-- Historical Phase-8 used `read` as a workflow status. Phase 14 separates read state
-- from workflow state; preserve the meaning by converging legacy `read` rows to `open`.
update public.contact_enquiries set status = 'open' where status = 'read';

alter table public.contact_enquiries drop constraint if exists contact_enquiries_status_check;
alter table public.contact_enquiries add constraint contact_enquiries_status_check
  check (status in ('new','open','in_progress','resolved','closed','spam'));

create index if not exists contact_enquiries_status_created_idx
  on public.contact_enquiries(status, created_at desc);
create index if not exists contact_enquiries_email_lower_idx
  on public.contact_enquiries(lower(email));
create index if not exists contact_enquiries_assigned_to_idx
  on public.contact_enquiries(assigned_to, created_at desc)
  where assigned_to is not null;

-- Preserve the current public persistence invariant where the historical table is
-- empty/compatible. Do not fabricate missing legacy user content merely to force a
-- NOT NULL constraint.
do $$
begin
  if not exists (select 1 from public.contact_enquiries where name is null) then
    alter table public.contact_enquiries alter column name set not null;
  end if;
  if not exists (select 1 from public.contact_enquiries where message is null) then
    alter table public.contact_enquiries alter column message set not null;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Add Phase-14 enquiry operational state.
-- -----------------------------------------------------------------------------

alter table public.contact_enquiries add column if not exists read_at timestamptz;
alter table public.contact_enquiries add column if not exists first_read_at timestamptz;
alter table public.contact_enquiries add column if not exists resolved_at timestamptz;
alter table public.contact_enquiries add column if not exists closed_at timestamptz;
alter table public.contact_enquiries add column if not exists archived_at timestamptz;
alter table public.contact_enquiries add column if not exists last_activity_at timestamptz;
alter table public.contact_enquiries add column if not exists version integer not null default 1;

update public.contact_enquiries
set last_activity_at = coalesce(last_activity_at, updated_at, created_at, now())
where last_activity_at is null;

alter table public.contact_enquiries alter column last_activity_at set default now();
alter table public.contact_enquiries alter column last_activity_at set not null;

alter table public.contact_enquiries drop constraint if exists contact_enquiries_version_check;
alter table public.contact_enquiries add constraint contact_enquiries_version_check
  check (version >= 1);

alter table public.contact_enquiries drop constraint if exists contact_enquiries_read_state_check;
alter table public.contact_enquiries add constraint contact_enquiries_read_state_check
  check (read_at is null or first_read_at is not null);

alter table public.contact_enquiries drop constraint if exists contact_enquiries_archive_terminal_check;
alter table public.contact_enquiries add constraint contact_enquiries_archive_terminal_check
  check (archived_at is null or status in ('resolved','closed','spam'));

create index if not exists contact_enquiries_active_activity_idx
  on public.contact_enquiries(last_activity_at desc, id desc)
  where archived_at is null;
create index if not exists contact_enquiries_status_activity_idx
  on public.contact_enquiries(status, last_activity_at desc, id desc)
  where archived_at is null;
create index if not exists contact_enquiries_unread_activity_idx
  on public.contact_enquiries(last_activity_at desc, id desc)
  where archived_at is null and read_at is null;

-- Original public intake is immutable once accepted. Phase-14 operational fields are
-- the only fields intended to change through the private administration workflow.
create or replace function public.guard_contact_enquiry_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.name is distinct from old.name
    or new.email is distinct from old.email
    or new.phone is distinct from old.phone
    or new.company is distinct from old.company
    or new.service is distinct from old.service
    or new.subject is distinct from old.subject
    or new.message is distinct from old.message
    or new.consent is distinct from old.consent
    or new.consent_at is distinct from old.consent_at
    or new.source is distinct from old.source
    or new.metadata is distinct from old.metadata
    or new.created_at is distinct from old.created_at
  then
    raise exception 'accepted contact enquiry intake is immutable';
  end if;

  new.version := old.version + 1;
  return new;
end;
$$;

drop trigger if exists contact_enquiries_guard_update on public.contact_enquiries;
create trigger contact_enquiries_guard_update
before update on public.contact_enquiries
for each row execute function public.guard_contact_enquiry_update();

-- -----------------------------------------------------------------------------
-- 3. Append-only workflow history.
-- -----------------------------------------------------------------------------

create table if not exists public.contact_enquiry_history (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.contact_enquiries(id) on delete cascade,
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_]{0,63}$'),
  from_status text check (from_status is null or from_status in ('new','open','in_progress','resolved','closed','spam')),
  to_status text check (to_status is null or to_status in ('new','open','in_progress','resolved','closed','spam')),
  actor_admin_id uuid references public.admins(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contact_enquiry_history_enquiry_created_idx
  on public.contact_enquiry_history(enquiry_id, created_at desc, id desc);
create index if not exists contact_enquiry_history_actor_created_idx
  on public.contact_enquiry_history(actor_admin_id, created_at desc)
  where actor_admin_id is not null;

-- -----------------------------------------------------------------------------
-- 4. Internal notes. This table has no email trigger by design.
-- -----------------------------------------------------------------------------

create table if not exists public.contact_enquiry_notes (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.contact_enquiries(id) on delete cascade,
  admin_id uuid references public.admins(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  created_at timestamptz not null default now()
);

create index if not exists contact_enquiry_notes_enquiry_created_idx
  on public.contact_enquiry_notes(enquiry_id, created_at desc, id desc);

-- -----------------------------------------------------------------------------
-- 5. Persisted external admin replies. Delivery state is intentionally NOT copied
--    here; `email_logs` remains the authoritative provider-delivery source of truth.
-- -----------------------------------------------------------------------------

create table if not exists public.contact_enquiry_messages (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.contact_enquiries(id) on delete cascade,
  direction text not null default 'outbound' check (direction = 'outbound'),
  sender_email text not null default 'contact@rcitcs.com' check (lower(sender_email) = 'contact@rcitcs.com'),
  recipient_email text not null check (
    char_length(recipient_email) between 3 and 254
    and recipient_email !~ E'[\\r\\n]'
  ),
  reply_to_email text not null default 'contact@rcitcs.com' check (lower(reply_to_email) = 'contact@rcitcs.com'),
  subject text not null check (
    char_length(btrim(subject)) between 1 and 300
    and subject !~ E'[\\r\\n]'
  ),
  body_text text not null check (char_length(btrim(body_text)) between 1 and 10000),
  idempotency_key text not null unique check (
    char_length(idempotency_key) between 1 and 256
    and idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$'
  ),
  email_log_id uuid unique references public.email_logs(id) on delete set null,
  created_by_admin_id uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists contact_enquiry_messages_enquiry_created_idx
  on public.contact_enquiry_messages(enquiry_id, created_at desc, id desc);

-- Notes and persisted replies are meaningful enquiry activity. Touch the parent row
-- through its guarded operational update so version/updated_at remain authoritative.
create or replace function public.touch_contact_enquiry_activity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.contact_enquiries
  set last_activity_at = greatest(last_activity_at, new.created_at)
  where id = new.enquiry_id;
  return new;
end;
$$;

drop trigger if exists contact_enquiry_notes_touch_activity on public.contact_enquiry_notes;
create trigger contact_enquiry_notes_touch_activity
after insert on public.contact_enquiry_notes
for each row execute function public.touch_contact_enquiry_activity();

drop trigger if exists contact_enquiry_messages_touch_activity on public.contact_enquiry_messages;
create trigger contact_enquiry_messages_touch_activity
after insert on public.contact_enquiry_messages
for each row execute function public.touch_contact_enquiry_activity();

-- -----------------------------------------------------------------------------
-- 6. Private-table security boundary.
-- -----------------------------------------------------------------------------

alter table public.contact_enquiries enable row level security;
alter table public.contact_enquiries force row level security;
alter table public.contact_enquiry_history enable row level security;
alter table public.contact_enquiry_history force row level security;
alter table public.contact_enquiry_notes enable row level security;
alter table public.contact_enquiry_notes force row level security;
alter table public.contact_enquiry_messages enable row level security;
alter table public.contact_enquiry_messages force row level security;

revoke all on table public.contact_enquiry_history, public.contact_enquiry_notes, public.contact_enquiry_messages
  from public, anon, authenticated;
revoke all on function public.guard_contact_enquiry_update() from public, anon, authenticated;
revoke all on function public.touch_contact_enquiry_activity() from public, anon, authenticated;

grant select, insert on table public.contact_enquiry_history, public.contact_enquiry_notes, public.contact_enquiry_messages
  to service_role;
grant execute on function public.guard_contact_enquiry_update() to service_role;
grant execute on function public.touch_contact_enquiry_activity() to service_role;

drop policy if exists deny_browser_access on public.contact_enquiry_history;
create policy deny_browser_access on public.contact_enquiry_history
  as restrictive for all to anon, authenticated using (false) with check (false);

drop policy if exists deny_browser_access on public.contact_enquiry_notes;
create policy deny_browser_access on public.contact_enquiry_notes
  as restrictive for all to anon, authenticated using (false) with check (false);

drop policy if exists deny_browser_access on public.contact_enquiry_messages;
create policy deny_browser_access on public.contact_enquiry_messages
  as restrictive for all to anon, authenticated using (false) with check (false);

-- Reassert the existing contact table browser deny policy without changing service
-- authority or Phase-13 contact email triggers.
drop policy if exists deny_browser_access on public.contact_enquiries;
create policy deny_browser_access on public.contact_enquiries
  as restrictive for all to anon, authenticated using (false) with check (false);

revoke all on table public.contact_enquiries from anon, authenticated;
grant select, insert, update, delete on table public.contact_enquiries to service_role;

comment on table public.contact_enquiry_history is 'Append-only Phase-14 workflow/system history for contact enquiries.';
comment on table public.contact_enquiry_notes is 'Private internal administrator notes. Never an email source.';
comment on table public.contact_enquiry_messages is 'Persisted outbound contact replies; email_logs remains delivery-state authority.';

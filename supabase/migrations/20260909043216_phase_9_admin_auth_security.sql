-- Phase 9: final administrator authentication and security contract.
-- This migration is intentionally safe to run over both the repository Phase-8
-- baseline and the already-hardened production schema.

create extension if not exists pgcrypto;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'admins' and column_name = 'display_name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'admins' and column_name = 'full_name'
  ) then
    alter table public.admins rename column display_name to full_name;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'actor_admin_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'admin_id'
  ) then
    alter table public.audit_logs rename column actor_admin_id to admin_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'email_logs' and column_name = 'recipient'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'email_logs' and column_name = 'recipient_email'
  ) then
    alter table public.email_logs rename column recipient to recipient_email;
  end if;
end
$$;

alter table public.admins
  add column if not exists full_name text,
  add column if not exists password_hash text,
  add column if not exists last_login_at timestamptz;

alter table public.admins alter column role set default 'admin';
alter table public.admins alter column status set default 'inactive';

update public.admins
set role = 'admin'
where role = 'owner';

alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins
  add constraint admins_role_check
  check (role in ('admin', 'super_admin', 'recruiter', 'support', 'viewer'));

alter table public.admins drop constraint if exists admins_status_check;
alter table public.admins
  add constraint admins_status_check
  check (status in ('inactive', 'active', 'suspended', 'disabled'));

alter table public.admins drop constraint if exists admins_password_hash_shape_check;
alter table public.admins
  add constraint admins_password_hash_shape_check
  check (
    password_hash is null
    or password_hash ~ '^\$2[aby]\$12\$[./A-Za-z0-9]{53}$'
  );

alter table public.admins drop constraint if exists admins_single_rc_owner_email_check;
alter table public.admins
  add constraint admins_single_rc_owner_email_check
  check (lower(email) = 'rcitcservices@gmail.com' or role <> 'super_admin');

alter table public.admins drop constraint if exists admins_auth_user_id_fkey;
alter table public.admins
  add constraint admins_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users(id) on delete set null;

update public.admins
set
  role = 'super_admin',
  status = 'active',
  full_name = coalesce(full_name, 'RC IT Services Administrator'),
  updated_at = now()
where lower(email) = 'rcitcservices@gmail.com';

insert into public.admins (email, full_name, role, status)
select 'rcitcservices@gmail.com', 'RC IT Services Administrator', 'super_admin', 'active'
where not exists (
  select 1 from public.admins where lower(email) = 'rcitcservices@gmail.com'
);

update public.admins
set status = 'disabled', updated_at = now()
where role = 'super_admin'
  and status = 'active'
  and lower(email) <> 'rcitcservices@gmail.com';

create unique index if not exists admins_single_active_super_admin_uidx
  on public.admins (role)
  where role = 'super_admin' and status = 'active';

alter table public.sessions
  add column if not exists csrf_token_hash text,
  add column if not exists ip_hash text,
  add column if not exists user_agent text;

update public.sessions
set
  last_seen_at = coalesce(last_seen_at, created_at),
  csrf_token_hash = coalesce(
    csrf_token_hash,
    encode(extensions.digest(gen_random_uuid()::text, 'sha256'), 'hex')
  ),
  revoked_at = case
    when csrf_token_hash is null then coalesce(revoked_at, now())
    else revoked_at
  end
where last_seen_at is null or csrf_token_hash is null;

alter table public.sessions alter column csrf_token_hash set not null;

alter table public.sessions drop constraint if exists sessions_token_hash_check;
alter table public.sessions
  add constraint sessions_token_hash_check
  check (token_hash ~ '^[0-9a-f]{64}$');

alter table public.sessions drop constraint if exists sessions_csrf_token_hash_check;
alter table public.sessions
  add constraint sessions_csrf_token_hash_check
  check (csrf_token_hash ~ '^[0-9a-f]{64}$');

alter table public.password_reset_tokens
  add column if not exists requested_ip_hash text;

alter table public.password_reset_tokens drop constraint if exists password_reset_tokens_token_hash_check;
alter table public.password_reset_tokens
  add constraint password_reset_tokens_token_hash_check
  check (token_hash ~ '^[0-9a-f]{64}$');

alter table public.email_logs
  add column if not exists application_id uuid,
  add column if not exists contact_enquiry_id uuid,
  add column if not exists provider text,
  add column if not exists recipient_email text,
  add column if not exists subject text,
  add column if not exists error_message text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'email_logs'
      and column_name = 'related_entity_type'
  ) then
    execute $sql$
      update public.email_logs
      set
        application_id = case
          when related_entity_type = 'application' then related_entity_id
          else application_id
        end,
        contact_enquiry_id = case
          when related_entity_type = 'contact_enquiry' then related_entity_id
          else contact_enquiry_id
        end
    $sql$;
  end if;
end
$$;

alter table public.email_logs drop constraint if exists email_logs_status_check;

update public.email_logs set provider = coalesce(provider, 'pending');
update public.email_logs set status = 'queued' where status = 'pending';

alter table public.email_logs alter column provider set not null;
alter table public.email_logs alter column recipient_email set not null;
alter table public.email_logs alter column status drop default;

alter table public.email_logs
  add constraint email_logs_status_check
  check (status in ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'suppressed'));

alter table public.email_logs drop constraint if exists email_logs_application_id_fkey;
alter table public.email_logs
  add constraint email_logs_application_id_fkey
  foreign key (application_id) references public.applications(id) on delete set null;

alter table public.email_logs drop constraint if exists email_logs_contact_enquiry_id_fkey;
alter table public.email_logs
  add constraint email_logs_contact_enquiry_id_fkey
  foreign key (contact_enquiry_id) references public.contact_enquiries(id) on delete set null;

alter table public.email_logs
  drop column if exists related_entity_type,
  drop column if exists related_entity_id;

alter table public.audit_logs
  add column if not exists admin_id uuid,
  add column if not exists ip_hash text,
  add column if not exists user_agent text,
  add column if not exists before_data jsonb,
  add column if not exists after_data jsonb;

alter table public.audit_logs drop constraint if exists audit_logs_actor_admin_id_fkey;
alter table public.audit_logs drop constraint if exists audit_logs_admin_id_fkey;
alter table public.audit_logs
  add constraint audit_logs_admin_id_fkey
  foreign key (admin_id) references public.admins(id) on delete set null;

alter table public.audit_logs drop column if exists request_id;

drop index if exists public.sessions_admin_idx;
drop index if exists public.sessions_expiry_idx;
drop index if exists public.password_reset_tokens_admin_idx;
drop index if exists public.email_logs_status_idx;
drop index if exists public.audit_logs_actor_idx;

create index if not exists sessions_admin_id_idx on public.sessions(admin_id);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);
create index if not exists sessions_active_idx
  on public.sessions(admin_id, expires_at)
  where revoked_at is null;

with ranked_active_sessions as (
  select
    id,
    row_number() over (
      partition by admin_id
      order by created_at desc, id desc
    ) as active_rank
  from public.sessions
  where revoked_at is null
)
update public.sessions as sessions
set revoked_at = now()
from ranked_active_sessions
where sessions.id = ranked_active_sessions.id
  and ranked_active_sessions.active_rank > 1;

create unique index if not exists sessions_one_active_per_admin_uidx
  on public.sessions(admin_id)
  where revoked_at is null;

create index if not exists sessions_revoke_cleanup_idx
  on public.sessions(revoked_at, expires_at)
  where revoked_at is not null;

create index if not exists password_reset_tokens_admin_id_idx
  on public.password_reset_tokens(admin_id);
create index if not exists password_reset_tokens_expires_at_idx
  on public.password_reset_tokens(expires_at);
create index if not exists password_reset_tokens_active_admin_idx
  on public.password_reset_tokens(admin_id, expires_at desc)
  where used_at is null;

create index if not exists email_logs_status_created_idx
  on public.email_logs(status, created_at desc);
create index if not exists email_logs_application_idx
  on public.email_logs(application_id)
  where application_id is not null;
create index if not exists email_logs_contact_enquiry_idx
  on public.email_logs(contact_enquiry_id)
  where contact_enquiry_id is not null;
create index if not exists email_logs_provider_message_id_idx
  on public.email_logs(provider_message_id)
  where provider_message_id is not null;
create index if not exists email_logs_admin_password_reset_queue_idx
  on public.email_logs(recipient_email, created_at desc)
  where template_key = 'admin_password_reset' and status = 'queued';

create index if not exists audit_logs_admin_created_idx
  on public.audit_logs(admin_id, created_at desc)
  where admin_id is not null;
create index if not exists audit_logs_action_created_idx
  on public.audit_logs(action, created_at desc);
create index if not exists audit_logs_security_throttle_idx
  on public.audit_logs(action, ip_hash, created_at desc)
  where ip_hash is not null;
create index if not exists audit_logs_login_failed_ip_idx
  on public.audit_logs(ip_hash, created_at desc)
  where action = 'admin_login_failed';
create index if not exists audit_logs_reset_requested_ip_idx
  on public.audit_logs(ip_hash, created_at desc)
  where action = 'admin_password_reset_requested';

create or replace function public.verify_admin_password(
  p_admin_id uuid,
  p_password text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.id = p_admin_id
      and a.status = 'active'
      and a.password_hash is not null
      and extensions.crypt(
        encode(extensions.digest(p_password, 'sha256'), 'hex'),
        a.password_hash
      ) = a.password_hash
  );
$$;

create or replace function public.set_admin_password(
  p_admin_id uuid,
  p_password text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_password is null
     or char_length(p_password) < 12
     or char_length(p_password) > 256
     or p_password !~ '[A-Z]'
     or p_password !~ '[a-z]'
     or p_password !~ '[0-9]'
     or p_password !~ '[^A-Za-z0-9]' then
    raise exception 'password policy rejected' using errcode = '22023';
  end if;

  update public.admins
  set
    password_hash = extensions.crypt(
      encode(extensions.digest(p_password, 'sha256'), 'hex'),
      extensions.gen_salt('bf', 12)
    ),
    updated_at = now()
  where id = p_admin_id
    and status = 'active'
    and role = 'super_admin'
    and lower(email) = 'rcitcservices@gmail.com';

  return found;
end;
$$;

create or replace function public.create_admin_session(
  p_admin_id uuid,
  p_token_hash text,
  p_csrf_token_hash text,
  p_ip_hash text,
  p_user_agent text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$'
     or p_csrf_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid session hash' using errcode = '22023';
  end if;

  if p_expires_at <= now() or p_expires_at > now() + interval '8 hours 1 minute' then
    raise exception 'invalid session expiry' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.admins
    where id = p_admin_id
      and status = 'active'
      and role = 'super_admin'
      and lower(email) = 'rcitcservices@gmail.com'
  ) then
    raise exception 'administrator is not eligible' using errcode = '22023';
  end if;

  update public.sessions
  set revoked_at = coalesce(revoked_at, now())
  where admin_id = p_admin_id and revoked_at is null;

  insert into public.sessions (
    admin_id,
    token_hash,
    csrf_token_hash,
    ip_hash,
    user_agent,
    expires_at,
    last_seen_at
  )
  values (
    p_admin_id,
    p_token_hash,
    p_csrf_token_hash,
    p_ip_hash,
    left(p_user_agent, 500),
    p_expires_at,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.change_admin_password(
  p_admin_id uuid,
  p_current_password text,
  p_new_password text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_new_password is null
     or char_length(p_new_password) < 12
     or char_length(p_new_password) > 256
     or p_new_password !~ '[A-Z]'
     or p_new_password !~ '[a-z]'
     or p_new_password !~ '[0-9]'
     or p_new_password !~ '[^A-Za-z0-9]'
     or p_new_password = p_current_password then
    return false;
  end if;

  update public.admins
  set
    password_hash = extensions.crypt(
      encode(extensions.digest(p_new_password, 'sha256'), 'hex'),
      extensions.gen_salt('bf', 12)
    ),
    updated_at = now()
  where id = p_admin_id
    and status = 'active'
    and role = 'super_admin'
    and lower(email) = 'rcitcservices@gmail.com'
    and password_hash is not null
    and extensions.crypt(
      encode(extensions.digest(p_current_password, 'sha256'), 'hex'),
      password_hash
    ) = password_hash;

  if not found then
    return false;
  end if;

  update public.sessions
  set revoked_at = coalesce(revoked_at, now())
  where admin_id = p_admin_id and revoked_at is null;

  return true;
end;
$$;

create or replace function public.create_admin_password_reset_token(
  p_admin_id uuid,
  p_token_hash text,
  p_requested_ip_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid token hash' using errcode = '22023';
  end if;

  if p_expires_at <= now() or p_expires_at > now() + interval '30 minutes' then
    raise exception 'invalid token expiry' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.admins
    where id = p_admin_id
      and status = 'active'
      and role = 'super_admin'
      and lower(email) = 'rcitcservices@gmail.com'
  ) then
    raise exception 'administrator is not eligible' using errcode = '22023';
  end if;

  update public.password_reset_tokens
  set used_at = coalesce(used_at, now())
  where admin_id = p_admin_id and used_at is null;

  insert into public.password_reset_tokens (
    admin_id,
    token_hash,
    requested_ip_hash,
    expires_at
  )
  values (
    p_admin_id,
    p_token_hash,
    p_requested_ip_hash,
    p_expires_at
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.consume_admin_password_reset_token(
  p_token_hash text,
  p_new_password text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_token_id uuid;
  v_admin_id uuid;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$'
     or p_new_password is null
     or char_length(p_new_password) < 12
     or char_length(p_new_password) > 256
     or p_new_password !~ '[A-Z]'
     or p_new_password !~ '[a-z]'
     or p_new_password !~ '[0-9]'
     or p_new_password !~ '[^A-Za-z0-9]' then
    return false;
  end if;

  select id, admin_id
  into v_token_id, v_admin_id
  from public.password_reset_tokens
  where token_hash = p_token_hash
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    return false;
  end if;

  update public.admins
  set
    password_hash = extensions.crypt(
      encode(extensions.digest(p_new_password, 'sha256'), 'hex'),
      extensions.gen_salt('bf', 12)
    ),
    updated_at = now()
  where id = v_admin_id
    and status = 'active'
    and role = 'super_admin'
    and lower(email) = 'rcitcservices@gmail.com';

  if not found then
    return false;
  end if;

  update public.password_reset_tokens
  set used_at = coalesce(used_at, now())
  where admin_id = v_admin_id and used_at is null;

  update public.sessions
  set revoked_at = coalesce(revoked_at, now())
  where admin_id = v_admin_id and revoked_at is null;

  return true;
end;
$$;

revoke execute on function public.verify_admin_password(uuid, text) from public, anon, authenticated;
revoke execute on function public.set_admin_password(uuid, text) from public, anon, authenticated;
revoke execute on function public.create_admin_session(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.change_admin_password(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.create_admin_password_reset_token(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.consume_admin_password_reset_token(text, text) from public, anon, authenticated;
grant execute on function public.verify_admin_password(uuid, text) to service_role;
grant execute on function public.set_admin_password(uuid, text) to service_role;
grant execute on function public.create_admin_session(uuid, text, text, text, text, timestamptz) to service_role;
grant execute on function public.change_admin_password(uuid, text, text) to service_role;
grant execute on function public.create_admin_password_reset_token(uuid, text, text, timestamptz) to service_role;
grant execute on function public.consume_admin_password_reset_token(text, text) to service_role;

alter table public.admins enable row level security;
alter table public.sessions enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.email_logs enable row level security;
alter table public.audit_logs enable row level security;

alter table public.admins force row level security;
alter table public.sessions force row level security;
alter table public.password_reset_tokens force row level security;
alter table public.email_logs force row level security;
alter table public.audit_logs force row level security;

drop policy if exists deny_browser_access on public.admins;
create policy deny_browser_access on public.admins
  for all to anon, authenticated using (false) with check (false);

drop policy if exists deny_browser_access on public.sessions;
create policy deny_browser_access on public.sessions
  for all to anon, authenticated using (false) with check (false);

drop policy if exists deny_browser_access on public.password_reset_tokens;
create policy deny_browser_access on public.password_reset_tokens
  for all to anon, authenticated using (false) with check (false);

drop policy if exists deny_browser_access on public.email_logs;
create policy deny_browser_access on public.email_logs
  for all to anon, authenticated using (false) with check (false);

drop policy if exists deny_browser_access on public.audit_logs;
create policy deny_browser_access on public.audit_logs
  for all to anon, authenticated using (false) with check (false);

revoke all on table
  public.admins,
  public.sessions,
  public.password_reset_tokens,
  public.email_logs,
  public.audit_logs
from anon, authenticated;

grant select, insert, update, delete on table
  public.admins,
  public.sessions,
  public.password_reset_tokens,
  public.email_logs,
  public.audit_logs
to service_role;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

comment on function public.verify_admin_password(uuid, text) is
  'Phase 9 service-role-only bcrypt verification with SHA-256 prehashing.';
comment on function public.set_admin_password(uuid, text) is
  'Phase 9 service-role-only password update boundary. Plaintext is never persisted.';
comment on function public.create_admin_session(uuid, text, text, text, text, timestamptz) is
  'Phase 9 atomic single-session replacement using hashes only.';
comment on function public.change_admin_password(uuid, text, text) is
  'Phase 9 atomic current-password verification, replacement and session revocation.';
comment on function public.create_admin_password_reset_token(uuid, text, text, timestamptz) is
  'Phase 9 service-role-only creation of short-lived, single-use reset-token hashes.';
comment on function public.consume_admin_password_reset_token(text, text) is
  'Phase 9 atomic single-use reset-token consumption, password replacement and session revocation.';

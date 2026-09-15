-- Phase 16.5 convergence: enforce password/reset invariants at the database boundary.
-- Forward-only migration over the already-applied authentication-hardening migration.

-- Historical production rows were verified before this migration:
-- no malformed requested_ip_hash values and no reset lifetime over 30 minutes.
alter table public.password_reset_tokens
  drop constraint if exists password_reset_tokens_requested_ip_hash_shape_check;
alter table public.password_reset_tokens
  add constraint password_reset_tokens_requested_ip_hash_shape_check
  check (
    requested_ip_hash is null
    or requested_ip_hash ~ '^[0-9a-f]{64}$'
  );

alter table public.password_reset_tokens
  drop constraint if exists password_reset_tokens_max_lifetime_check;
alter table public.password_reset_tokens
  add constraint password_reset_tokens_max_lifetime_check
  check (expires_at <= created_at + interval '30 minutes');

-- A reset issuance transaction first consumes earlier unused tokens. This unique
-- partial index makes that rule concurrency-safe: at most one unused token can
-- exist for an administrator even if issuance requests race.
create unique index if not exists password_reset_tokens_one_unused_per_admin_uidx
  on public.password_reset_tokens(admin_id)
  where used_at is null;

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
  if p_current_password is null
     or char_length(p_current_password) < 1
     or char_length(p_current_password) > 256
     or p_new_password is null
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

revoke execute on function public.change_admin_password(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.change_admin_password(uuid, text, text)
  to service_role;

comment on index public.password_reset_tokens_one_unused_per_admin_uidx is
  'Phase 16.5 concurrency guard: an administrator can have at most one unused reset token.';
comment on function public.change_admin_password(uuid, text, text) is
  'Approved active super-admin password change; current/new inputs are bounded, current password is verified using SHA-256 prehash plus bcrypt cost 12, and successful change revokes active sessions.';

notify pgrst, 'reload schema';

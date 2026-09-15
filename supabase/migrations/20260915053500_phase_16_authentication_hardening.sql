-- Phase 16.5: authentication hardening convergence.
-- Tighten one-time bootstrap, password verification and reset-token issuance at the DB authority boundary.

create or replace function public.set_admin_password(p_admin_id uuid, p_password text)
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
  set password_hash = extensions.crypt(
        encode(extensions.digest(p_password, 'sha256'), 'hex'),
        extensions.gen_salt('bf', 12)
      ),
      updated_at = now()
  where id = p_admin_id
    and status = 'active'
    and role = 'super_admin'
    and lower(email) = 'rcitcservices@gmail.com'
    and password_hash is null;

  return found;
end;
$$;

create or replace function public.verify_admin_password(p_admin_id uuid, p_password text)
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
      and a.role = 'super_admin'
      and lower(a.email) = 'rcitcservices@gmail.com'
      and a.password_hash is not null
      and p_password is not null
      and char_length(p_password) between 1 and 256
      and extensions.crypt(
        encode(extensions.digest(p_password, 'sha256'), 'hex'),
        a.password_hash
      ) = a.password_hash
  );
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

  if p_requested_ip_hash is not null and p_requested_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid requested ip hash' using errcode = '22023';
  end if;

  if p_expires_at <= now() or p_expires_at > now() + interval '30 minutes' then
    raise exception 'invalid token expiry' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.admins a
    where a.id = p_admin_id
      and a.status = 'active'
      and a.role = 'super_admin'
      and lower(a.email) = 'rcitcservices@gmail.com'
  ) then
    raise exception 'administrator is not eligible' using errcode = '22023';
  end if;

  update public.password_reset_tokens
  set used_at = coalesce(used_at, now())
  where admin_id = p_admin_id and used_at is null;

  insert into public.password_reset_tokens(admin_id, token_hash, requested_ip_hash, expires_at)
  values (p_admin_id, p_token_hash, p_requested_ip_hash, p_expires_at)
  returning id into v_id;

  return v_id;
end;
$$;

-- These Phase-9 compatibility helpers use an obsolete raw-password bcrypt contract
-- and are not referenced by the current admin runtime. Retain them only for owner-level
-- migration archaeology; remove service/API execution authority so they cannot become
-- an alternate authentication path.
revoke execute on function public.rcitcs_verify_admin_password(text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.rcitcs_change_admin_password(uuid, text, text)
  from public, anon, authenticated, service_role;

revoke execute on function public.set_admin_password(uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_admin_password(uuid, text) to service_role;

revoke execute on function public.verify_admin_password(uuid, text)
  from public, anon, authenticated;
grant execute on function public.verify_admin_password(uuid, text) to service_role;

revoke execute on function public.create_admin_password_reset_token(uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.create_admin_password_reset_token(uuid, text, text, timestamptz) to service_role;

comment on function public.set_admin_password(uuid, text) is
  'One-time bootstrap only: approved active super_admin, null existing password hash, current 12-character strong-password policy.';
comment on function public.verify_admin_password(uuid, text) is
  'Approved active RC IT Services super-admin password verification using SHA-256 prehash plus bcrypt cost 12 storage contract.';
comment on function public.create_admin_password_reset_token(uuid, text, text, timestamptz) is
  'Creates a single-use, max-30-minute hashed reset token only for the approved active super administrator.';

notify pgrst, 'reload schema';

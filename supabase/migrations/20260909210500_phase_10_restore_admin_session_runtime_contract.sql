-- Phase 10 runtime repair: restore Phase 9 authentication RPCs required by the live admin portal.
-- Forward-only repair for production schema drift. No credential values are stored here.

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

revoke execute on function public.create_admin_session(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.change_admin_password(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_admin_session(uuid, text, text, text, text, timestamptz) to service_role;
grant execute on function public.change_admin_password(uuid, text, text) to service_role;

comment on function public.create_admin_session(uuid, text, text, text, text, timestamptz) is
  'Phase 10 runtime repair: Phase 9 atomic single-session replacement using hashes only.';
comment on function public.change_admin_password(uuid, text, text) is
  'Phase 10 runtime repair: Phase 9 atomic current-password verification, replacement and session revocation.';

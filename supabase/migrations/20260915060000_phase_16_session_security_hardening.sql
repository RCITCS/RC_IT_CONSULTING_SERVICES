-- Phase 16.6: session lifecycle hardening.
-- Keep the existing custom admin-session model while enforcing its invariants at the DB boundary.

alter table public.sessions alter column last_seen_at set not null;

alter table public.sessions drop constraint if exists sessions_ip_hash_shape_check;
alter table public.sessions
  add constraint sessions_ip_hash_shape_check
  check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$');

alter table public.sessions drop constraint if exists sessions_user_agent_length_check;
alter table public.sessions
  add constraint sessions_user_agent_length_check
  check (user_agent is null or char_length(user_agent) <= 500);

alter table public.sessions drop constraint if exists sessions_absolute_lifetime_check;
alter table public.sessions
  add constraint sessions_absolute_lifetime_check
  check (expires_at <= created_at + interval '8 hours');

alter table public.sessions drop constraint if exists sessions_last_seen_window_check;
alter table public.sessions
  add constraint sessions_last_seen_window_check
  check (last_seen_at >= created_at and last_seen_at <= expires_at);

alter table public.sessions drop constraint if exists sessions_revocation_time_check;
alter table public.sessions
  add constraint sessions_revocation_time_check
  check (revoked_at is null or revoked_at >= created_at);

create unique index if not exists sessions_one_active_per_admin_uidx
  on public.sessions(admin_id)
  where revoked_at is null;

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
  if p_token_hash is null
     or p_token_hash !~ '^[0-9a-f]{64}$'
     or p_csrf_token_hash is null
     or p_csrf_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid session hash' using errcode = '22023';
  end if;

  if p_ip_hash is not null and p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid session network hash' using errcode = '22023';
  end if;

  if p_user_agent is not null and char_length(p_user_agent) > 500 then
    raise exception 'invalid session user agent' using errcode = '22023';
  end if;

  if p_expires_at is null
     or p_expires_at <= now()
     or p_expires_at > now() + interval '8 hours' then
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
  ) values (
    p_admin_id,
    p_token_hash,
    p_csrf_token_hash,
    p_ip_hash,
    p_user_agent,
    p_expires_at,
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.get_admin_session_context(
  p_token_hash text,
  p_idle_cutoff timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_admin_id uuid;
  v_csrf_token_hash text;
  v_expires_at timestamptz;
  v_last_seen_at timestamptz;
  v_email text;
  v_role text;
  v_full_name text;
  v_idle_cutoff timestamptz;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;

  -- The caller may provide a fresher cutoff, but can never extend the server's
  -- authoritative 30-minute idle window by supplying an older timestamp.
  v_idle_cutoff := greatest(
    coalesce(p_idle_cutoff, now() - interval '30 minutes'),
    now() - interval '30 minutes'
  );

  select
    s.id,
    s.admin_id,
    s.csrf_token_hash,
    s.expires_at,
    s.last_seen_at,
    a.email,
    a.role,
    a.full_name
  into
    v_session_id,
    v_admin_id,
    v_csrf_token_hash,
    v_expires_at,
    v_last_seen_at,
    v_email,
    v_role,
    v_full_name
  from public.sessions s
  join public.admins a on a.id = s.admin_id
  where s.token_hash = p_token_hash
    and s.revoked_at is null
    and s.expires_at > now()
    and s.last_seen_at > v_idle_cutoff
    and a.status = 'active'
    and a.role = 'super_admin'
    and lower(a.email) = 'rcitcservices@gmail.com'
  limit 1;

  if v_session_id is null then
    return null;
  end if;

  if v_last_seen_at < now() - interval '5 minutes' then
    update public.sessions
    set last_seen_at = now()
    where id = v_session_id
      and revoked_at is null
      and expires_at > now()
      and last_seen_at > v_idle_cutoff
    returning last_seen_at into v_last_seen_at;

    if not found then
      return null;
    end if;
  end if;

  return jsonb_build_object(
    'id', v_session_id,
    'admin_id', v_admin_id,
    'csrf_token_hash', v_csrf_token_hash,
    'expires_at', v_expires_at,
    'last_seen_at', v_last_seen_at,
    'admin', jsonb_build_object(
      'id', v_admin_id,
      'email', v_email,
      'role', v_role,
      'full_name', v_full_name
    )
  );
end;
$$;

revoke execute on function public.create_admin_session(uuid, text, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.create_admin_session(uuid, text, text, text, text, timestamptz)
  to service_role;

revoke execute on function public.get_admin_session_context(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_admin_session_context(text, timestamptz)
  to service_role;

comment on index public.sessions_one_active_per_admin_uidx is
  'Phase 16.6 concurrency/fixation guard: at most one unrevoked administrator session may exist per admin.';
comment on function public.create_admin_session(uuid, text, text, text, text, timestamptz) is
  'Creates an approved administrator session with hashed token/CSRF material, bounded context, <=8h absolute lifetime, and prior-session revocation.';
comment on function public.get_admin_session_context(text, timestamptz) is
  'Validates approved administrator session server-side with absolute expiry and an authoritative <=30-minute idle window; activity refresh never extends absolute expiry.';

notify pgrst, 'reload schema';

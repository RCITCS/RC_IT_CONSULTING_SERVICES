-- Phase 10 — authenticated admin navigation fast path.
-- Collapses session validation, active super-admin authority and heartbeat refresh
-- into one service-role-only database round trip for private admin GET navigation.

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
begin
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
    and s.last_seen_at > p_idle_cutoff
    and a.status = 'active'
    and a.role = 'super_admin'
  limit 1;

  if v_session_id is null then
    return null;
  end if;

  if v_last_seen_at < now() - interval '5 minutes' then
    update public.sessions
    set last_seen_at = now()
    where id = v_session_id
      and revoked_at is null;
    v_last_seen_at := now();
  end if;

  return jsonb_build_object(
    'id', v_session_id,
    'admin_id', v_admin_id,
    'csrf_token_hash', v_csrf_token_hash,
    'expires_at', v_expires_at,
    'last_seen_at', v_last_seen_at,
    'admin', jsonb_build_object(
      'email', v_email,
      'role', v_role,
      'full_name', v_full_name
    )
  );
end;
$$;

revoke all on function public.get_admin_session_context(text, timestamptz) from public, anon, authenticated;
grant execute on function public.get_admin_session_context(text, timestamptz) to service_role;

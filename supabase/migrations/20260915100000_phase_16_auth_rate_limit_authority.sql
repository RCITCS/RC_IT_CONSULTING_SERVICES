-- Phase 16.8: database-atomic authentication abuse resistance.
-- Adds fixed-window per-network and global buckets so forged network metadata cannot
-- turn the existing IP-only throttle into an unbounded authentication/reset path.

create table if not exists public.admin_auth_rate_limits (
  scope text not null,
  bucket_key text not null,
  attempts integer not null,
  window_started_at timestamptz not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (scope, bucket_key),
  constraint admin_auth_rate_limits_scope_check
    check (scope in ('login_ip', 'login_global', 'reset_ip', 'reset_global')),
  constraint admin_auth_rate_limits_bucket_check
    check (
      (scope in ('login_ip', 'reset_ip') and bucket_key ~ '^[0-9a-f]{64}$')
      or
      (scope in ('login_global', 'reset_global') and bucket_key = 'global')
    ),
  constraint admin_auth_rate_limits_attempts_check check (attempts >= 1),
  constraint admin_auth_rate_limits_window_check check (expires_at > window_started_at)
);

alter table public.admin_auth_rate_limits enable row level security;
alter table public.admin_auth_rate_limits force row level security;

revoke all on table public.admin_auth_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_auth_rate_limits to service_role;

create index if not exists admin_auth_rate_limits_expiry_idx
  on public.admin_auth_rate_limits (expires_at);

create or replace function public.consume_admin_auth_rate_limit(
  p_scope text,
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_attempts integer;
  v_expires_at timestamptz;
  v_retry_after integer;
begin
  if p_scope not in ('login_ip', 'login_global', 'reset_ip', 'reset_global') then
    raise exception 'invalid rate-limit scope' using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'invalid rate-limit threshold' using errcode = '22023';
  end if;

  if p_window_seconds is null or p_window_seconds < 60 or p_window_seconds > 3600 then
    raise exception 'invalid rate-limit window' using errcode = '22023';
  end if;

  if p_scope in ('login_ip', 'reset_ip') then
    if p_bucket_key is null or p_bucket_key !~ '^[0-9a-f]{64}$' then
      raise exception 'invalid network bucket' using errcode = '22023';
    end if;
  elsif p_bucket_key <> 'global' then
    raise exception 'invalid global bucket' using errcode = '22023';
  end if;

  insert into public.admin_auth_rate_limits (
    scope,
    bucket_key,
    attempts,
    window_started_at,
    expires_at,
    updated_at
  )
  values (
    p_scope,
    p_bucket_key,
    1,
    v_now,
    v_now + make_interval(secs => p_window_seconds),
    v_now
  )
  on conflict (scope, bucket_key) do update
  set attempts = case
        when public.admin_auth_rate_limits.expires_at <= v_now then 1
        else public.admin_auth_rate_limits.attempts + 1
      end,
      window_started_at = case
        when public.admin_auth_rate_limits.expires_at <= v_now then v_now
        else public.admin_auth_rate_limits.window_started_at
      end,
      expires_at = case
        when public.admin_auth_rate_limits.expires_at <= v_now
          then v_now + make_interval(secs => p_window_seconds)
        else public.admin_auth_rate_limits.expires_at
      end,
      updated_at = v_now
  returning attempts, expires_at
    into v_attempts, v_expires_at;

  v_retry_after := greatest(1, ceil(extract(epoch from (v_expires_at - v_now)))::integer);

  -- Opportunistic bounded cleanup. The current bucket remains protected by its PK.
  delete from public.admin_auth_rate_limits
  where expires_at < v_now - interval '1 day';

  return jsonb_build_object(
    'allowed', v_attempts <= p_limit,
    'attempts', v_attempts,
    'remaining', greatest(p_limit - v_attempts, 0),
    'retry_after', case when v_attempts <= p_limit then 0 else v_retry_after end,
    'just_limited', v_attempts = p_limit + 1,
    'expires_at', v_expires_at
  );
end;
$$;

revoke all on function public.consume_admin_auth_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_admin_auth_rate_limit(text, text, integer, integer)
  to service_role;

comment on table public.admin_auth_rate_limits is
  'Phase 16.8 fixed-window authentication/reset rate-limit buckets. Server/service authority only.';
comment on function public.consume_admin_auth_rate_limit(text, text, integer, integer) is
  'Atomically consumes a bounded per-network or global authentication/reset rate-limit bucket.';

notify pgrst, 'reload schema';

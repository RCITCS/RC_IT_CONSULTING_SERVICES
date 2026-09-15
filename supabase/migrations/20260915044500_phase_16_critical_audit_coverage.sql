-- Phase 16.2: critical audit coverage.
-- Adds database-authoritative session lifecycle events and bounded throttle activation events.
-- Existing domain RPC audit writes remain transactional with their business mutations.

create or replace function public.audit_admin_session_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_audit_event(
      new.admin_id,
      'admin_session_created',
      'admin_session',
      new.id,
      'success',
      null,
      new.id,
      new.ip_hash,
      left(new.user_agent, 500),
      null,
      jsonb_build_object(
        'expires_at', new.expires_at
      ),
      jsonb_build_object(
        'source', 'phase_16_session_lifecycle'
      )
    );
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.revoked_at is null
     and new.revoked_at is not null then
    perform public.append_audit_event(
      new.admin_id,
      'admin_session_revoked',
      'admin_session',
      new.id,
      'success',
      null,
      new.id,
      new.ip_hash,
      left(new.user_agent, 500),
      jsonb_build_object('revoked', false),
      jsonb_build_object('revoked', true),
      jsonb_build_object(
        'source', 'phase_16_session_lifecycle'
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists sessions_audit_lifecycle on public.sessions;
create trigger sessions_audit_lifecycle
after insert or update of revoked_at on public.sessions
for each row
execute function public.audit_admin_session_lifecycle();

create or replace function public.audit_auth_throttle_activation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_attempts integer;
begin
  if new.ip_hash is null then
    return new;
  end if;

  if new.action = 'admin_login_failed' then
    select count(*)::integer
      into v_attempts
    from public.audit_logs a
    where a.action = 'admin_login_failed'
      and a.ip_hash = new.ip_hash
      and a.created_at >= new.created_at - interval '15 minutes';

    if v_attempts >= 5
       and not exists (
         select 1
         from public.audit_logs a
         where a.action = 'admin_login_throttle_activated'
           and a.ip_hash = new.ip_hash
           and a.created_at >= new.created_at - interval '15 minutes'
       ) then
      perform public.append_audit_event(
        null,
        'admin_login_throttle_activated',
        'authentication',
        null,
        'denied',
        new.request_id,
        null,
        new.ip_hash,
        left(new.user_agent, 500),
        null,
        null,
        jsonb_build_object(
          'source', 'phase_16_auth_throttle',
          'threshold', 5,
          'window_seconds', 900
        )
      );
    end if;

  elsif new.action = 'admin_password_reset_requested' then
    select count(*)::integer
      into v_attempts
    from public.audit_logs a
    where a.action = 'admin_password_reset_requested'
      and a.ip_hash = new.ip_hash
      and a.created_at >= new.created_at - interval '1 hour';

    if v_attempts >= 3
       and not exists (
         select 1
         from public.audit_logs a
         where a.action = 'admin_password_reset_throttle_activated'
           and a.ip_hash = new.ip_hash
           and a.created_at >= new.created_at - interval '1 hour'
       ) then
      perform public.append_audit_event(
        null,
        'admin_password_reset_throttle_activated',
        'authentication',
        null,
        'denied',
        new.request_id,
        null,
        new.ip_hash,
        left(new.user_agent, 500),
        null,
        null,
        jsonb_build_object(
          'source', 'phase_16_auth_throttle',
          'threshold', 3,
          'window_seconds', 3600
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists audit_logs_auth_throttle_activation on public.audit_logs;
create trigger audit_logs_auth_throttle_activation
after insert on public.audit_logs
for each row
when (new.action in ('admin_login_failed', 'admin_password_reset_requested'))
execute function public.audit_auth_throttle_activation();

revoke execute on function public.audit_admin_session_lifecycle()
  from public, anon, authenticated;
grant execute on function public.audit_admin_session_lifecycle()
  to service_role;

revoke execute on function public.audit_auth_throttle_activation()
  from public, anon, authenticated;
grant execute on function public.audit_auth_throttle_activation()
  to service_role;

comment on function public.audit_admin_session_lifecycle() is
  'Phase 16.2 transaction-bound session creation/revocation audit coverage.';
comment on function public.audit_auth_throttle_activation() is
  'Phase 16.2 records one bounded throttle-activation event when authentication/reset thresholds are reached.';

notify pgrst, 'reload schema';

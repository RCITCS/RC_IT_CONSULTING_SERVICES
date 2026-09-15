-- Phase 16.1: authoritative audit event architecture.
-- Forward-only convergence over the Phase 9 audit_logs contract.
-- This module defines the event model and canonical append path.
-- Tamper-resistance privilege revocation is intentionally completed in Phase 16.3.

alter table public.audit_logs
  add column if not exists request_id uuid,
  add column if not exists session_id uuid,
  add column if not exists outcome text,
  add column if not exists event_version smallint;

update public.audit_logs
set
  outcome = case
    when action = 'admin_login_failed' then 'failure'
    else 'success'
  end
where outcome is null;

update public.audit_logs
set event_version = 1
where event_version is null;

alter table public.audit_logs
  alter column outcome set default 'success',
  alter column outcome set not null,
  alter column event_version set default 1,
  alter column event_version set not null;

alter table public.audit_logs drop constraint if exists audit_logs_session_id_fkey;
alter table public.audit_logs
  add constraint audit_logs_session_id_fkey
  foreign key (session_id) references public.sessions(id) on delete set null;

alter table public.audit_logs drop constraint if exists audit_logs_action_shape_check;
alter table public.audit_logs
  add constraint audit_logs_action_shape_check
  check (
    char_length(action) between 1 and 128
    and action ~ '^[a-z0-9][a-z0-9._-]*$'
  );

alter table public.audit_logs drop constraint if exists audit_logs_entity_type_shape_check;
alter table public.audit_logs
  add constraint audit_logs_entity_type_shape_check
  check (
    char_length(entity_type) between 1 and 64
    and entity_type ~ '^[a-z0-9][a-z0-9._-]*$'
  );

alter table public.audit_logs drop constraint if exists audit_logs_outcome_check;
alter table public.audit_logs
  add constraint audit_logs_outcome_check
  check (outcome in ('success', 'failure', 'denied'));

alter table public.audit_logs drop constraint if exists audit_logs_event_version_check;
alter table public.audit_logs
  add constraint audit_logs_event_version_check
  check (event_version = 1);

alter table public.audit_logs drop constraint if exists audit_logs_ip_hash_shape_check;
alter table public.audit_logs
  add constraint audit_logs_ip_hash_shape_check
  check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$');

alter table public.audit_logs drop constraint if exists audit_logs_user_agent_length_check;
alter table public.audit_logs
  add constraint audit_logs_user_agent_length_check
  check (user_agent is null or char_length(user_agent) <= 500);

alter table public.audit_logs drop constraint if exists audit_logs_before_object_check;
alter table public.audit_logs
  add constraint audit_logs_before_object_check
  check (before_data is null or jsonb_typeof(before_data) = 'object');

alter table public.audit_logs drop constraint if exists audit_logs_after_object_check;
alter table public.audit_logs
  add constraint audit_logs_after_object_check
  check (after_data is null or jsonb_typeof(after_data) = 'object');

alter table public.audit_logs drop constraint if exists audit_logs_metadata_object_check;
alter table public.audit_logs
  add constraint audit_logs_metadata_object_check
  check (jsonb_typeof(metadata) = 'object');

alter table public.audit_logs drop constraint if exists audit_logs_before_size_check;
alter table public.audit_logs
  add constraint audit_logs_before_size_check
  check (before_data is null or octet_length(before_data::text) <= 65536);

alter table public.audit_logs drop constraint if exists audit_logs_after_size_check;
alter table public.audit_logs
  add constraint audit_logs_after_size_check
  check (after_data is null or octet_length(after_data::text) <= 65536);

alter table public.audit_logs drop constraint if exists audit_logs_metadata_size_check;
alter table public.audit_logs
  add constraint audit_logs_metadata_size_check
  check (octet_length(metadata::text) <= 16384);

create index if not exists audit_logs_request_created_idx
  on public.audit_logs(request_id, created_at desc)
  where request_id is not null;

create index if not exists audit_logs_session_created_idx
  on public.audit_logs(session_id, created_at desc)
  where session_id is not null;

create or replace function public.audit_json_has_sensitive_keys(p_value jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  with recursive walk(key_name, value) as (
    select null::text, coalesce(p_value, 'null'::jsonb)
    union all
    select child.key_name, child.value
    from walk as parent
    cross join lateral (
      select e.key as key_name, e.value
      from jsonb_each(
        case when jsonb_typeof(parent.value) = 'object'
          then parent.value
          else '{}'::jsonb
        end
      ) as e
      union all
      select null::text as key_name, a.value
      from jsonb_array_elements(
        case when jsonb_typeof(parent.value) = 'array'
          then parent.value
          else '[]'::jsonb
        end
      ) as a
    ) as child
  )
  select exists (
    select 1
    from walk
    where key_name is not null
      and lower(key_name) ~ '(^|_)(password|password_hash|token|token_hash|csrf|csrf_token_hash|authorization|cookie|api_key|service_role|secret|document_content|resume_content|cover_letter_content|message_body|email_body)($|_)'
  );
$$;

create or replace function public.append_audit_event(
  p_admin_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_outcome text default 'success',
  p_request_id uuid default null,
  p_session_id uuid default null,
  p_ip_hash text default null,
  p_user_agent text default null,
  p_before_data jsonb default null,
  p_after_data jsonb default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_action is null
     or char_length(p_action) not between 1 and 128
     or p_action !~ '^[a-z0-9][a-z0-9._-]*$' then
    raise exception 'invalid audit action' using errcode = '22023';
  end if;

  if p_entity_type is null
     or char_length(p_entity_type) not between 1 and 64
     or p_entity_type !~ '^[a-z0-9][a-z0-9._-]*$' then
    raise exception 'invalid audit entity type' using errcode = '22023';
  end if;

  if p_outcome not in ('success', 'failure', 'denied') then
    raise exception 'invalid audit outcome' using errcode = '22023';
  end if;

  if p_ip_hash is not null and p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid audit ip hash' using errcode = '22023';
  end if;

  if p_user_agent is not null and char_length(p_user_agent) > 500 then
    raise exception 'audit user agent too long' using errcode = '22023';
  end if;

  if p_before_data is not null and jsonb_typeof(p_before_data) <> 'object' then
    raise exception 'audit before_data must be an object' using errcode = '22023';
  end if;

  if p_after_data is not null and jsonb_typeof(p_after_data) <> 'object' then
    raise exception 'audit after_data must be an object' using errcode = '22023';
  end if;

  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'audit metadata must be an object' using errcode = '22023';
  end if;

  if octet_length(coalesce(p_before_data, '{}'::jsonb)::text) > 65536
     or octet_length(coalesce(p_after_data, '{}'::jsonb)::text) > 65536
     or octet_length(p_metadata::text) > 16384 then
    raise exception 'audit payload too large' using errcode = '22023';
  end if;

  if public.audit_json_has_sensitive_keys(p_before_data)
     or public.audit_json_has_sensitive_keys(p_after_data)
     or public.audit_json_has_sensitive_keys(p_metadata) then
    raise exception 'sensitive audit payload key rejected' using errcode = '22023';
  end if;

  if p_session_id is not null and (
    p_admin_id is null
    or not exists (
      select 1
      from public.sessions s
      where s.id = p_session_id
        and s.admin_id = p_admin_id
    )
  ) then
    raise exception 'audit session does not belong to administrator' using errcode = '22023';
  end if;

  insert into public.audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    request_id,
    session_id,
    outcome,
    event_version,
    ip_hash,
    user_agent,
    before_data,
    after_data,
    metadata
  )
  values (
    p_admin_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_request_id,
    p_session_id,
    p_outcome,
    1,
    p_ip_hash,
    left(p_user_agent, 500),
    p_before_data,
    p_after_data,
    p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.audit_json_has_sensitive_keys(jsonb)
  from public, anon, authenticated;
grant execute on function public.audit_json_has_sensitive_keys(jsonb)
  to service_role;

revoke execute on function public.append_audit_event(
  uuid, text, text, uuid, text, uuid, uuid, text, text, jsonb, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.append_audit_event(
  uuid, text, text, uuid, text, uuid, uuid, text, text, jsonb, jsonb, jsonb
) to service_role;

comment on table public.audit_logs is
  'Append-oriented security and administrative audit event ledger. Phase 16 defines event_version=1. Business data remains authoritative in its domain tables.';

comment on column public.audit_logs.request_id is
  'Server-generated correlation UUID for one inbound request or controlled operation when available.';
comment on column public.audit_logs.session_id is
  'Optional authenticated administrator session that originated the event.';
comment on column public.audit_logs.outcome is
  'Outcome of the audited operation: success, failure, or denied.';
comment on column public.audit_logs.before_data is
  'Redacted, minimal pre-change state only; never credentials, tokens, message/document contents, or unnecessary PII.';
comment on column public.audit_logs.after_data is
  'Redacted, minimal post-change state only; never credentials, tokens, message/document contents, or unnecessary PII.';
comment on column public.audit_logs.metadata is
  'Bounded non-authoritative context. Never store credentials, tokens, message/document contents, or unnecessary PII here.';

notify pgrst, 'reload schema';

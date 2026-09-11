-- Phase 12 hardening: enforce the source-authoritative cover-letter/message rule
-- at the persistence boundary and provide retry-safe cleanup ownership for expired
-- private upload sessions. Forward-only; no Phase 13 email delivery is introduced.

alter table public.application_intake_sessions
  add column if not exists cleanup_claimed_at timestamptz,
  add column if not exists cleanup_completed_at timestamptz;

alter table public.application_intake_sessions
  drop constraint if exists application_intake_sessions_cleanup_state_check;
alter table public.application_intake_sessions
  add constraint application_intake_sessions_cleanup_state_check
  check (cleanup_completed_at is null or cancelled_at is not null);

create index if not exists application_intake_sessions_cleanup_idx
  on public.application_intake_sessions(expires_at, cleanup_claimed_at)
  where consumed_at is null and cleanup_completed_at is null;

-- Existing persisted records must already satisfy the Phase 12 rule. Never invent
-- missing candidate content during migration.
do $$
begin
  if exists (
    select 1
    from public.applications a
    where nullif(btrim(a.cover_letter_text), '') is null
      and not exists (
        select 1
        from public.application_documents d
        where d.application_id = a.id
          and d.kind = 'cover_letter'
      )
  ) then
    raise exception 'Phase 12 requires every application to retain a cover-letter message or private cover-letter document.';
  end if;
end
$$;

create or replace function public.enforce_candidate_application_cover_letter()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if nullif(btrim(new.cover_letter_text), '') is null
     and not exists (
       select 1
       from public.application_documents d
       where d.application_id = new.id
         and d.kind = 'cover_letter'
     ) then
    raise exception using
      errcode = '23514',
      message = 'Candidate application requires a cover-letter message or document.';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_candidate_document_cover_letter()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_application_id uuid := coalesce(new.application_id, old.application_id);
  v_cover_letter_text text;
begin
  select a.cover_letter_text
  into v_cover_letter_text
  from public.applications a
  where a.id = v_application_id;

  if found
     and nullif(btrim(v_cover_letter_text), '') is null
     and not exists (
       select 1
       from public.application_documents d
       where d.application_id = v_application_id
         and d.kind = 'cover_letter'
     ) then
    raise exception using
      errcode = '23514',
      message = 'Candidate application requires a cover-letter message or document.';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists applications_require_cover_letter on public.applications;
create constraint trigger applications_require_cover_letter
after insert or update of cover_letter_text on public.applications
deferrable initially deferred
for each row execute function public.enforce_candidate_application_cover_letter();

drop trigger if exists application_documents_preserve_cover_letter on public.application_documents;
create constraint trigger application_documents_preserve_cover_letter
after insert or update or delete on public.application_documents
deferrable initially deferred
for each row execute function public.enforce_candidate_document_cover_letter();

revoke all on function public.enforce_candidate_application_cover_letter() from public, anon, authenticated;
revoke all on function public.enforce_candidate_document_cover_letter() from public, anon, authenticated;

-- Claim a bounded batch of expired sessions. A failed cleanup may be reclaimed after
-- ten minutes, preventing a crashed worker from permanently orphaning private objects.
create or replace function public.claim_expired_candidate_intakes(
  p_limit integer default 10
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 10), 50));
  v_claims jsonb;
begin
  with candidates as (
    select s.id
    from public.application_intake_sessions s
    where s.consumed_at is null
      and s.cleanup_completed_at is null
      and s.expires_at <= now()
      and (s.cleanup_claimed_at is null or s.cleanup_claimed_at <= now() - interval '10 minutes')
    order by s.expires_at, s.id
    limit v_limit
    for update skip locked
  ), claimed as (
    update public.application_intake_sessions s
    set cleanup_claimed_at = now(), updated_at = now()
    from candidates c
    where s.id = c.id
    returning s.id, s.token_hash, s.document_manifest, s.expires_at
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'intake_id', c.id,
        'token_hash', c.token_hash,
        'documents', c.document_manifest,
        'expired_at', c.expires_at
      )
      order by c.expires_at, c.id
    ),
    '[]'::jsonb
  )
  into v_claims
  from claimed c;

  return jsonb_build_object('ok', true, 'claims', v_claims);
end;
$$;

create or replace function public.complete_expired_candidate_intake_cleanup(
  p_intake_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.application_intake_sessions%rowtype;
begin
  if p_intake_id is null or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CLEANUP');
  end if;

  update public.application_intake_sessions s
  set
    cancelled_at = coalesce(s.cancelled_at, now()),
    cleanup_completed_at = coalesce(s.cleanup_completed_at, now()),
    updated_at = now()
  where s.id = p_intake_id
    and s.token_hash = p_token_hash
    and s.consumed_at is null
    and s.expires_at <= now()
  returning s.* into v_session;

  if v_session.id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CLEANUP');
  end if;

  return jsonb_build_object('ok', true, 'intake_id', v_session.id, 'completed_at', v_session.cleanup_completed_at);
end;
$$;

revoke all on function public.claim_expired_candidate_intakes(integer) from public, anon, authenticated;
revoke all on function public.complete_expired_candidate_intake_cleanup(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_expired_candidate_intakes(integer) to service_role;
grant execute on function public.complete_expired_candidate_intake_cleanup(uuid,text) to service_role;

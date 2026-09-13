-- Phase 13.4 — atomically queue candidate application notifications.
-- Persistence stays authoritative: this trigger only runs after a successful application insert.
-- It never calls an external email provider and therefore cannot make an accepted application depend on Resend availability.

create or replace function public.queue_candidate_application_emails()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.enqueue_transactional_email(
    'rcitcs/application_acknowledgement/application/' || lower(new.public_reference),
    'application_acknowledgement',
    new.email,
    'career@rcitcs.com',
    'career@rcitcs.com',
    null,
    new.id,
    null,
    jsonb_build_object(
      'event', 'candidate_application_persisted',
      'application_reference', new.public_reference,
      'job_code', new.job_code
    )
  );

  perform public.enqueue_transactional_email(
    'rcitcs/internal_application_alert/application/' || lower(new.id::text),
    'internal_application_alert',
    'career@rcitcs.com',
    'noreply@rcitcs.com',
    new.email,
    null,
    new.id,
    null,
    jsonb_build_object(
      'event', 'candidate_application_persisted',
      'application_reference', new.public_reference,
      'job_code', new.job_code
    )
  );

  return new;
end;
$$;

revoke execute on function public.queue_candidate_application_emails()
  from public, anon, authenticated;
grant execute on function public.queue_candidate_application_emails()
  to service_role;

drop trigger if exists candidate_application_email_queue_after_insert on public.applications;
create trigger candidate_application_email_queue_after_insert
after insert on public.applications
for each row
execute function public.queue_candidate_application_emails();

comment on function public.queue_candidate_application_emails() is
  'Phase 13.4 persistence-first application notification queue. Creates one applicant acknowledgement and one internal careers alert with durable idempotency after the application row commits.';

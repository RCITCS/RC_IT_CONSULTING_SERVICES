-- Phase 15.8 — Application-notification identity convergence.
-- Phase 15 standardizes the recruitment mailbox on careers@rcitcs.com. The Phase-13
-- application insert trigger must use that same approved identity or new candidate
-- applications can fail while atomically queueing their acknowledgement/alert records.

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
    'careers@rcitcs.com',
    'careers@rcitcs.com',
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
    'careers@rcitcs.com',
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

revoke all on function public.queue_candidate_application_emails()
  from public, anon, authenticated;
grant execute on function public.queue_candidate_application_emails()
  to service_role;

comment on function public.queue_candidate_application_emails() is
  'Phase 15.8 application-notification queue convergence. Uses the approved careers@rcitcs.com recruitment identity while preserving Phase-13 persistence-first idempotent queueing.';

notify pgrst, 'reload schema';

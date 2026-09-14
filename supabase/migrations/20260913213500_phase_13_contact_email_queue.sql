-- Phase 13.5 — atomically queue website contact/demo/consultation/chat notifications.
-- This trigger runs only after contact_enquiries persistence succeeds and performs no external HTTP call.

create or replace function public.queue_contact_enquiry_emails()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.enqueue_transactional_email(
    'rcitcs/contact_acknowledgement/contact_enquiry/' || lower(new.id::text),
    'contact_acknowledgement',
    new.email,
    'contact@rcitcs.com',
    'contact@rcitcs.com',
    null,
    null,
    new.id,
    jsonb_build_object(
      'event', 'contact_enquiry_persisted',
      'source', coalesce(new.source, 'website'),
      'subject', new.subject,
      'service', new.service
    )
  );

  perform public.enqueue_transactional_email(
    'rcitcs/internal_contact_alert/contact_enquiry/' || lower(new.id::text),
    'internal_contact_alert',
    'contact@rcitcs.com',
    'noreply@rcitcs.com',
    new.email,
    null,
    null,
    new.id,
    jsonb_build_object(
      'event', 'contact_enquiry_persisted',
      'source', coalesce(new.source, 'website'),
      'subject', new.subject,
      'service', new.service
    )
  );

  return new;
end;
$$;

revoke execute on function public.queue_contact_enquiry_emails()
  from public, anon, authenticated;
grant execute on function public.queue_contact_enquiry_emails()
  to service_role;

drop trigger if exists contact_enquiry_email_queue_after_insert on public.contact_enquiries;
create trigger contact_enquiry_email_queue_after_insert
after insert on public.contact_enquiries
for each row
execute function public.queue_contact_enquiry_emails();

comment on function public.queue_contact_enquiry_emails() is
  'Phase 13.5 persistence-first website enquiry notification queue. Creates one visitor acknowledgement and one internal contact alert with durable idempotency.';

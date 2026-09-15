-- Phase 15.5 — Candidate delivery-state convergence.
-- email_logs remains the delivery authority. candidate_messages mirrors the exact safe
-- delivery state so persisted communication remains internally consistent even outside
-- the joined administrator projection.

alter table public.candidate_messages
  drop constraint if exists candidate_messages_status_check,
  add constraint candidate_messages_status_check check (
    status = any(array[
      'queued','sending','sent','delivered','bounced','complained',
      'failed','suppressed','received','draft'
    ]::text[])
  );

create or replace function public.sync_candidate_message_delivery_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.candidate_messages
     set status = case
       when new.status = any(array[
         'queued','sending','sent','delivered','bounced','complained','failed','suppressed'
       ]::text[]) then new.status
       else status
     end,
     provider_message_id = new.provider_message_id,
     sent_at = new.sent_at
   where email_log_id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_candidate_message_delivery_state()
  from public, anon, authenticated;
grant execute on function public.sync_candidate_message_delivery_state()
  to service_role;

-- Recreate the trigger explicitly so the source contract stays self-contained if this
-- migration is replayed against an environment missing the earlier Phase-15 trigger.
drop trigger if exists email_logs_sync_candidate_message_delivery on public.email_logs;
create trigger email_logs_sync_candidate_message_delivery
after update of status, provider_message_id, sent_at on public.email_logs
for each row
execute function public.sync_candidate_message_delivery_state();

comment on function public.sync_candidate_message_delivery_state() is
  'Phase 15.5 delivery-state mirror. Candidate messages copy exact safe transactional email states while email_logs remains authoritative for retries and provider evidence.';

notify pgrst, 'reload schema';
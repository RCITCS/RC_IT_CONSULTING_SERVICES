-- Phase 16.3: audit ledger tamper resistance.
-- Preserve append/read service authority; remove historical mutation/truncate authority.

alter table public.audit_logs drop constraint if exists audit_logs_admin_id_fkey;
alter table public.audit_logs
  add constraint audit_logs_admin_id_fkey
  foreign key (admin_id) references public.admins(id) on delete restrict;

alter table public.audit_logs drop constraint if exists audit_logs_session_id_fkey;
alter table public.audit_logs
  add constraint audit_logs_session_id_fkey
  foreign key (session_id) references public.sessions(id) on delete restrict;

revoke all on table public.audit_logs from anon, authenticated;
revoke update, delete, truncate, references, trigger on table public.audit_logs from service_role;
grant select, insert on table public.audit_logs to service_role;

create or replace function public.reject_audit_log_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'postgres' then
    raise exception 'audit ledger is append-only' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    return new;
  elsif tg_op = 'DELETE' then
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists audit_logs_reject_row_mutation on public.audit_logs;
create trigger audit_logs_reject_row_mutation
before update or delete on public.audit_logs
for each row
execute function public.reject_audit_log_mutation();

drop trigger if exists audit_logs_reject_truncate on public.audit_logs;
create trigger audit_logs_reject_truncate
before truncate on public.audit_logs
for each statement
execute function public.reject_audit_log_mutation();

revoke execute on function public.reject_audit_log_mutation()
  from public, anon, authenticated, service_role;

comment on function public.reject_audit_log_mutation() is
  'Phase 16.3 defense-in-depth: non-owner audit rows cannot be updated, deleted, or truncated.';
comment on table public.audit_logs is
  'Append-only security/admin audit ledger for application roles. service_role may SELECT and INSERT only; database owner remains migration authority.';

notify pgrst, 'reload schema';

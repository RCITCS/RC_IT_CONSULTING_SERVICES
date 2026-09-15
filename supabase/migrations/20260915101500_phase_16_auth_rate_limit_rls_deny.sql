-- Phase 16.8 convergence: retain service-only rate-limit authority while giving
-- the security linter an explicit browser-role deny policy in addition to revoked grants.

drop policy if exists admin_auth_rate_limits_browser_deny on public.admin_auth_rate_limits;
create policy admin_auth_rate_limits_browser_deny
on public.admin_auth_rate_limits
for all
to anon, authenticated
using (false)
with check (false);

revoke all on table public.admin_auth_rate_limits from public, anon, authenticated;
revoke all on function public.consume_admin_auth_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;

grant select, insert, update, delete on table public.admin_auth_rate_limits to service_role;
grant execute on function public.consume_admin_auth_rate_limit(text, text, integer, integer)
  to service_role;

notify pgrst, 'reload schema';

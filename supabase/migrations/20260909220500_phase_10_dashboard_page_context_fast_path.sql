-- Phase 10 — dashboard page fast path.
-- Reuses the canonical session-context and dashboard-snapshot functions so the
-- Edge Function can load an authenticated overview with one database round trip.

create or replace function public.get_admin_dashboard_page_context(
  p_token_hash text,
  p_idle_cutoff timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session jsonb;
  v_snapshot jsonb;
  v_admin_id uuid;
begin
  v_session := public.get_admin_session_context(p_token_hash, p_idle_cutoff);
  if v_session is null then
    return null;
  end if;

  v_admin_id := (v_session ->> 'admin_id')::uuid;
  v_snapshot := public.get_admin_dashboard_snapshot(v_admin_id);
  if v_snapshot is null then
    return null;
  end if;

  return jsonb_build_object(
    'session', v_session,
    'snapshot', v_snapshot
  );
end;
$$;

revoke all on function public.get_admin_dashboard_page_context(text, timestamptz) from public, anon, authenticated;
grant execute on function public.get_admin_dashboard_page_context(text, timestamptz) to service_role;

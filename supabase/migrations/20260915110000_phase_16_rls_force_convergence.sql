-- Phase 16.12: converge remaining private public tables to FORCE RLS.
-- Browser grants/policies were already deny-only; this removes owner-context exceptions
-- so the defense-in-depth posture is consistent across the private application schema.

alter table public.application_intake_sessions force row level security;
alter table public.job_code_registry force row level security;

-- Reassert browser isolation after convergence.
revoke all on table public.application_intake_sessions from public, anon, authenticated;
revoke all on table public.job_code_registry from public, anon, authenticated;

notify pgrst, 'reload schema';

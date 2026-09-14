-- Recorded during Phase 13.3 production verification. Reassert service-role-only access.
revoke execute on function public.enqueue_transactional_email(text,text,text,text,text,text,uuid,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.enqueue_transactional_email(text,text,text,text,text,text,uuid,uuid,jsonb)
  to service_role;

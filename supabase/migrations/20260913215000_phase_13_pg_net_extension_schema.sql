-- Phase 13.6 security correction — pg_net is not relocatable after installation.
-- Recreate it with extension ownership in the shared extensions schema.
-- pg_net continues to expose its HTTP API through the dedicated net schema.

do $$
declare
  v_schema text;
begin
  select n.nspname
    into v_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_net';

  if v_schema = 'public' then
    drop extension pg_net;
    create extension pg_net with schema extensions;
  elsif v_schema is null then
    create extension pg_net with schema extensions;
  end if;
end
$$;

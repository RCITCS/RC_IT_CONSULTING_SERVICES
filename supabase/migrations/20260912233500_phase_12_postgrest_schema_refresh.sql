-- Phase 12 — PostgREST schema-cache convergence
-- The Jobs and Applications admin workspaces depend on server-only RPCs created in
-- Phases 11–12. Keep the database contract forward-only and explicitly refresh the
-- Data API schema cache so those RPC signatures are visible immediately after rollout.

select pg_notification_queue_usage();
notify pgrst, 'reload schema';

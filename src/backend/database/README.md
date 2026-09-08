# Database ownership

Phase 8 uses Supabase Postgres as the approved persistent-data target through the server-side provider layer. Database schema changes live in `supabase/migrations/` and application code must access data through `src/backend/providers/database-provider.js` and repository modules rather than direct browser/database calls.

All private application tables enable RLS and revoke `anon`/`authenticated` privileges. The backend secret key is server-only and must never be placed in frontend code or committed to source control.

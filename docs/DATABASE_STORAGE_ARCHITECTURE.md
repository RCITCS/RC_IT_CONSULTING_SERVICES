# RC IT Services — Database and Storage Architecture

## Phase 8 decision

Supabase is the target persistence platform for the RC IT Services backend: Postgres for durable application data and a private Storage bucket for candidate documents. Runtime code uses the Supabase HTTP APIs through server-only provider adapters so Cloudflare Workers, local Node and the Vercel fallback retain one backend authority and no browser bundle receives an elevated key.

## Required server configuration

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` — preferred current server key; legacy `SUPABASE_SERVICE_ROLE_KEY` remains accepted for migration compatibility
- `SUPABASE_STORAGE_BUCKET` — optional; defaults to `candidate-documents`

The secret key must only exist in server runtime secrets. It must never be placed in frontend code, public assets, source control or client-visible configuration.

## Database schema

The reproducible migration under `supabase/migrations/` defines the Phase 8 data domains:

- admins
- sessions
- password reset tokens
- job categories and jobs
- applications and private document metadata
- application history
- contact/demo/consultation/chat enquiries
- candidate messages
- notifications
- email logs
- audit logs

All application tables enable Row Level Security. `anon` and `authenticated` table privileges are revoked; the server-side service role retains the operations needed by backend repositories. Phase 9 will add authentication/authorization rules at the application boundary and Phase 11–16 will add their domain operations without exposing the database directly to the browser.

## Public submission persistence

Phase 7's submission service remains authoritative. When Supabase is not configured, valid public submissions still return truthful `503 PERSISTENCE_NOT_CONFIGURED`. When the required server secrets are configured and the migration is applied, the database-backed repository writes normalized contact/demo/consultation/chat records into `contact_enquiries` and returns `201` only after Postgres confirms the same generated record ID.

## Candidate documents

The target bucket is private. Candidate resume and cover-letter objects are restricted to 20 MiB each and the supported MIME types are PDF, DOC and DOCX. Application code also checks extension, MIME type, size and leading file signature before a future Phase 12 upload is accepted.

Object paths are generated from application/document UUIDs rather than user filenames:

`applications/<application-id>/documents/<document-id>.<ext>`

Original filenames are metadata only and never become object keys.

## Retrieval model

The storage provider exposes only private upload and short-lived signed-download primitives. Signed URLs are restricted to 30–900 seconds and are intended to be created only after the Phase 9 admin authorization boundary approves retrieval. No public bucket URL or unauthenticated document endpoint is introduced in Phase 8.

## Provisioning

`supabase/config.toml` records the local/reproducible storage constraints. `scripts/provision-supabase-storage.mjs` idempotently creates or updates the hosted private bucket once approved Supabase server secrets exist. The SQL migration remains the source of truth for Postgres schema creation.

## Phase boundaries

Phase 8 does not implement login/session flows, admin screens, job CMS behavior, candidate application submission, outbound email or audit-event production. It provides the durable schema and private-storage capabilities those later phases will consume.

# Phase 20.12 Database / Persistence / Migration / RLS Certification

## Scope

Phase 20.12 certifies the production database boundary after Phase 20.11. It covers the current public schema, persistence integrity, migration lineage, RLS and grants, transactional persistence controls, and destructive/duplicate migration safeguards.

Certified Phase 20.11 baseline:

`10400c7b6c8efe46d001e6aba82ba8e36523318d`

## Read-only production reconciliation before implementation

The RCITCS production Supabase project was inspected without returning credentials, tokens, password hashes, candidate documents, enquiry bodies, or other private record content.

Observed production state before the Phase 20.12 migration:

- 19 public application tables.
- RLS enabled and FORCE RLS enabled on every public application table.
- One explicit browser-deny policy on every public application table.
- No `anon` or `authenticated` table grants on those tables.
- No invalid indexes.
- No orphaned applications, application documents/history/messages, or contact history/notes/messages in the checked relationships.
- No invalid job/application/contact version counters.
- No invalid transactional-email status values.
- Supabase security advisor: zero findings.
- Critical public RPCs inspected do not expose browser execution authority; persistence functions remain server-side.
- One historical constraint remained `NOT VALID`: `application_documents_sha256_check`.
- Current `application_documents` row count was zero, therefore zero rows would violate the SHA-256 constraint.

The `NOT VALID` state is a certification gap even though PostgreSQL already enforces the constraint for new or modified rows. Phase 20.12 closes that gap by validating the existing constraint without rewriting data.

## Forward-only migration

`20260920014500_phase_20_12_application_document_hash_validation.sql`

The migration:

1. Requires the expected historical constraint to exist.
2. Fails closed if any persisted document has a missing or malformed SHA-256 value.
3. Executes `VALIDATE CONSTRAINT`.
4. Does not insert, update, delete, truncate, drop, or fabricate application data.
5. Reloads the PostgREST schema cache after successful validation.

## Migration lineage safeguards

The Phase 20.12 source test requires unique 14-digit migration version prefixes, rejects destructive `DROP TABLE`, `TRUNCATE`, and `DROP SCHEMA` statements in the tracked migration lineage, and rejects exact duplicate migration contents unless the files explicitly declare themselves intentional no-schema-change markers.

The two Phase 13 production-verification marker files are intentionally identical no-op migrations and are explicitly documented as such. They are not alternate schema mutation paths.

## Closure requirements

Phase 20.12 may close only after:

1. The complete inherited verification suite passes on the exact PR head.
2. The dedicated Phase 20.12 source/migration certification passes.
3. The PR is merged with an exact-head guard.
4. The merged `main` SHA passes inherited post-merge gates.
5. The Phase 20.12 forward-only migration is applied to production.
6. Production reconciliation proves the SHA-256 constraint is validated, all public tables remain FORCE RLS, browser grants remain absent, no critical persistence-integrity violations exist, and the Supabase security advisor remains clean.

Do not advance to Phase 20.13 while any of these requirements is unresolved.

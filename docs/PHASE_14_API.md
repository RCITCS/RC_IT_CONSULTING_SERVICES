# Phase 14.3 — Server-Authoritative Contact Admin API Verification

## Status

`COMPLETED & VERIFIED`

Phase 14.3 extends the existing authenticated `admin-auth` architecture with private, service-role-only contact-enquiry administration RPCs. Browser roles do not receive direct table or function authority.

## Scope

Implemented and verified server contracts:

1. `get_admin_contact_list`
2. `get_admin_contact_detail`
3. `admin_set_contact_read_state`
4. `admin_transition_contact_enquiry`
5. `admin_set_contact_archive_state`
6. `admin_add_contact_enquiry_note`

No Phase-14 UI is included in this sub-phase. No new email provider or Resend logic is introduced.

## Repository implementation evidence

- Phase-14 branch: `phase-14-contact-enquiry-administration`
- draft PR: `#75`
- API migration: `supabase/migrations/20260914030000_phase_14_contact_admin_api.sql`
- permanent contract tests: `tests/phase14-contact-admin-api.mjs`
- pre-documentation verified implementation head: `906acf371aeaa8bf29450d4e6f696db8e2f1ea47`
- exact-head GitHub gates all passed:
  - RC IT Services CI run `34800662053`
  - Wrangler Deployment Validation run `34800662055`
  - Phase 12 Runtime Smoke run `34800662226`
  - Phase 13 Email Runtime Smoke run `34800662041`
  - Phase 13 Secret Availability run `34800662056`

## Production migration evidence

Production Supabase project `chsizmffzpxcqhaptjeu` records:

- `20260914025356 phase_14_contact_admin_api`

The migration is forward-only. No historical migration was rewritten.

## Authorization proof

Live database verification confirmed:

- all six Phase-14 RPCs: `anon EXECUTE = false`
- all six Phase-14 RPCs: `authenticated EXECUTE = false`
- all six Phase-14 RPCs: `service_role EXECUTE = true`
- an invalid/fake administrator receives `FORBIDDEN`
- the existing active super administrator can access the private list/detail projections

Supabase Security Advisor after Phase-14.3 DDL: **0 findings**.

## Read/list projection proof

The live production register returned successfully against the existing production enquiry.

The list contract is bounded and keyset-paginated by `(last_activity_at, id)` and intentionally excludes full message content and phone data.

The authorized detail contract returned the full private enquiry projection including phone/message only behind the server-authoritative administrator boundary.

## Production mutation acceptance

A synthetic enquiry was created solely for controlled Phase-14.3 acceptance. The Phase-13 contact-email queue rows created by the insert trigger were deleted in the same transaction as the insert, before they could become visible to the scheduler.

Acceptance then proved:

- mark-read succeeds and preserves workflow status
- stale `expected_version` mutation returns `STALE_VERSION`
- `new -> open` legal transition succeeds
- archiving an active/non-terminal enquiry returns `INVALID_ARCHIVE_STATE`
- an internal note persists successfully
- note persistence advances parent activity/version through the existing trigger boundary
- `open -> resolved` succeeds
- resolved enquiry can be archived
- archived enquiry rejects read-state mutation with `ARCHIVED`
- restore succeeds
- mark-unread succeeds after restore
- final server state was `resolved`, unread, active/unarchived
- parent version advanced from `1` to `8`
- seven workflow-history rows were recorded
- one internal note was recorded
- seven audit events were recorded
- the internal-note body marker was not copied into audit `before_data`, `after_data`, or metadata

## Cleanup proof

After acceptance, all synthetic data was removed:

- synthetic enquiry: 0 rows
- synthetic history: 0 rows
- synthetic notes: 0 rows
- synthetic messages: 0 rows
- synthetic email logs: 0 rows
- synthetic audit logs: 0 rows

Production returned to exactly one real contact enquiry. The real enquiry was not mutated during Phase-14.3 acceptance.

## Security and architecture conclusions

- authentication/session authority remains in the existing `admin-auth` boundary
- PostgreSQL/RPCs remain mutation authority
- browser roles cannot execute private contact-admin RPCs
- optimistic concurrency is enforced server-side
- workflow transitions are server-owned rather than browser-defined
- audit snapshots contain operational state rather than customer message/note bodies
- Phase-13 notification architecture remains unchanged
- no Supabase or Resend key rotation was required

## Closure

Phase 14.3 is `COMPLETED & VERIFIED`.

Phase 14.4 may begin only from this verified server contract and must not duplicate database or workflow authority in the UI.
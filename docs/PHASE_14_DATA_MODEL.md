# Phase 14.2 — Contact-Enquiry Data Model Verification

Status: **PHASE 14.2 — COMPLETED & VERIFIED**

This document records the implementation and production acceptance evidence for the Phase-14 contact administration data model. Phase 14 as a whole remains OPEN.

## Implementation

Phase 14.2 introduced a forward-only contact administration model while preserving the existing public contact intake and Phase-13 transactional-email architecture.

### Existing enquiry extensions

`public.contact_enquiries` now includes operational state for:

- current read state: `read_at`
- first review evidence: `first_read_at`
- resolution timestamp: `resolved_at`
- close timestamp: `closed_at`
- archive timestamp: `archived_at`
- operational sorting: `last_activity_at`
- optimistic concurrency: `version`

The existing status vocabulary is preserved:

- `new`
- `open`
- `in_progress`
- `resolved`
- `closed`
- `spam`

Historical `read` status is converged to `open`; read/unread is now an independent state instead of a workflow status.

Archival is independent from the status vocabulary and is constrained to terminal workflow states (`resolved`, `closed`, `spam`).

### Accepted intake immutability

A database trigger prevents post-acceptance mutation of the original public intake fields:

- identity/name
- email
- phone
- company
- service
- subject
- original message
- privacy consent/evidence
- source
- intake metadata
- creation timestamp

Operational updates increment `version` automatically. This prevents Phase-14 admin workflows from accidentally rewriting customer-submitted evidence.

### Workflow history

`public.contact_enquiry_history` is the append-only operational/system history domain. It stores:

- enquiry
- event type
- optional previous/new status
- acting administrator where applicable
- event metadata
- timestamp

### Internal notes

`public.contact_enquiry_notes` is a dedicated private, append-only domain for administrator notes.

It has no email trigger or provider coupling. Internal notes cannot become customer messages merely because they exist in the database.

### Persisted external replies

`public.contact_enquiry_messages` records outbound administrator replies and stores:

- enquiry
- outbound direction
- approved `contact@rcitcs.com` sender
- authoritative recipient value persisted by the future server RPC
- approved Reply-To
- subject
- plain message body
- deterministic idempotency key
- linked `email_logs` record
- creating administrator
- timestamp

Provider delivery state is deliberately **not duplicated** in this table. `email_logs` remains the provider/delivery source of truth.

### Activity ordering

Internal-note and reply inserts advance `contact_enquiries.last_activity_at` through a server/database trigger and pass through the parent version guard.

### Query indexes

Phase 14.2 adds bounded-inbox/query support for:

- active enquiries ordered by `(last_activity_at desc, id desc)`
- active status-filtered enquiries
- unread active enquiries
- enquiry history by enquiry/time
- internal notes by enquiry/time
- outbound messages by enquiry/time

At the current production volume the PostgreSQL planner may correctly prefer a sequential scan over an index for trivial one-row reads. Index existence is not treated as proof of performance; Phase 14.12 will validate real query plans once the actual admin list/search RPCs exist.

## Historical migration convergence

The Phase-14 migration includes forward-safe compatibility logic for the repository's older Phase-8 contact shape. It copies legacy values into current authoritative columns only when those historical columns exist and does not drop legacy columns.

No previously applied migration was edited or rewritten.

The known historical migration-lineage gap remains documented in `docs/PHASE_14_AUDIT.md`; Phase 14 adds forward-only migrations from the current repository/production state rather than pretending the absent historical migration file exists.

## Security boundary

The following tables have RLS enabled and forced:

- `contact_enquiries`
- `contact_enquiry_history`
- `contact_enquiry_notes`
- `contact_enquiry_messages`

`anon` and `authenticated` have no direct table access to these private domains.

The new history, notes and message tables are restricted at the table-privilege layer to `service_role` **SELECT + INSERT only**.

### Defect found during post-migration review

Production database default privileges had automatically granted broader `service_role` privileges to newly created tables. The first migration's `GRANT SELECT, INSERT` did not remove those already inherited UPDATE/DELETE rights.

This was treated as a Phase-14.2 blocker.

A separate forward-only corrective migration, `phase_14_contact_append_only_privileges`, explicitly:

1. revokes all inherited `service_role` rights on the three append-only domains;
2. grants back only `SELECT, INSERT`;
3. reasserts zero browser-role access.

Post-correction production verification proves:

- history: SELECT true, INSERT true, UPDATE false, DELETE false
- notes: SELECT true, INSERT true, UPDATE false, DELETE false
- messages: SELECT true, INSERT true, UPDATE false, DELETE false
- anon/authenticated SELECT: false for all three

Supabase Security Advisor reports **0 findings** after both migrations.

## Phase-13 compatibility

The existing `queue_contact_enquiry_emails` after-insert trigger remains installed on `contact_enquiries`.

Phase 14.2 does not:

- replace the Phase-13 notification trigger
- call Resend directly
- add another provider
- add another queue
- change existing API keys
- expose provider credentials

## Production behavioral proof

A controlled synthetic enquiry was created solely for the Phase-14.2 database acceptance test using an RC IT Services-controlled email address.

The test proved:

1. a new enquiry starts at version 1;
2. an operational read-state update increments version to 2;
3. an attempted mutation of accepted intake identity is rejected by the database trigger;
4. inserting an internal note persists the note and increments parent version to 3;
5. inserting a persisted outbound message increments parent version to 4;
6. workflow history persists against the enquiry;
7. the original Phase-13 after-insert email trigger still creates queue rows;
8. those synthetic email-log rows were removed before the transaction committed, so no scheduler/provider delivery could occur;
9. deleting the synthetic parent cleaned its history/notes/messages through foreign-key cascade;
10. no synthetic enquiry or synthetic email-log row remained after the proof.

Post-test production state:

- synthetic enquiry rows: 0
- synthetic email-log rows: 0
- original production enquiries: 1
- original enquiry status: `new`
- original enquiry read state: unread
- original enquiry archive state: active
- original enquiry version: 1

No real enquiry PII was retrieved or changed for this test.

## Automated regression gate

`tests/phase14-contact-data-model.mjs` is part of the project architecture/full test suite and permanently checks:

- forward-only migration behavior
- legacy-column preservation/convergence
- status compatibility
- read/archive/version fields
- keyset-friendly indexes
- immutable intake guard
- history domain
- internal-note separation
- outbound-message idempotency/delivery-source-of-truth rule
- CR/LF header-injection constraints
- activity/version triggers
- forced RLS/browser denial
- append-only service-role privilege correction
- no Resend key/provider HTTP usage in database migration code
- preservation of the existing Phase-13 contact email trigger

## Independent reviews

### Product Owner — PASS

The model supports the approved contact-administration workflow without introducing candidate communication, fake multi-agent assignment behavior, or public-site redesign.

### Solution / Software Architect — PASS

Postgres owns workflow/history state, `email_logs` owns provider-delivery state, `audit_logs` remains the broader administrative audit stream, and Phase-13 transactional email remains the sole provider boundary. No duplicate delivery source of truth was introduced.

### Backend — PASS

The schema supports future server-authoritative APIs with explicit versioning, idempotency and immutable intake. No client authority is introduced.

### Database / Migration — PASS

Both migrations are additive/forward-only, existing production data is preserved, legacy/current schema convergence is explicit, constraints/indexes/FKs are installed, and the privilege defect discovered after migration was corrected through a new migration rather than by rewriting applied history.

### QA — PASS

Static regression tests and a real production-database behavioral proof covered happy state, version changes, immutable-input rejection, child persistence, history persistence and cleanup.

### Security — PASS

Browser roles remain denied; RLS is forced; append-only domains are SELECT+INSERT only for service role; header/content constraints are present; Security Advisor has zero findings.

### Performance — PASS FOR 14.2

Indexes are aligned to the planned keyset/order/filter shapes. Actual inbox/search SQL will be measured again in Phase 14.12 after the server RPCs exist. No speculative index removal was performed based on current INFO-only unused-index notices.

### Frontend / Accessibility / SEO / Browser Flow — N/A FOR 14.2

No Phase-14 UI or browser route exists yet. Existing public and private surfaces are unchanged and prior runtime regressions remain green.

## Git / CI evidence

Pre-production and corrective heads passed:

- RC IT Services architecture/test/build CI
- Phase-12 production runtime smoke
- Phase-13 email runtime/auth smoke
- Wrangler public/admin bundle validation
- secret-presence safety check

Phase-14 PR remains draft and unmerged.

## Remaining blockers

None for Phase 14.2.

## Conclusion

**PHASE 14.2 — COMPLETED & VERIFIED**

Phase 14 remains OPEN. The next permitted item is **14.3 — Server-Authoritative Contact Admin API**.
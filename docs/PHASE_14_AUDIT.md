# Phase 14.1 — Contact-Enquiry Administration Audit & Safety Baseline

Status: **PHASE 14.1 — AUDIT COMPLETE; IMPLEMENTATION NOT STARTED**

This document freezes the production and repository baseline that Phase 14 must preserve. It is intentionally documentation-only. No Phase-14 schema, admin route, UI, notification, or production behavior is introduced by this commit.

## Governing engineering rules

Phase 14 follows the RC IT Services MASTER SOFTWARE ENGINEERING OPERATING RULES: inspect before change, work one sub-phase at a time, preserve approved UX and architecture, keep the server/database authoritative, use forward-safe migrations, execute real integration acceptance, perform independent specialist reviews, and keep the phase OPEN while any material blocker remains.

Phase 15 candidate communication is explicitly out of scope for Phase 14.

Existing Supabase and Resend credentials remain in use. Phase 14 does not require key creation or credential rotation.

## Repository baseline

- Primary repository: `SRIHARIKATTAFM/RC-IT-SERVICES`
- Canonical production branch at Phase-14 start: `main`
- Exact Phase-14 start SHA: `e46af6313fec7d18b0489a9eb9d85c94d1e5cbdb`
- Phase-14 branch: `phase-14-contact-enquiry-administration`
- Company mirror at Phase-14 start: `RCITCS/RC_IT_CONSULTING_SERVICES`
- Phase 13 is closed and must not be rewritten as part of Phase 14.

## Locked Phase-14 business outcome

A contact enquiry submitted through `rcitcs.com` must persist through the existing public backend, appear in the authenticated private administration workspace, be reviewable and trackable, support clearly separated internal notes and external replies, preserve a complete audit/conversation history, and be resolvable/archivable without compromising the public website, admin authentication boundary, or Phase-13 notification architecture.

## Existing public contact workflow

The approved public contact form posts JSON to `/api/contact` and currently captures:

- first name
- last name
- company
- job title
- email
- phone
- consultation topic/service
- message
- privacy consent
- enquiry intent/subject

The browser layer validates required fields and basic email/phone shape, disables submission while the request is in flight, resets only after an HTTP success response, and preserves entered values on failure.

The backend independently validates the payload and owns acceptance. Current server constraints include bounded first/last/company/job-title/email/phone/topic/message/intent lengths, required privacy consent, and server-side email/phone validation.

The submission repository persists contact data to `public.contact_enquiries` and verifies the database returns the same generated record ID. There is no client-only or fake-success persistence path.

Public submission behavior is an approved Phase-7/8/13 flow and must not be redesigned merely to implement Phase 14.

## Current production `contact_enquiries` schema

The live production table currently contains:

- `id uuid` primary key
- `name text not null`
- `email text not null`
- `phone text null`
- `company text null`
- `service text null`
- `subject text null`
- `message text not null`
- `consent boolean not null default false`
- `consent_at timestamptz null`
- `status text not null default 'new'`
- `source text null`
- `assigned_to uuid null` referencing `admins(id)` with `ON DELETE SET NULL`
- `metadata jsonb not null default '{}'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Current status constraint permits:

- `new`
- `open`
- `in_progress`
- `resolved`
- `closed`
- `spam`

Existing indexes include:

- primary key
- `(status, created_at desc)`
- `lower(email)`
- partial `assigned_to`

The existing dashboard outstanding-contact query uses the status/created index through a bitmap index scan for `new/open/in_progress`.

## Production data baseline

At audit time production contains exactly **one existing contact enquiry**.

Non-sensitive state only:

- source: `contact`
- status: `new`
- assigned: no
- production metadata keys: `intent`, `job_title`, `received_at`, `request_id`, `submission_type`

The audit intentionally did not retrieve or expose the enquiry's name, email, phone, message, or other PII.

This record is treated as real production data. Phase 14 must preserve it and must not use it as disposable acceptance data.

## Current Phase-13 notification boundary

`public.queue_contact_enquiry_emails()` runs after an accepted `contact_enquiries` insert and queues exactly two durable transactional-email jobs:

1. visitor acknowledgement
   - sender: `contact@rcitcs.com`
   - recipient: persisted visitor email
   - Reply-To: `contact@rcitcs.com`
2. internal alert
   - sender: `noreply@rcitcs.com`
   - recipient: `contact@rcitcs.com`
   - Reply-To: persisted visitor email

The trigger does not perform provider HTTP delivery inside the contact persistence transaction. Phase-13 queueing, idempotency, bounded retry, cron sweeping, monitoring, and provider boundaries remain authoritative and must be reused rather than reimplemented.

Phase 14 administrative replies must enter the centralized transactional-email architecture; no browser-side Resend integration and no second email provider path are allowed.

## Current admin architecture

The production admin surface is `admin.rcitcs.com`, backed by the isolated `admin-auth` Supabase Edge Function behind the dedicated admin proxy boundary.

Current security properties include:

- private no-cache responses
- `X-Robots-Tag: noindex`
- CSP / frame denial / HSTS / nosniff / no-referrer policies
- Secure + HttpOnly server sessions
- SameSite=Strict normal administrator session cookies
- server-side session expiry and revocation
- CSRF validation for authenticated mutations
- super-admin authority enforced by backend routes
- direct browser access to private application tables denied

Existing authenticated workspaces are routed through server-owned admin handlers for dashboard, jobs, applications, and security. No contact-enquiry administration route exists yet.

The dashboard already includes an aggregate `contact_enquiries` attention count for records in `new`, `open`, or `in_progress`. That aggregate is read-only and does not constitute a contact-management feature.

## Admin navigation finding

Administration navigation is currently rendered in more than one module. The applications workspace includes an Applications navigation item, while some dashboard/jobs navigation renderers contain only Overview, Jobs, and Security.

Phase 14 must not create another inconsistent navigation variant. Adding a Contacts/Enquiries workspace must preserve the established visual language and produce consistent desktop/mobile navigation across affected admin pages. A broad unrelated UI rewrite is not authorized; use the smallest maintainable correction with regression coverage.

## Existing audit authority

`public.audit_logs` is the existing administrative/security audit source of truth. It records:

- administrator
- action
- entity type / entity ID
- IP hash
- user agent
- before/after data where applicable
- metadata
- timestamp

Authentication, job administration, candidate document access, and other protected workflows already write audit evidence. Phase 14 must reuse this table and established server-side audit patterns rather than inventing a parallel audit system.

Contact status changes, internal-note actions, external replies, archive/restore operations and other material mutations require auditable server-side events.

## Security baseline

Production checks at the Phase-14 start confirm:

- RLS is enabled and forced on private admin/contact domains inspected.
- `anon` cannot SELECT or UPDATE `contact_enquiries`.
- `authenticated` cannot SELECT or UPDATE `contact_enquiries`.
- browser roles cannot SELECT `audit_logs` or `email_logs`.
- contact-related private RPC/function access remains server/service-role controlled.
- Supabase Security Advisor reports **0 findings**.

This boundary is non-negotiable. A hidden button, client route guard, query parameter, or client-supplied role can never become authorization.

## Performance baseline

The current dashboard outstanding-contact count is supported by `contact_enquiries_status_created_idx`.

Supabase Performance Advisor currently reports INFO-level unused-index notices, including the existing contact email and assignment indexes. These notices are not defects by themselves because production volume is currently minimal and Phase 14 has not yet exercised inbox/search/assignment query shapes.

Phase 14 must measure the actual list/detail/search queries before removing or adding indexes. Server-side pagination and bounded result sets are required; loading all enquiries into the browser is not acceptable.

## Migration-history reproducibility finding

A material historical lineage gap exists and must be handled deliberately.

The repository contains the older file:

`supabase/migrations/20260908183500_phase_8_schema.sql`

However, the production `supabase_migrations.schema_migrations` history also contains a later applied Phase-8 migration version `20260908230653` named `phase_8_schema`. That later production migration is the source of the current `contact_enquiries` shape, status constraint, indexes and browser-deny model.

The `20260908230653` migration file is not present on current `main`, and it is also absent from the preserved `phase-8/database-storage` branch tree.

Therefore the repository's historical Phase-8 migration files do **not** exactly reconstruct the already-running production lineage from zero.

Phase 14 rules for this condition:

1. Do not edit, rename, delete, or backdate previously applied migrations.
2. Do not pretend the older Phase-8 file is the live schema authority.
3. Treat the inspected production schema as the current compatibility baseline.
4. Add a new forward-only Phase-14 convergence migration with explicit precondition/shape checks and only the additions needed by Phase 14.
5. Preserve all existing rows and legacy values.
6. Keep the new Phase-14 migration reproducible from the repository state that exists now.
7. Record any unavoidable historical lineage exception explicitly in Phase-14 closure evidence.

## Data-model gaps Phase 14 must address

The live contact table is sufficient for intake but not yet a complete administrative workflow. It currently lacks dedicated durable concepts for:

- read/unread state
- read timestamp
- resolution/archive timestamps
- explicit workflow history
- internal notes
- external admin reply/conversation history
- outbound delivery linkage/status for admin replies
- optimistic-concurrency/version semantics for admin mutations

These gaps must be designed in Phase 14.2 without overloading `metadata` as an unstructured source of truth.

`assigned_to` already exists. Because production currently has one super administrator, Phase 14 must not fabricate a multi-agent assignment UX. The field may remain nullable/server-controlled for future compatibility unless a current business requirement justifies exposing assignment.

## Workflow/status design constraint

The existing persisted status vocabulary already includes `new`, `open`, `in_progress`, `resolved`, `closed`, and `spam`.

Phase 14 must define legal transitions explicitly and server-side before UI controls are implemented. Do not silently replace `closed` with a new `archived` status if archival can be represented independently; preserve compatibility with existing rows and dashboard semantics.

Read/unread is a separate concern from workflow status and must not be inferred solely from `status`.

## Public/private source-of-truth boundaries

- Public browser: requests contact submission only.
- Public backend: validates and persists accepted enquiries.
- Postgres: authoritative enquiry/workflow/history state.
- Admin browser: requests operations and renders server-authorized state.
- `admin-auth`: authenticates, authorizes and orchestrates private admin operations.
- Phase-13 transactional email: authoritative delivery boundary for automated/admin-originated email.
- Resend: transport provider, not the CRM database.
- Gmail: mailbox/operational destination, not the system of record.
- `audit_logs`: authoritative administrative audit stream.

## Locked Phase-14 implementation sequence

No later item begins with unresolved blockers in the previous item.

1. **14.1 Audit & Safety Baseline** — this document and baseline proof.
2. **14.2 Contact-Enquiry Data Model** — forward-only workflow/history/notes/reply model plus constraints/indexes/concurrency contract.
3. **14.3 Server-Authoritative Contact Admin API** — authenticated service-role/RPC boundary, validation, authorization and explicit errors.
4. **14.4 Admin Contact Inbox** — paginated/searchable/filterable operational register.
5. **14.5 Enquiry Detail Workspace** — original immutable intake + operational context.
6. **14.6 Read/Unread & Workflow Management** — legal transitions, timestamps and audit.
7. **14.7 Internal Administrative Notes** — private notes never exposed through public/contact email paths.
8. **14.8 Contact Reply Composer** — `contact@rcitcs.com`, authoritative recipient, idempotent send.
9. **14.9 Conversation Timeline** — original enquiry, system events, external replies, delivery state, workflow changes and clearly separated internal notes.
10. **14.10 Phase-13 Notification Integration** — preserve intake notifications and reuse centralized email reliability.
11. **14.11 Security & Privacy Hardening**.
12. **14.12 Performance / SQL / Data Loading Review**.
13. **14.13 Frontend Authenticity, Responsive & Accessibility Review**.
14. **14.14 Error Handling & Recovery**.
15. **14.15 Automated Test Suite**.
16. **14.16 Real Production Acceptance with controlled synthetic enquiry and cleanup**.
17. **14.17 Independent Product/Architecture/Frontend/Backend/DB/QA/Browser/Security/Performance/Accessibility/SEO/End-User reviews**.
18. **14.18 Git/CI/Production Closure and company-mirror exact-SHA parity**.

## Explicit non-goals

Phase 14 does not implement:

- candidate reply threads
- candidate CRM/message-center behavior
- candidate interview communications
- candidate application-stage communications
- a new auth provider
- a new database
- a new email provider
- new Supabase or Resend API keys
- arbitrary public-site redesign
- a replacement admin design system
- a fabricated multi-agent contact operation

Candidate communication remains Phase 15.

## Risks to control during implementation

1. **Migration lineage drift** — controlled through forward-only convergence, never historical rewrite.
2. **Existing production enquiry** — preserve untouched; synthetic acceptance uses separate clearly marked data and cleanup.
3. **Navigation duplication** — add Contacts consistently without broad UI churn.
4. **PII exposure** — lists return the minimum necessary fields; private message/detail data loads only for an authorized selected enquiry.
5. **XSS/content injection** — all customer content escaped; never render submitted HTML as trusted markup.
6. **IDOR/BOLA** — server validates record existence and authority for every private action.
7. **Double send** — admin replies require deterministic idempotency and authoritative persisted recipient.
8. **Email/database split-brain** — database conversation/history remains source of truth; provider state is downstream evidence.
9. **Concurrent admin edits** — define version/expected-state semantics before status/note/reply mutations.
10. **Fake success** — UI success only after authoritative persistence/operation result; integration failure must remain visible/recoverable.
11. **Performance drift** — use server-side pagination, bounded queries, measured query plans and no N+1 timeline loading.
12. **Phase-15 scope leakage** — no candidate communication code while Phase 14 is open.

## 14.1 acceptance review

### Product Owner — PASS

The audited scope matches Contact-Enquiry Administration and preserves the existing public contact flow. No candidate-communication or unrelated public-site work is introduced.

### Solution / Software Architect — PASS

Existing boundaries are clear: public intake, Postgres authority, private admin orchestration, service-role database access, centralized transactional email and existing audit stream. No second source of truth is required.

### Backend — PASS

Current public contact persistence is server-validated and database-confirmed. The future admin boundary can extend the existing authenticated `admin-auth` architecture rather than introducing a new backend surface.

### Database / Migration — PASS WITH DOCUMENTED HISTORICAL LINEAGE GAP

The live schema and applied migration lineage have been inspected. The missing historical production migration file is explicitly recorded. The approved correction strategy is a new forward-only Phase-14 convergence migration; no destructive history rewrite is permitted.

### QA — PASS

The baseline is concrete and testable: one existing production enquiry is preserved, public submission behavior is known, current status/source counts are known, and later acceptance must use isolated synthetic data with cleanup.

### Security — PASS

Browser roles remain denied from contact/audit/email private data, RLS is forced, admin access is server-authoritative, and Supabase Security Advisor is clean at Phase-14 start.

### Performance — PASS

The existing dashboard count uses the status index. Existing unused-index notices are INFO-only and will be reassessed against actual Phase-14 query plans rather than removed speculatively.

### Frontend / Accessibility / SEO — N/A FOR CODE IN 14.1

No UI was changed. Existing admin noindex/private headers and approved visual system are preserved. Frontend authenticity, responsive behavior and accessibility become active implementation gates when the contact workspace is built.

### Git / CI

- branch: `phase-14-contact-enquiry-administration`
- base SHA: `e46af6313fec7d18b0489a9eb9d85c94d1e5cbdb`
- implementation changes in 14.1: documentation only
- production changes in 14.1: none

## 14.1 conclusion

**PHASE 14.1 — COMPLETED & VERIFIED**

Phase 14 remains OPEN. The next permitted work item is **14.2 — Contact-Enquiry Data Model**. No later Phase-14 implementation may start until 14.2 itself is implemented, tested, reviewed and accepted.
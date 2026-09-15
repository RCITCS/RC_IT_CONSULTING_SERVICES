# Phase 15 — Admin Candidate Communication

## Authority

Phase 15 starts from verified `main` SHA `66d197135483d9c4350af5fb84a16a4fa98cff1d`, the merged and production-verified Phase 14 closure.

This phase extends the existing Phase 12 candidate-application workspace and Phase 13 transactional-email authority. It must not create a second email stack, expose Supabase credentials to the browser, or weaken the private candidate-document boundary.

## Non-negotiable engineering rules

- Work only on Phase 15. Do not start Phase 16.
- Preserve the dedicated `admin.rcitcs.com` security boundary.
- Server remains authoritative for authentication, recipient selection, sender identity, application status and persistence.
- Browser-supplied candidate email addresses are never trusted for delivery.
- Persist candidate communication before outbound delivery.
- Reuse the Phase 13 `email_logs` queue, Resend provider abstraction, retry policy and idempotency model.
- Keep internal notes and audit metadata separate from candidate-visible communication.
- Never expose private storage object paths or service credentials.
- Use forward-only migrations.
- No phase completion claim without exact-SHA CI, production runtime verification and mirror verification.

## Submodule gates

### 15.0 — Baseline and contract audit

- Verify source and mirror `main` SHAs match.
- Verify Phase 14 is merged and production-verified.
- Inspect application, candidate-message, application-history and email-log schemas.
- Inspect Phase 12 application admin routes.
- Inspect Phase 13 transactional-email dispatcher and Phase 14 durable reply pattern.

**Gate:** architecture and reuse boundaries are documented before schema changes.

### 15.1 — Candidate communication data model and server contracts

- Converge `candidate_messages` on a durable outbound-email record shape.
- Link each outbound candidate email to one `email_logs` row.
- Add message-level idempotency.
- Add approved sender/recipient/reply-to persistence.
- Add bounded read context for candidate communication history.
- Add service-role-only queue RPC for outbound candidate messages.
- Preserve browser deny-all access.
- Keep delivery status synchronized without making the browser authoritative.

**Gate:** migration contracts, permissions and indexes pass source review and database tests.

### 15.2 — Candidate communication read/history

- Extend application detail with bounded chronological communication history.
- Show subject, body, sender, recipient, created time and safe delivery state.
- Do not expose raw provider failures, secrets or internal-only metadata.
- Keep existing application history and document views intact.

**Gate:** authenticated read path is correct, bounded, escaped and regression-safe.

### 15.3 — Compose, preview and send

- Add authenticated compose workflow inside the application detail workspace.
- Derive recipient from the persisted application record.
- Use the approved recruitment sender identity `careers@rcitcs.com`.
- Validate subject/body server-side.
- Persist message + queue atomically before dispatch.
- Dispatch only through Phase 13 transactional email.
- Require CSRF/origin/session authority for mutations.
- Prevent double-submit duplication.

**Gate:** end-to-end queued-send contract passes with explicit success/failure states.

### 15.4 — Templates and application-status workflows

- Add controlled templates for review update, shortlist, interview, assessment, offer-stage update, rejection and withdrawal acknowledgement.
- Use safe server-side merge fields from persisted application/job data.
- Keep status change and email send as separate authoritative operations.
- Add optimistic-concurrency protection to status changes.
- Never auto-send offer/rejection merely because a status field changed.

**Gate:** each state transition and template is validated, historied and does not leak internal data.

### 15.5 — Delivery, retry and idempotency

- Reuse Phase 13 claim/retry/dead-letter behavior.
- Correlate candidate message, email log and application history.
- Surface safe delivery state to admin.
- Verify retries do not create duplicate candidate messages or duplicate queue records.
- Preserve delivery evidence after provider failures.

**Gate:** retry, failure and duplicate-send tests pass.

### 15.6 — Admin UI, responsive and accessibility

- Integrate communication into the existing enterprise admin application detail screen.
- Avoid generic card-heavy AI-dashboard styling.
- Preserve the established admin design language and navigation.
- Verify keyboard operation, labels, focus, validation, status messaging and confirmation behavior.
- Verify desktop, tablet and mobile rendering.

**Gate:** frontend, accessibility and mobile reviews pass with no application/document regression.

### 15.7 — Integration, security and performance verification

- Run Phase 12, 13 and 14 regressions plus Phase 15 tests.
- Verify browser roles cannot directly read/write candidate communication tables.
- Verify service-role-only RPC authority.
- Verify CSRF/origin/session boundaries.
- Run Supabase Security and Performance Advisors after DDL.
- Verify indexes support bounded application/message history queries.
- Review code as Product Owner, Architect, Frontend, Backend, Database, QA, Security, Performance, Accessibility and Admin User.

**Gate:** all defects found during specialist review are resolved before merge.

### 15.8 — Production acceptance, merge and mirror

- Apply approved forward-only migrations to production.
- Deploy updated Edge Functions.
- Execute controlled production candidate-communication lifecycle using synthetic verification data only.
- Confirm message persistence, queue linkage, delivery result, history and audit evidence.
- Remove all synthetic records and verify zero residue.
- Require exact-head CI before merge.
- Merge only the reviewed head.
- Require exact merged-main CI and production deployment verification.
- Re-pin Supabase functions to exact merged `main` source where required.
- Verify `RCITCS/RC_IT_CONSULTING_SERVICES` mirrors the exact merge SHA.

**Final gate:** only then mark `Phase 15 — Admin Candidate Communication — COMPLETED & VERIFIED`.

## Explicitly out of scope

Phase 15 does not introduce SMS/WhatsApp recruitment, AI candidate scoring, automated hiring decisions, background checks, payroll/onboarding, e-signatures, a candidate self-service portal or a general calendar product. Phase 16 security-hardening work remains a separate phase.
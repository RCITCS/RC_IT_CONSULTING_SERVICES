# Phase 15 — Admin Candidate Communication — Verification Record

## Status

`IN PROGRESS — source implementation complete through 15.7; production acceptance 15.8 pending.`

Phase 15 must not be marked complete until the production migration/deployment, controlled synthetic lifecycle, cleanup, post-deploy advisors, exact-head merge, exact-main verification and company-mirror checks in 15.8 have all passed.

## Baseline authority

- Phase 14 merged/production-verified `main`: `66d197135483d9c4350af5fb84a16a4fa98cff1d`
- Phase 15 branch: `phase-15-admin-candidate-communication`
- Phase 15 PR: `#76`
- Production Phase-15 migrations/functions are intentionally **not** deployed during 15.0–15.7.

## Completed internal gates

### 15.0 — Baseline and contract audit

Verified Phase-14 closure, primary/mirror baseline, Phase-12 application authority, Phase-13 transactional-email infrastructure and the Phase-14 durable reply pattern before implementation.

### 15.1 — Data model and server contracts

Implemented:

- durable `candidate_messages` ↔ `email_logs` one-to-one correlation
- message-level idempotency
- server-derived candidate recipient
- fixed recruitment sender/reply-to `careers@rcitcs.com`
- bounded service-role-only communication context
- service-role-only durable candidate-message queue RPC
- RLS/browser-deny reassertion
- delivery-state synchronization from authoritative `email_logs`

### 15.2 — Communication read/history

Implemented bounded authenticated history with escaped message content, safe delivery state, maximum 100 messages and no raw provider-error exposure.

### 15.3 — Compose, preview and send

Implemented:

- exact protected `/applications/:id/message` POST boundary
- admin session/super-admin authority
- CSRF validation
- server-side subject/body validation
- mandatory preview before confirmation
- atomic message/email queue persistence before dispatch
- Phase-13 dispatcher reuse
- request-UUID idempotency with conflicting-reuse rejection

### 15.4 — Templates and status workflow

Implemented seven controlled server-side recruitment templates:

- review update
- shortlisted
- interview stage
- assessment stage
- offer-stage update
- rejection/outcome
- withdrawal acknowledgement

Implemented version-locked application-stage transitions with explicit legal transitions, archive/restore semantics, history/audit evidence and strict separation from email delivery. A status transition never sends candidate email automatically.

### 15.5 — Delivery, retry and idempotency

Verified candidate mail inherits Phase-13 reliability:

- maximum five attempts
- 5 / 15 / 60 / 360 minute retry schedule
- stale `sending` recovery after 15 minutes
- terminal dead-letter state after retry exhaustion/permanent failure
- durable provider idempotency key reused across attempts
- exact safe candidate-message delivery-state mirroring

### 15.6 — Admin UI, responsive and accessibility

Implemented:

- protected stage-control UI in the existing Applications workspace
- status and communication as visibly separate operations
- responsive auto-fit layouts for identity, message and workflow controls
- labelled inputs/selects/textareas and help relationships
- preview confirmation semantics
- focusable overflow tables for keyboard users
- escaped long-form candidate content and address wrapping
- explicit stale/invalid-transition/failure states without fake success

## 15.7 — Integration, security and performance verification

### Cross-phase regression

The Phase-15 test suite is included in the normal architecture/full-test chain together with Phase 12, Phase 13 and Phase 14 regression gates. The final exact-head CI result must be recorded before 15.7 is closed.

### Production baseline checked before Phase-15 DDL

At the 15.7 baseline check:

- Supabase Security Advisor: **0 findings**
- Performance Advisor: INFO-only unused-index notices; no security/missing-index blocker identified
- `applications`: **0 rows**
- `candidate_messages`: **0 rows**
- application-linked `email_logs`: **0 rows**
- `applications`, `candidate_messages`, `application_history` and `email_logs`: RLS enabled and forced
- checked recruitment/email tables expose no `anon` or `authenticated` grants; service-role access remains the server boundary

These are pre-deployment observations only. They must be rechecked after Phase-15 DDL in 15.8.

### Query/index review

Phase-15 communication history is bounded to 100 and backed by:

- `candidate_messages(application_id, created_at DESC, id DESC)`
- existing `email_logs(application_id)`
- existing `application_history(application_id, created_at DESC)`

Status mutations use the application primary key plus optimistic version validation; no broad unbounded mutation query is introduced.

### Specialist source review

**Product Owner**

- candidate communication is usable from the existing application workspace
- controlled templates support normal recruitment stages without inventing interview/assessment logistics
- offer-stage template is explicitly not a formal employment offer
- status and communication remain separate actions

**Solution / Software Architecture**

- no second email stack introduced
- `email_logs` remains delivery authority
- candidate-visible messages are durable business records linked to delivery evidence
- public/admin domain separation and Phase-12 private-document boundary remain intact

**Senior Frontend / Accessibility**

- approved enterprise admin visual language preserved
- no new generic dashboard shell/card system introduced
- controls are labelled, keyboard-operable and responsive
- long candidate/email content wraps safely
- status, delivery and failure messages are explicit

**Backend / Database**

- recipient and sender authority is server-side
- queue/message persistence is atomic before dispatch
- request-level idempotency is conflict-safe
- status mutations use optimistic concurrency
- bounded reads and supporting indexes are present
- Phase-15 migrations are forward-only

**QA**

- source tests cover happy paths, invalid inputs, stale versions, illegal transitions, duplicate requests, conflicting idempotency reuse, escaping, retryable/permanent provider failure and delivery-state convergence
- Phase-12/13/14 regression suites remain mandatory

**Security**

- top-level origin/navigation POST checks retained
- route-level admin-role and CSRF checks retained
- browser roles cannot directly access candidate communication tables/RPCs
- service credentials/provider secrets are not exposed to browser code
- raw provider errors are not rendered in the candidate workspace

**Performance**

- communication retrieval is bounded to 100
- application register remains bounded by the existing admin context
- timeline index matches application + descending activity access
- no new unbounded scan is required by Phase-15 UI operations

**Admin End User**

- recruitment stage, message composition, preview, delivery history, private documents and application history remain distinguishable
- destructive/externally visible actions require explicit submit/confirmation rather than page-open side effects

## Mandatory Phase 15.8 production release order

The order below is a correctness requirement because source code and database contracts change together.

1. Freeze the exact reviewed Phase-15 head and require all PR workflows green.
2. Recheck production candidate/application/email counts and current transactional-email health.
3. Apply the four Phase-15 migrations **in timestamp order**:
   - `20260915030000_phase_15_candidate_communication_core.sql`
   - `20260915032000_phase_15_candidate_message_idempotency_hardening.sql`
   - `20260915033000_phase_15_candidate_status_workflow.sql`
   - `20260915034000_phase_15_candidate_delivery_state_convergence.sql`
4. Verify schema, constraints, indexes, RLS, grants and RPC execution privileges.
5. Run Supabase Security and Performance Advisors after DDL. Resolve any new blocking finding before deployment.
6. Deploy **`transactional-email` first** and verify its health reports candidate-admin-reply support.
7. Deploy **`admin-auth` second**. This prevents the new admin UI from enqueueing a template an older dispatcher cannot process.
8. Execute a controlled synthetic candidate lifecycle covering persisted application → status transition → template preview → candidate message queue → delivery evidence → history/audit.
9. Verify duplicate/idempotency behavior and at least one safe failure/retry path without creating duplicate messages.
10. Remove all synthetic application/message/email/history/audit/storage residue created by the acceptance probe and prove zero synthetic residue.
11. Re-run runtime smoke/regression checks and Supabase advisors.
12. Mark PR ready only after the exact reviewed head remains green.
13. Merge only that exact head into `main`.
14. Require exact merged-main CI/deployment verification.
15. Re-pin Supabase Edge Functions to exact merged `main` source if the merge SHA differs from the reviewed PR head.
16. Verify production again after the main-source pin.
17. Verify `RCITCS/RC_IT_CONSULTING_SERVICES` mirrors the exact merged `main` SHA.
18. Only then mark Phase 15 `COMPLETED & VERIFIED`.

## Explicit pending gate

Phase 15.8 has not yet been executed. This document is not a production-completion claim.

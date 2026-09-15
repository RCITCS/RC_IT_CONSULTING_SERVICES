# Phase 16.2 — Critical Audit Coverage

## Coverage rule

Phase 16.2 records security-relevant and administrative state changes at the authority boundary that actually owns the operation. It does not duplicate `email_logs`, `application_history`, `contact_enquiry_activity`, or other domain ledgers.

A domain history table remains authoritative for domain history; `audit_logs` records the security/administrative fact needed for investigation.

## Coverage matrix

| Area | Operation | Audit event / authority | Phase 16.2 status |
| --- | --- | --- | --- |
| Authentication | Login success | `admin_login_success` from admin Edge runtime | Covered |
| Authentication | Login failure | `admin_login_failed` from admin Edge runtime | Covered |
| Authentication | Login throttle threshold | `admin_login_throttle_activated` from DB trigger | Covered |
| Authentication | Bootstrap password activation | `admin_bootstrap_password_activated` | Covered |
| Authentication | Password reset requested | `admin_password_reset_requested` | Covered |
| Authentication | Password-reset throttle threshold | `admin_password_reset_throttle_activated` from DB trigger | Covered |
| Authentication | Password reset completed | `admin_password_reset_completed` | Covered |
| Authentication | Password change success/failure | `admin_password_changed` / `admin_password_change_failed` | Covered |
| Session | Session created | `admin_session_created` transaction-bound trigger | Covered |
| Session | Session revoked | `admin_session_revoked` transaction-bound trigger | Covered |
| Session | Explicit logout | `admin_logout` plus session revocation event | Covered |
| Jobs | Create/update | `job_created` / `job_updated` in job RPC | Covered |
| Jobs | Publish/unpublish/close/archive/restore transitions | `job_<transition>` in job transition RPC | Covered |
| Jobs | Duplicate/delete | `job_duplicated` / `job_deleted` | Covered |
| Candidate intake | Application submitted | `candidate_application_submitted` | Covered |
| Candidate workflow | Status transition | `candidate_application_status_changed` | Covered |
| Candidate communication | Admin message queued | `candidate_message_queued` | Covered |
| Candidate documents | Secure document download | `candidate_document_downloaded` | Covered |
| Contact enquiries | Read/unread | `contact_<event>` | Covered |
| Contact enquiries | Status transition | `contact_status_changed` | Covered |
| Contact enquiries | Assignment/archive/note/reply | corresponding Phase-14 audit event | Covered |

## Deliberate non-duplication

- Transactional email delivery/retry state remains authoritative in `email_logs`; automated provider retry is not duplicated into `audit_logs` unless a future privileged manual retry action is introduced.
- Candidate stage history remains authoritative in `application_history`.
- Contact workflow activity remains authoritative in the contact activity/history model.
- Security-policy denials such as origin/CSRF/method/content-type rejection are request-boundary controls and are hardened/tested in Phase 16.7. They are not falsely reported as completed here.
- Rate-limit **activation** is recorded once per active window rather than logging every subsequent blocked request. This prevents the audit ledger itself from becoming an abuse-amplification vector.

## Session lifecycle authority

Session creation and revocation are database mutations. Phase 16.2 therefore records them with an `AFTER INSERT OR UPDATE OF revoked_at` trigger on `public.sessions`.

Benefits:

- every session creator/revoker is covered, not only one UI route;
- password changes/resets that revoke sessions are covered automatically;
- replacement-login revocation is covered automatically;
- audit and session mutation share the same database transaction.

The trigger writes only session identity/state metadata, hashed IP, and bounded user agent; it never records session tokens or CSRF material.

## Authentication throttle authority

The existing runtime makes rate-limit decisions from `audit_logs`. Phase 16.2 records the point at which the threshold becomes active:

- five failed logins within 15 minutes → one `admin_login_throttle_activated`;
- three password-reset requests within one hour → one `admin_password_reset_throttle_activated`.

Only one activation event is written per IP-hash/window. Raw IP addresses are never stored.

## Phase dependency

Phase 16.3 may now harden `audit_logs` against update/delete/truncate because Phase 16.1 defined the append contract and Phase 16.2 established the critical legitimate event-producing paths. Phase 16.7 still owns request-boundary CSRF/origin/method denial hardening; Phase 16.12 owns the broader abuse/rate-limit review.

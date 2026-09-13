# Phase 13 — Email / Notification Architecture

## Phase 13.1 — Audit & Safety Baseline

Status: **COMPLETED**

Baseline production SHA: `df20f8fc17e9c0f7c555aa36491f57896cc255ed`

This record freezes the safety conditions that must remain true throughout Phase 13.

## Production invariants

- `rcitcs.com` public website and `admin.rcitcs.com` private administration are separate production surfaces and must remain independently deployable.
- Phase 13 must not change approved public/admin layout, navigation, authentication, job-management, application-storage, or document-storage behavior unless a later Phase-13 sub-phase explicitly requires a minimal integration point.
- Existing application/contact persistence remains authoritative. Email delivery must never become the system of record for a submission.
- A provider outage must not destroy an already-persisted application or enquiry.
- Submission responses must never claim an email was delivered unless delivery is actually confirmed.
- No API key, Supabase secret key, reset token, session token, private storage URL, or candidate document may be emitted to browser code, email bodies, application logs, or repository source.
- Existing API keys are reused as configured. Phase 13 does not rotate or replace credentials.
- Browser roles remain denied from `email_logs`, `notifications`, applications, contact enquiries, and password-reset token records.
- Candidate documents remain private and are not attached to transactional email by default.

## Existing safe integration boundaries

### Public contact flow

The public form posts to `/api/contact`. The backend validates and persists the enquiry before returning success. Phase 13 will add durable notification enqueueing after persistence without moving email logic into the browser.

### Candidate application flow

The Phase-12 candidate runtime validates candidate data and private documents, then finalizes the application through the database RPC. The finalize endpoint is already idempotent. Phase 13 must preserve that contract and guarantee that retries do not produce duplicate acknowledgements or internal alerts.

### Administrator password recovery

The Phase-9 auth runtime already writes a queued `admin_password_reset` record to `email_logs` with `token_generation: at_send_time`. Phase 13 must preserve this design: raw reset tokens are generated only when the queued email is dispatched, only the token hash is persisted, and the existing single-use reset flow remains authoritative.

## Existing persistence

Production already contains the Phase-13 data domains `email_logs` and `notifications`. Both are protected from `anon` and `authenticated` browser roles. At the Phase-13.1 baseline there are no email-log, notification, contact-enquiry, application, or password-reset-token records.

## Provider boundary

The repository already contains an email-provider abstraction, but it is intentionally unconfigured. Previous account-level setup established the `rcitcs.com` sending domain and company aliases with Resend/SMTP and Cloudflare Email Routing. Phase 13 will introduce a server-only transactional provider adapter; credentials must remain in runtime secret storage and must never be committed.

## Phase 13 implementation sequence

1. **13.1 Audit & Safety Baseline** — completed by this record.
2. **13.2 Notification Core** — provider adapter, templates, durable queue contract, idempotency and failure model; no business-event wiring yet.
3. **13.3 Administrator Password Reset Delivery** — first real end-to-end transactional email because the queue boundary already exists.
4. **13.4 Candidate Application Notifications** — candidate acknowledgement and internal recruitment alert.
5. **13.5 Contact Notifications** — visitor acknowledgement and internal contact alert; no Phase-14 enquiry-management UI.
6. **13.6 Notification Reliability** — retry/recovery, delivery logging and operational diagnostics.
7. **13.7 Production Acceptance & Closure** — full regression/security/production delivery verification.

No later sub-phase starts until the current sub-phase is completed and verified.

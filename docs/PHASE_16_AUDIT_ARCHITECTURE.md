# Phase 16.1 — Audit Logging Architecture

Status: implementation gate for Phase 16.1.

## Purpose

Phase 16.1 defines one authoritative audit-event model for RC IT Services. The audit ledger records security-relevant and administrative facts; it is **not a second source of truth** for jobs, applications, enquiries, messages, sessions, email delivery, or documents.

Phase 16.2 will complete event coverage. Phase 16.3 will enforce tamper resistance and append-only privileges. Those later gates must consume this contract rather than inventing a second audit format.

## Authoritative event contract — version 1

Every audit row has:

- `id` — immutable event UUID.
- `admin_id` — authenticated administrator actor when one exists; nullable for unauthenticated or system activity.
- `action` — stable machine event key (`lowercase`, digits, `.`, `_`, `-`; maximum 128 characters).
- `entity_type` — stable resource/security domain key; maximum 64 characters.
- `entity_id` — target UUID when the resource has one.
- `request_id` — server-generated correlation UUID when the operation belongs to an inbound request or controlled workflow.
- `session_id` — authenticated admin session when available. A session may only be attached to its owning admin.
- `outcome` — `success`, `failure`, or `denied`.
- `event_version` — schema version for the event contract. Phase 16 uses version `1`.
- `ip_hash` — optional SHA-256 hash; never store a raw client IP.
- `user_agent` — optional, bounded to 500 characters.
- `before_data` / `after_data` — minimal redacted state required to explain a mutation.
- `metadata` — bounded non-authoritative context only.
- `created_at` — authoritative database timestamp.

The database remains authoritative for timestamps and identifiers.

## Data-minimization rules

Audit events must contain the **minimum state needed** to explain who did what, to which resource, with what outcome, and when.

Never put any of the following in `before_data`, `after_data`, or `metadata`:

- passwords or password hashes;
- reset/session/CSRF tokens or token hashes;
- cookies or Authorization headers;
- API/service-role credentials or application secrets;
- candidate message bodies or transactional-email bodies;
- resume, cover-letter, or other document contents;
- raw client IP addresses;
- candidate/contact PII that is not required to identify the target event.

Phase 16.1 adds a recursive sensitive-key guard to the canonical writer. Event-specific code in later gates must use explicit allowlisted audit payloads rather than serializing full request bodies or arbitrary database rows.

Job content is not secret, but future job audit events should still prefer changed fields or compact state over whole-row snapshots.

## Canonical write path

`public.append_audit_event(...)` is the canonical service-side append contract.

Properties:

- `SECURITY INVOKER`.
- `search_path = ''`.
- executable only by `service_role` (plus database owner semantics).
- validates action/entity/outcome formats.
- validates SHA-256 IP-hash shape.
- validates object-shaped JSON payloads.
- bounds JSON sizes.
- rejects sensitive-key names recursively.
- validates that `session_id` belongs to `admin_id`.
- writes `event_version = 1`.
- returns the created audit-event UUID.

Existing transactional database RPCs may continue to insert audit rows during the 16.1 transition. Phase 16.2 must converge critical event coverage onto this event model. Phase 16.3 will then remove unnecessary mutation privileges while preserving required append paths.

## Correlation rule

One server-handled request should generate one correlation UUID and reuse it for all audit events caused by that request. Existing business idempotency keys remain domain-specific and must not be replaced by the audit `request_id`.

The audit request ID is correlation context, not authorization and not an idempotency primitive.

## Outcome semantics

- `success` — the intended protected/admin operation completed.
- `failure` — the attempted operation did not complete because credentials, validation, provider/runtime, or other execution failed.
- `denied` — security policy deliberately rejected the request (authorization, CSRF/origin, throttling, forbidden transition, etc.).

An audit write itself must never convert a failed business operation into a `success` event.

## Authority and RLS

Production baseline before this gate already has:

- RLS enabled on `audit_logs`;
- FORCE RLS enabled;
- explicit browser-deny policy for `anon` and `authenticated`;
- no browser table grants;
- service-side authority.

Table grants and RLS are separate controls. Phase 16.3 is responsible for tightening the current broad `service_role` table mutation grants after all legitimate write paths are understood and tested.

## Index strategy

Phase 16.1 preserves the existing event/action/entity/security-throttle indexes and adds:

- `(request_id, created_at desc)` for request correlation;
- `(session_id, created_at desc)` for session-scoped investigation.

Later audit-viewer pagination must use bounded indexed queries; it must not introduce unbounded scans.

## Compatibility

Historical rows are retained. Existing `admin_login_failed` rows are backfilled to `outcome = 'failure'`; other historical rows default to `success`. No historical migration is rewritten.

The migration is **forward-only** and preserves all Phase 15 candidate-communication controls.

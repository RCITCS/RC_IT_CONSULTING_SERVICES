# Phase 16.3 — Audit Integrity and Tamper Resistance

## Decision

`public.audit_logs` is an append-only ledger for application/service roles.

Production originally granted `service_role` every table mutation privilege, including `UPDATE`, `DELETE`, and `TRUNCATE`. RLS protected browser roles, but RLS alone does not make the service-side ledger immutable and does not protect `TRUNCATE`.

Phase 16.3 narrows the service authority to exactly:

- `SELECT` — required for bounded security counters and future controlled audit views;
- `INSERT` — required by transaction-bound domain/session audit writers.

`service_role` no longer has `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, or `TRIGGER` privilege on `audit_logs`.

## Defense in depth

Two database triggers reject row mutation and table truncation for any non-`postgres` current role. This remains protective if a future grant accidentally broadens service privileges.

The database owner is intentionally retained as migration/recovery authority. Application code must never run as the database owner.

## Referential integrity

Audit actor and session references use `ON DELETE RESTRICT` rather than `SET NULL`.

This prevents later deletion of an administrator/session from silently rewriting historical audit identity. Existing application behavior revokes sessions rather than deleting them, so this preserves the current runtime model.

If a future retention policy requires session/admin deletion, it must be designed explicitly rather than mutating historical audit rows as a side effect.

## Transaction consistency

Business RPCs that insert audit rows remain in the same transaction as their successful mutation. If the business transaction rolls back, its audit insert rolls back. No separate fake-success audit is created.

Session lifecycle audit events are trigger-bound to their session mutation and therefore share that transaction as well.

## Browser boundary

`anon` and `authenticated` retain no direct table privileges and remain denied by FORCE RLS. Phase 16.3 does not create any browser-accessible audit mutation RPC.

## Non-goals

- Retention/export policy is not invented here.
- Audit viewer UI is Phase 16.4.
- General RBAC/RPC privilege review is Phase 16.8/16.9.

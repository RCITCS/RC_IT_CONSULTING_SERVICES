# Phase 16.4 — Audit Viewer / Security Activity UI

## Product decision

The Security workspace exposes **recent security activity**, not an unrestricted audit-data explorer.

The durable `audit_logs` table remains the full ledger. The UI receives a maximum of 100 newest events through a server-only redacted RPC and presents them in 25-row pages plus structured investigation views.

This design deliberately avoids:

- browser access to `audit_logs`;
- unrestricted export;
- free-text queries over arbitrary audit payloads;
- raw IP hashes or user agents;
- full internal UUIDs;
- before/after JSON or metadata payloads;
- message, email, resume, cover-letter, or document content;
- CSP weakening or client-side scripts.

## Authority

`get_admin_audit_activity(uuid, integer)`:

- is `SECURITY INVOKER`;
- requires an active `super_admin` whose email is the approved company administrator identity;
- can execute only through `service_role`/database-owner semantics;
- caps requested results at 100 regardless of caller input;
- returns a fixed redacted projection.

The existing admin-auth Edge Function performs the authenticated session check before the Security page is rendered. The Security page then uses the server credential to request the bounded projection. No service credential reaches HTML.

## Redacted projection

Permitted fields:

- eight-character event reference;
- timestamp;
- stable action;
- entity type;
- eight-character entity reference when present;
- outcome;
- non-sensitive actor display label;
- eight-character request/session correlation references when present;
- boolean indicating that network context exists;
- bounded source label.

The RPC does not project the original `id`, `entity_id`, `admin_id`, `request_id`, `session_id`, `ip_hash`, `user_agent`, `before_data`, `after_data`, or raw `metadata` object.

## UI organization

The Security page preserves the existing password/session control layout and adds:

- denied-event count;
- failed-event count;
- system/unauthenticated-event count;
- Denied and failed view;
- Authentication and sessions view;
- Operational administration view;
- 25-row recent-ledger pages.

The views are server-rendered and usable without JavaScript. Table wrappers are keyboard-focusable for horizontal overflow on narrow screens.

## Performance

The database uses `(created_at desc, id desc)` for the default bounded recent-event read. The server requests at most 100 rows and has an 8-second upstream timeout. The UI never performs an unbounded count or download.

When more than 100 durable events exist, the UI explicitly indicates that older events remain in the ledger but are not bulk-exposed through the workspace.

## Failure behavior

If the bounded projection cannot be authorized or retrieved, the password/session controls remain available and the activity section fails closed with an unavailable notice. No raw fallback table query is attempted.

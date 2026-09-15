# Phase 16.4 — Audit Viewer / Security Activity UI

## Product decision

The Security workspace exposes a **bounded, filterable security-activity viewer**, not an unrestricted audit-data explorer.

The durable `audit_logs` table remains the authoritative ledger. The browser receives only a fixed redacted projection through a server-authorized RPC. The viewer uses 25-row server pages, permits at most 20 pages per query, and never provides unrestricted export.

The viewer supports the Phase 16.4 investigation controls approved for this project:

- prefix search across stable action/resource-area keys;
- exact action filtering;
- exact resource/entity-type filtering;
- outcome filtering (`success`, `failure`, `denied`);
- actor filtering (administrator vs. system/unauthenticated);
- Europe/London date-range filtering;
- server-side pagination.

This design deliberately avoids:

- browser access to `audit_logs`;
- unrestricted export or bulk download;
- free-text queries over arbitrary audit payloads;
- raw IP hashes or user agents;
- full internal UUIDs;
- before/after JSON or raw metadata payloads;
- message, email, resume, cover-letter, or document content;
- CSP weakening or client-side scripts.

## Authority

`get_admin_audit_activity_page(...)`:

- is `SECURITY INVOKER`;
- requires the active `super_admin` whose email is the approved company administrator identity;
- can execute only through `service_role`/database-owner semantics;
- rejects pages outside `1..20`;
- rejects page sizes outside `1..50` (the admin UI always requests 25);
- validates action/resource/outcome/actor/search inputs;
- caps explicit date windows at 366 days;
- uses Europe/London day boundaries;
- returns a fixed redacted projection.

The existing `get_admin_audit_activity(uuid, integer)` RPC remains as historical Phase 16.4 migration state. The forward-only convergence migration introduces the filtered/paginated RPC rather than rewriting already-applied migration history.

The admin-auth Edge Function performs authenticated-session and super-admin checks before the Security page is rendered. It derives the administrator ID from the authenticated session; the browser cannot choose database authority. The Edge Function then uses the server credential to request the filtered projection. No service credential reaches HTML.

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
- validated/bounded source label.

The RPC does not project the original `id`, `entity_id`, `admin_id`, `request_id`, `session_id`, `ip_hash`, `user_agent`, `before_data`, `after_data`, or raw `metadata` object.

## Filter and pagination contract

The UI sanitizes query parameters before calling the server adapter, and the database independently validates them. Browser values are never interpolated into SQL.

- `q`: prefix-only action/resource search, maximum 64 characters and stable-key characters only.
- `action`: exact stable action key, maximum 128 characters.
- `entity`: exact stable entity/resource key, maximum 64 characters.
- `outcome`: `success`, `failure`, `denied`, or all.
- `actor`: `administrator`, `system`, or all.
- `from` / `to`: dates interpreted using Europe/London boundaries.
- `page`: 1–20.
- page size: fixed at 25 by the application.

The database uses `LIMIT page_size + 1` to determine whether a next page exists. Pagination is intentionally bounded; it is not an export mechanism.

## UI organization

The Security page preserves the existing password/session-control layout and adds:

- an accessible filter form;
- page-local denied, failure, and system-event indicators;
- a six-column redacted activity table;
- keyboard-focusable horizontal table scrolling;
- previous/next server-page navigation;
- explicit reset of all filters.

The page remains server-rendered and fully usable without JavaScript.

## Performance

Indexes support the default chronology and stable-key filtering:

- `(created_at desc, id desc)`;
- action prefix + chronology;
- entity-type prefix + chronology;
- existing action/entity/security indexes from earlier gates.

The server requests exactly 25 visible rows per page and has an 8-second upstream timeout. A query cannot move beyond page 20 and cannot request more than 50 rows per page at the RPC boundary.

## Failure behavior

If the projection cannot be authorized or retrieved, the password/session controls remain available and the activity section fails closed with an unavailable notice. No raw fallback table query is attempted.

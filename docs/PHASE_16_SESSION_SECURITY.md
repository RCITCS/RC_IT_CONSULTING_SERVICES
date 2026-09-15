# Phase 16.6 — Session Security Hardening

## Production baseline

The existing custom administrator session model remains the approved architecture. Session and CSRF secrets are generated from 32-byte CSPRNG values in the Edge Function, only SHA-256 hashes are stored in PostgreSQL, browser cookies are `HttpOnly`, `Secure`, `SameSite=Strict`, and the runtime uses an 8-hour absolute TTL plus a 30-minute idle cutoff.

Production history before convergence was clean:

- 28 historical sessions;
- 1 current unrevoked session;
- 0 null `last_seen_at` values;
- 0 malformed stored network hashes;
- 0 user agents over 500 characters;
- 0 sessions over 8 hours absolute lifetime;
- 0 `last_seen_at` values outside creation/expiry bounds;
- maximum observed lifetime just under 8 hours.

The review identified that several runtime invariants were not independently enforced by the table, and the historical one-active-session unique index was no longer present.

## Hardening

Phase 16.6 adds forward-only database enforcement for:

- non-null `last_seen_at`;
- optional network hash as 64-character lowercase SHA-256 hex;
- user agent at most 500 characters;
- absolute session lifetime at most 8 hours from creation;
- `last_seen_at` between creation and absolute expiry;
- revocation timestamp not before session creation;
- at most one unrevoked session per administrator through `sessions_one_active_per_admin_uidx`.

`create_admin_session(...)` remains `SECURITY INVOKER` and service-role-only. It independently validates token/CSRF hash shape, network-hash shape, user-agent length, <=8-hour expiry and the approved active super-admin identity. Before inserting a newly generated session it revokes any previous unrevoked session. The unique partial index provides the concurrency/fixation backstop if login requests race.

`get_admin_session_context(...)` remains `SECURITY INVOKER` and service-role-only. It now:

- rejects malformed token hashes before lookup;
- requires unrevoked state and future absolute expiry;
- independently requires the approved active super-admin identity;
- clamps the caller-provided idle cutoff so it can never extend the authoritative 30-minute idle window;
- refreshes `last_seen_at` only after five minutes of activity and only if the session is still unrevoked, unexpired and inside the idle window;
- never updates `expires_at`, so activity cannot slide the absolute eight-hour boundary.

## Fixation / cookie boundary

A successful login generates fresh independent session and CSRF values using `crypto.getRandomValues(new Uint8Array(32))`. Existing active sessions are revoked before the new session is persisted. The browser receives only the raw opaque values in protected cookies; PostgreSQL stores SHA-256 hashes.

Current session cookies retain:

- `HttpOnly`;
- `Secure`;
- `SameSite=Strict`;
- bounded `Max-Age`;
- `Priority=High`;
- admin-path scoping where the direct Supabase route is used.

Recovery cookies intentionally remain a separate password-reset boundary and are reviewed with CSRF/origin behavior in Phase 16.7.

## Scope boundary

Phase 16.6 does not redesign authentication or introduce a second session provider. Phase 16.7 owns CSRF/origin/mutation hardening; Phase 16.8/16.9 own broader authorization/grant review; Phase 16.10 owns deployed Edge Function inventory and helper cleanup.

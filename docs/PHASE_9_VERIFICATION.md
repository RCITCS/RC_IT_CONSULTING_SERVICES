# Phase 9 Verification — Admin Authentication and Security

## Scope

Phase 9 implements the private authentication/security foundation only:

- one authorised active super_admin
- no public registration path
- bcrypt password storage behind service-role-only PostgreSQL functions
- opaque sessions stored only as SHA-256 hashes
- CSRF token hashes and same-origin checks
- eight-hour absolute and thirty-minute idle expiry
- session revocation
- atomic single-session replacement
- sign-in and reset-request throttling
- password change and password-reset infrastructure
- atomic password change and single-use reset-token consumption
- audit logging
- forced RLS, explicit browser-deny policies and revoked browser grants
- no-store, noindex and defensive response headers

Phase-10 dashboard KPIs and Phase-11 recruitment management are explicitly excluded.

## Production reconciliation

The repository migration is a consolidated, idempotent final-state migration. It reconciles the Phase-8 repository baseline with the final Phase-9 production table, constraint, index, policy and RPC contracts without reproducing temporary pg_net verification infrastructure.

The existing production project was inspected read-only before implementation:

- project status: healthy
- PostgreSQL: 17
- active authorised super administrators: 1
- other active administrators: 0
- active sessions at inspection: 0
- active password-reset tokens at inspection: 0
- Supabase security advisor findings: 0

Production already contains later Phase-10 dashboard work. This Phase-9 source deliberately excludes that code and does not roll production backward.

The consolidated migration and authentication RPCs were executed against the production PostgreSQL schema inside an explicit transaction. Password verification, atomic session replacement, single-use reset consumption, password replacement and session revocation passed. The transaction was rolled back, and follow-up inspection confirmed that no test password, session, reset token, function or migration change persisted.

## Credential handling

No plaintext password, bootstrap verifier, API key or reset token is committed.

The one-time bootstrap verifier is read from ADMIN_BOOTSTRAP_PASSWORD_VERIFIER, a runtime-only secret. This corrects the deployed prototype's hardcoded derived verifier without exposing or reproducing that credential material in Git history.

## Review corrections

The hosted prototype performed session replacement, password change and reset-token consumption as separate HTTP/database operations. Those sequences allowed narrow concurrency races. The repository closure moves each sequence into a service-role-only PostgreSQL transaction boundary and adds a unique active-session invariant.

## Verification gates

The Phase-9 checks prove:

- cryptographically random 256-bit tokens and SHA-256 token hashing
- PBKDF2 bootstrap-verifier success and failure behavior using test-only generated material
- secure cookie attributes
- absolute/idle expiry contracts
- same-origin and CSRF enforcement
- generic login/reset responses
- throttling contracts and supporting indexes
- bcrypt cost and password-policy boundaries
- service-role-only RPC execution
- RLS/browser-role isolation
- no Phase-10 dashboard imports, RPC calls, metrics or UI content
- no temporary HTTP-verification extension
- no embedded bootstrap credential material

The standard repository architecture, regression, build, SEO and performance suites remain required before merge.

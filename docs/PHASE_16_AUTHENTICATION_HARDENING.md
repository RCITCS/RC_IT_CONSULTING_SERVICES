# Phase 16.5 — Authentication Hardening Review

## Production findings

The Phase-9 authentication design remains structurally sound: one active approved super administrator, SHA-256 token/CSRF hashes, bcrypt cost-12 password storage, 8-hour application session TTL, 30-minute idle cutoff in the runtime, generic login errors, hashed single-use reset tokens and session revocation after password changes/resets.

The review found four historical database/runtime inconsistencies plus one reset-concurrency gap:

1. `set_admin_password` still accepted the original 10-character bootstrap minimum instead of the current 12-character policy.
2. Bootstrap/password verification RPCs did not themselves pin the approved super-admin identity as tightly as later functions.
3. `rcitcs_verify_admin_password` used an obsolete raw-password bcrypt contract.
4. `rcitcs_change_admin_password` used the same obsolete contract and an old 10-character policy.
5. Reset issuance consumed earlier unused tokens but did not have a database uniqueness invariant preventing two racing issuance transactions from both leaving an unused token.

## Hardening

Phase 16.5 converges the database authority layer so that:

- bootstrap requires the current 12-character strong-password policy;
- bootstrap works only for the approved active `super_admin` and only while `password_hash is null`;
- password verification independently requires the approved active RC IT Services super-admin identity;
- password verification accepts at most 256 characters;
- current-password input for password change is independently bounded to 1–256 characters at the database boundary;
- reset-token issuance requires the approved active super-admin;
- token hash and optional request-IP hash must be 64-character lower-case hexadecimal SHA-256 values;
- reset expiry is capped at 30 minutes both by the issuance RPC and a table-level lifetime constraint;
- at most one unused reset token can exist for an administrator, enforced by a unique partial index;
- obsolete `rcitcs_*` verify/change RPCs are no longer executable by `service_role` or browser roles;
- current authentication helpers remain `SECURITY INVOKER` and browser execution remains denied.

The current runtime continues to use SHA-256 prehash + bcrypt cost 12 for password storage/verification. No plaintext credential is stored.

## Current production evidence

- total administrators: 1;
- active administrators: 1;
- active super administrators: 1;
- approved active super administrators: 1;
- administrators with a password hash: 1;
- stored password hash prefix: bcrypt `$2a$12$`;
- stored password hash length: 60;
- obsolete verify/change service execution: disabled;
- browser execution of current password helpers: disabled;
- current password helpers execute only through the trusted service/database boundary;
- historical reset tokens: 5;
- unused reset tokens: 0;
- active unexpired reset tokens: 0;
- historical requested-IP hashes violating the SHA-256 shape: 0;
- historical reset lifetimes above 30 minutes: 0;
- production reset-lifecycle constraint test rejected malformed IP evidence, an over-30-minute token and a second unused token for the same admin inside a rollback-only transaction;
- post-test residue: 0.

The forward-only production migrations are:

- `phase_16_authentication_hardening`;
- `phase_16_authentication_reset_convergence`.

The second migration intentionally adds table-level invariants and the concurrency guard rather than rewriting the already-applied first migration.

## Scope boundary

Phase 16.5 owns administrator identity, password storage/verification, reset-token issuance/consumption and authentication error/throttle behavior.

Phase 16.6 owns deeper session-expiry, fixation, rotation and revocation hardening. Phase 16.7 owns CSRF/origin/mutation boundaries. Phase 16.8/16.9 own the broader authorization and database privilege review.

# Phase 16.5 — Authentication Hardening Review

## Production findings

The Phase-9 authentication design remains structurally sound: one active approved super administrator, SHA-256 token/CSRF hashes, bcrypt cost-12 password storage, 8-hour application session TTL, 30-minute idle cutoff in the runtime, generic login errors, hashed single-use reset tokens and session revocation after password changes/resets.

The review found two old database-layer inconsistencies and two obsolete compatibility RPCs:

1. `set_admin_password` still accepted the original 10-character bootstrap minimum instead of the current 12-character policy.
2. Bootstrap/password verification RPCs did not themselves pin the approved super-admin identity as tightly as later functions.
3. `rcitcs_verify_admin_password` used an obsolete raw-password bcrypt contract.
4. `rcitcs_change_admin_password` used the same obsolete contract and an old 10-character policy.

## Hardening

Phase 16.5 converges the database authority layer so that:

- bootstrap requires the current 12-character strong-password policy;
- bootstrap works only for the approved active `super_admin` and only while `password_hash is null`;
- password verification independently requires the approved active RC IT Services super-admin identity;
- password verification accepts at most 256 characters;
- reset-token issuance requires the approved active super-admin;
- token hash and optional request-IP hash must be 64-character lower-case hexadecimal SHA-256 values;
- reset expiry remains capped at 30 minutes;
- obsolete `rcitcs_*` verify/change RPCs are no longer executable by `service_role` or browser roles.

The current runtime continues to use SHA-256 prehash + bcrypt cost 12 for password storage/verification. No plaintext credential is stored.

## Current production evidence

- total administrators: 1;
- active super administrators: 1;
- approved active super administrators: 1;
- stored password hash prefix: bcrypt `$2a$12$`;
- stored password hash length: 60;
- obsolete verify/change service execution: disabled;
- browser execution of current password verification: disabled;
- current password verification service execution: enabled.

Phase 16.6 owns deeper session-expiry/fixation/revocation hardening. Phase 16.7 owns CSRF/origin/mutation boundaries.

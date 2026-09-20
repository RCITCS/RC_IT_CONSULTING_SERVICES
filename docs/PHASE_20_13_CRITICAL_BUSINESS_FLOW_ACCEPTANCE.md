# Phase 20.13 Critical Business-Flow End-to-End Acceptance

## Production-safe acceptance model

Phase 20.13 uses real production runtime and persistence boundaries without leaving fake business records or sending unintended customer-facing notifications.

The certification combines:

- real production browser/runtime checks for careers, a published job, application entry, contact entry, health and admin-private surfaces;
- hostile/invalid mutation checks against the live candidate and contact gateways;
- real production PostgreSQL RPC execution inside a transaction followed by `ROLLBACK`;
- before/after residual-canary checks proving zero fake job, application, contact or email rows remain.

## Transactional production canary already executed

A rollback-only production transaction successfully exercised:

1. `admin_save_job`
2. `admin_transition_job` publish
3. `admin_transition_job` unpublish
4. real candidate application persistence
5. `admin_transition_candidate_application`
6. real contact enquiry persistence
7. `admin_transition_contact_enquiry`
8. `admin_add_contact_enquiry_note`

The transaction then rolled back.

Post-rollback residual counts:

- job canaries: 0
- application canaries: 0
- contact canaries: 0
- email canaries: 0

This proves the real production persistence/RPC authority without fake-success mocks and without polluting production.

## Closure rule

20.13 closes only after the exact PR head passes inherited CI plus the dedicated certification, merges with an expected-head guard, the merged main SHA reaches production, the production-safe workflow passes on that SHA, and the rollback canary is repeated against the post-merge production database with zero residual rows.

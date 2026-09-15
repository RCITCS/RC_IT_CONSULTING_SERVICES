# Phase 16.7 — Request Integrity / CSRF / Origin / Mutation Boundaries

## Review result

The admin runtime already had layered server authority: only GET/POST were accepted, proxied browser navigation required Fetch Metadata/origin validation, authenticated modules independently required active `super_admin` authority, all protected mutations verified CSRF against the server-stored hash, and request bodies were bounded before form parsing.

The review identified two missing central fail-closed controls:

1. the top-level runtime did not enumerate every POST-capable route before dispatch;
2. the top-level runtime did not reject unsupported POST media types before `formData()` parsing.

## Convergence

The admin runtime now:

- accepts POST only on the explicit authentication, password, Jobs, Applications and Contacts mutation routes;
- rejects unknown POST routes with `405 Method Not Allowed` before business logic;
- accepts only `application/x-www-form-urlencoded` and `multipart/form-data` POST bodies;
- rejects unsupported POST media types with HTTP 415;
- evaluates the mutation allowlist, media type, origin/fetch-metadata and body-size gates in fail-closed order;
- preserves the existing 128 KiB Jobs body cap and 32 KiB cap for other admin POSTs;
- preserves independent super-admin and CSRF validation inside Jobs, Applications and Contacts;
- preserves explicit mutation enumerations for job transitions, candidate status/message paths and contact actions;
- does not add wildcard CORS or weaken the existing private admin response model.

## Boundary model

A valid mutation therefore requires all applicable controls to succeed:

`known POST route → supported form media type → trusted browser/origin boundary → bounded request → active server-side session → super_admin role → CSRF hash match → route-specific validation/RPC authority`

Candidate email sends retain the separate mandatory preview-proof requirement from Phase 15.

## Phase boundary

16.8 owns rate-limit/abuse-resistance review. This module does not broaden throttling policy or introduce Phase-17 domain changes.

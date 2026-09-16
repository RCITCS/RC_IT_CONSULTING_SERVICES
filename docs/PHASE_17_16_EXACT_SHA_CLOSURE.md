# Phase 17.16 — Cleanup, exact-SHA merge and production closure

Status: **IMPLEMENTED — pre-merge exact-head verification pending**

Depends on Phase 17.15 closure SHA `bfaa45326170bbd2da6c355c995278bcdd72cfa1`.

## Purpose

17.16 is the only overall Phase-17 closure gate. Earlier module closure means the branch implementation for that module is accepted; it does not mean the unmerged topology is already active in production.

## Pre-merge readiness

Before PR #85 may merge:

- Phase 17.1 through 17.15 evidence must exist and remain internally consistent;
- the final branch head must pass the complete inherited CI suite plus this 17.16 gate;
- `docs/DOMAIN_CUTOVER.md` must describe the Phase-17 architecture rather than the superseded workers.dev fallback;
- PR #85 must describe the final module status and outstanding production activation gates;
- the required DMARC TXT record must be publicly resolvable before a merge is allowed, because main-only security workflows intentionally fail without it;
- the merge must use an exact verified head SHA, never an unreviewed moving branch tip.

## Exact merge and mirror contract

Primary `main` is the source repository authority. After merge:

1. record the resulting primary main SHA;
2. the mirror workflow pushes that exact SHA to `RCITCS/RC_IT_CONSULTING_SERVICES` `main`;
3. final closure requires primary and mirror main SHAs to be identical;
4. a branch-only or cross-account Cloudflare build cannot substitute for mirror convergence.

## Production activation contract

The exact merged main SHA must become observable in the public page deployment marker on `https://rcitcs.com`.

The final runtime topology must simultaneously prove:

- `rcitcs.com` serves the public website over HTTPS with HSTS;
- `www.rcitcs.com` permanently redirects to the apex while preserving path/query;
- public `/admin` GET/HEAD redirects to `admin.rcitcs.com`;
- public `/admin` mutations fail closed without a redirect;
- `admin.rcitcs.com` serves HTML from the production-admin boundary with `X-RC-Admin-Environment: production`, no-store, noindex, CSP, framing protection and HSTS;
- `admin-staging.rcitcs.com` returns `503` with `X-RC-Admin-Environment: staging` and `X-RC-Admin-Staging-State: intentionally-unavailable`;
- `rc-it-consulting-services.rcitcservices.workers.dev` does not serve the public website;
- sensitive direct backend URLs are not accepted browser authorities;
- public mail MX/SPF, Resend DKIM/return-path/tracking and exactly one DMARC policy coexist.

## Security closure

After production activation, Supabase Security Advisor must be queried directly for the production RC IT project. Overall Phase 17 remains open if a release-relevant security advisory remains unresolved.

This advisor check is deliberately not faked inside GitHub CI because it requires the authenticated Supabase control plane. The final closure record must capture the actual advisor result.

## Stale cross-account Cloudflare integration

The `Workers Builds: rcitcservices` GitHub App check targets Cloudflare account `20d349f3f75ab611adb3f987188636e7`, not the authoritative RC IT account `3fdd024f6fbc25c03ed4481352576540`.

It is classified as non-authoritative legacy integration evidence. It must not be used as RC IT deployment proof. It also must not be deleted blindly because unrelated workloads may depend on that account/integration. Phase 17 can close when the RC IT domain has no dependency on it and the authoritative production/runtime gates pass; destructive cleanup of unrelated ownership is not required.

## Final closure rule

Phase 17 may be marked **CLOSED** only after all of these are true on the exact merged main SHA:

1. exact-head branch CI passed before merge;
2. exact-SHA merge completed;
3. primary and mirror main SHAs match;
4. authoritative production domain/runtime checks passed;
5. DMARC and existing email DNS checks passed together;
6. alternate ingress shutdown checks passed;
7. Supabase Security Advisor has no unresolved release-blocking security finding;
8. the closure document is updated with the actual merge SHA and verification evidence.

Until then the correct overall status is **17.16 OPEN** even when every implementation module is branch-complete.

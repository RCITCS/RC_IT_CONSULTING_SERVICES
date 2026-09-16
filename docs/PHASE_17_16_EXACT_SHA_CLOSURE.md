# Phase 17.16 — Cleanup, exact-SHA merge and production closure

Status: **IMPLEMENTED — 17.16 OPEN pending exact-head DNS validation, merge and production convergence**

Depends on Phase 17.15 closure SHA `bfaa45326170bbd2da6c355c995278bcdd72cfa1`.

## Purpose

17.16 is the only overall Phase-17 closure gate. Earlier module closure means the branch implementation for that module is accepted; it does not mean the unmerged topology is already active in production.

## Pre-merge readiness

Before PR #85 may merge:

- Phase 17.1 through 17.15 evidence must exist and remain internally consistent;
- the final branch head must pass the complete inherited CI suite plus this 17.16 gate;
- `docs/DOMAIN_CUTOVER.md` must describe the Phase-17 architecture rather than the superseded workers.dev fallback;
- PR #85 must describe the final module status and outstanding production activation gates;
- the required DMARC TXT record at `_dmarc.rcitcs.com` must be publicly resolvable before a merge is allowed, because final-main security workflows intentionally fail without it;
- the merge must use an exact verified head SHA, never an unreviewed moving branch tip.

The required initial DMARC value is:

`v=DMARC1; p=none; rua=mailto:dmarc@rcitcs.com; adkim=s; aspf=s; pct=100`

## DMARC activation authority evidence

A guarded GitHub Actions activation probe was run against the Phase-17 branch to determine whether an already-authorized Cloudflare API path existed in repository secrets. It checked only the conventional `CLOUDFLARE_API_TOKEN` and `CF_API_TOKEN` secret names and was designed to verify the exact RC IT account/zone before any write, create the record only when absent, and refuse to overwrite an existing or duplicate policy.

The probe found **neither repository secret configured**. It terminated before any Cloudflare API request or DNS mutation. The temporary probe workflow was then removed so it cannot remain as a permanent failing or privileged workflow.

Therefore there is no repository-authorized DNS mutation path available to this closure process. Publication of `_dmarc.rcitcs.com` had to occur in the authoritative Cloudflare control plane (account `3fdd024f6fbc25c03ed4481352576540`, zone `cf815244b9dbd51a490747f597867c68`). This requirement was not waived.

On September 16, 2026, the authoritative client Cloudflare DNS control plane showed the new TXT record `_dmarc.rcitcs.com` saved with TTL `Auto`, increasing the zone record count from 14 to 15. The configured value is the required Phase-17 policy above. Existing Cloudflare Email Routing MX records, apex SPF, Resend return-path/SPF, DKIM and tracking records remained present and were not modified. Public resolver validation remains mandatory on the exact branch head before merge.

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

The production Supabase project was identified through the authenticated Supabase control plane as:

- project: `RCITCS`
- project ref: `chsizmffzpxcqhaptjeu`
- region: `eu-west-2`
- project status at the pre-merge check: `ACTIVE_HEALTHY`

An authenticated **pre-merge** Supabase Security Advisor query returned **zero security lints**. This is real control-plane evidence, not a simulated CI result.

The Security Advisor must be queried again after the final production/main convergence. Overall Phase 17 remains open if a release-relevant security advisory appears at final closure.

The advisor check is deliberately not faked inside GitHub CI because it requires the authenticated Supabase control plane. The final closure record must capture the post-convergence result as well.

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
7. post-convergence Supabase Security Advisor has no unresolved release-blocking security finding;
8. the closure document is updated with the actual final main SHA and verification evidence.

Until then the correct overall status is **17.16 OPEN** even when every implementation module is branch-complete.

# Phase 17.4 — Production Admin Domain (`admin.rcitcs.com`)

Status: **COMPLETE — production-admin contract and live acceptance passed; ownership cutover remains 17.7**

Depends on: Phase 17.3 branch-level closure.

## Objective

Lock `https://admin.rcitcs.com` as the canonical production administration hostname and prove that it remains a dedicated, private, hardened admin surface.

This module does **not** perform the Cloudflare ownership cutover. The authoritative Phase-17 baseline proved that `admin.rcitcs.com` is still represented by overlapping Cloudflare ownership mechanisms. That convergence is Module 17.7.

## Canonical production contract

The intended production-admin Worker is source-controlled as:

- Worker: `rcitcs-admin-production`
- Wrangler config: `wrangler.admin-production.jsonc`
- entry point: `worker/admin-only.js`
- Custom Domain: `admin.rcitcs.com`
- `workers_dev`: disabled
- `keep_vars`: enabled

The production config owns exactly one hostname: `admin.rcitcs.com`.

It must not claim:

- `admin-staging.rcitcs.com`;
- `rcitcs.com`;
- `www.rcitcs.com`;
- any `workers.dev` production URL.

## Existing control-plane overlap

Phase 17.1 established that the current client Cloudflare account does not yet have an active Worker application named `rcitcs-admin-production`.

The connected `rcitcs-admin-staging` Worker currently owns both:

- `admin.rcitcs.com`;
- `admin-staging.rcitcs.com`.

The baseline also recorded the historical/public Worker Route overlap affecting `admin.rcitcs.com`.

17.4 does not delete, reassign, or hide those bindings. Doing so here would collapse the explicit 17.7 ownership-convergence module into a domain-behavior module and would violate the Phase-17 sequencing rule.

## Required production behavior

The live `admin.rcitcs.com` surface proves all of the following:

1. DNS resolves and HTTPS root returns `200`.
2. Root response is `text/html` and renders the administrator sign-in experience.
3. Public-site content is absent.
4. Raw Supabase Edge Function URLs are not exposed in rendered admin HTML.
5. Admin forms use host-local paths such as `/login`, not `/admin/login` or raw backend URLs.
6. `Cache-Control` remains `no-store`.
7. `X-Robots-Tag` remains `noindex`.
8. `X-Content-Type-Options: nosniff` remains present.
9. Framing protection remains `DENY`.
10. CSP remains present.
11. HSTS remains present.
12. Phase-16 admin release/build/media-type markers remain present.
13. `/applications` and `/jobs` remain private admin HTML surfaces.
14. unauthenticated `/session` remains `401` with `authenticated:false`.
15. hostile-origin login POST remains rejected with `403`.
16. the dedicated admin Worker continues to reject the public `rcitcs.com` hostname.

## Source contract

`tests/phase17-admin-production-domain.mjs` locks:

- dedicated production Worker identity;
- production Wrangler entry point;
- production-only `admin.rcitcs.com` Custom Domain declaration;
- `workers_dev=false`;
- no public-secret inheritance;
- public/legacy Workers cannot claim admin hostnames;
- build-selector mapping for production and staging admin Workers;
- the known staging ownership overlap remains explicit until 17.7;
- Phase-16 admin security/build markers remain intact;
- `worker/admin-only.js` rejects a public-host request.

## Live acceptance

`.github/workflows/phase17-admin-production-domain.yml` performs read-only live verification of `admin.rcitcs.com` during the Phase-17 pull request.

The gate verifies the production admin experience and security behavior without deploying the dormant `rcitcs-admin-production` Worker and without mutating Cloudflare.

Implementation head `c495c0603ab09bebeee9cc04865e80add3933bb2` passed the dedicated Phase 17.4 gate and the complete inherited exact-head suite, including:

- Phase 17.4 Production Admin Domain;
- Phase 17.3 WWW Canonical Redirect;
- Phase 17.2 Public Production Domain;
- Phase 17 Domain Baseline;
- RC IT Services CI;
- Wrangler Deployment Validation;
- Phase 12 Runtime Smoke;
- Phase 13 Email Runtime Smoke;
- Phase 13 Secret Availability;
- Phase 14 Contact Inbox Runtime Smoke.

The dedicated 17.4 gate verified the production root, private Applications and Jobs routes, unauthenticated session behavior, hostile-origin mutation rejection, security headers, media type, release markers and absence of public-site/raw-backend rendering.

## Explicit deferrals

17.4 does not change:

- staging-domain isolation — 17.5;
- public `/admin` redirect policy — 17.6;
- Worker Route / Custom Domain / active Worker ownership convergence — 17.7;
- DNS cleanup — 17.8;
- TLS/HSTS convergence — 17.9;
- origin/Host/CORS/direct-backend exposure hardening — 17.10;
- email DNS — 17.11;
- final redirect matrix — 17.12.

## 17.4 closure decision

The module is closed because:

- the source production-admin contract passes;
- live root/routes/session/origin-defense checks pass;
- inherited Phase-17 and historical CI are green;
- production admin remains isolated from the public site;
- no Cloudflare ownership cutover was performed prematurely;
- the known staging/public ownership overlap remains explicitly recorded for 17.7 rather than being falsely represented as resolved.

**Module 17.4 is COMPLETE. Module 17.5 may begin only after this closure commit itself passes exact-head CI.**

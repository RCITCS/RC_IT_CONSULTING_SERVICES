# Phase 20.6–20.10 — Production Verification

Phase 20.6–20.10 continues the release-certification boundary established by Phase 20.1–20.5. It does not introduce product features or redesign approved UX. It certifies the live public, production-admin, staging-admin, domain-ownership and browser-security surfaces before this boundary can be closed.

Certified Phase 20.5 baseline: `e1cd60fcdcef8743d7faa932960995fe3ac94047`.

## 20.6 — Public Website Production Smoke & Deep-Route Verification

The public production gate derives the canonical prerender route set from `getPrerenderRoutes()` rather than maintaining a second route inventory. Every canonical route must return HTTP 200 from `https://rcitcs.com`, contain the real main landmark, carry the expected `rc-deployment-sha`, expose the correct prerender marker and remain free of admin UI ownership.

The gate also verifies `/api/health`, `sitemap.xml`, `robots.txt`, and an unknown-route 404/noindex boundary. On a pull request, production is expected to serve the PR base SHA because the candidate SHA is not yet deployed. The route matrix is therefore derived from a detached worktree at that exact deployed base SHA, preventing candidate-only route changes from being compared against an older production release. After merge to `main`, the expected production release is the exact merged `GITHUB_SHA`; the route matrix comes from that merged source and the gate waits for Cloudflare convergence before testing it.

## 20.7 — Admin Production Domain Acceptance

`https://admin.rcitcs.com` must remain the sole production administration browser surface. The root must render the Administrator sign-in experience and advertise the production environment marker. HTML and session responses remain private through `Cache-Control: no-store` and `X-Robots-Tag: noindex`.

Cloudflare Workers Builds supplies the source commit SHA to the build process. The admin build converts that value into the non-secret runtime variable `RC_ADMIN_DEPLOYMENT_SHA`; the Worker emits the validated 40-character value as `x-rc-admin-deployment-sha`. A production-admin release is therefore accepted only when its runtime header equals the expected deployed commit. The one bootstrap exception is this migration PR while the certified Phase 20.5 base predates that header; post-merge and all later bases require the marker exactly.

Unauthenticated `/applications` and `/jobs` routes must remain protected by the sign-in boundary, `/session` must report unauthenticated state with HTTP 401, and an explicitly hostile cross-origin login mutation must be rejected with HTTP 403 without issuing an authentication cookie.

## 20.8 — Admin Staging Isolation Verification

`https://admin-staging.rcitcs.com` remains intentionally unavailable until a staging administration environment is explicitly activated. GET `/` and POST `/login` must return HTTP 503 with `x-rc-admin-environment: staging` and `x-rc-admin-staging-state: intentionally-unavailable`.

The staging Worker uses the same exact-commit runtime identity contract as production admin and must emit `x-rc-admin-deployment-sha` for the deployed source commit. The staging surface must not render the production sign-in experience, issue cookies, or redirect a login attempt. It retains no-store/noindex and browser-security headers while unavailable.

## 20.9 — Domain, Redirect & Origin Ownership Certification

The release verifies the effective production ownership matrix rather than relying only on repository configuration:

- HTTP apex permanently redirects to canonical HTTPS apex while preserving path and query.
- HTTPS `www.rcitcs.com` permanently redirects to `https://rcitcs.com` while preserving path and query.
- Public `/admin` redirects to `https://admin.rcitcs.com/`; public POST `/admin/login` is not proxied into administration.
- Legacy `/admin` on the production admin host converges to the admin root.
- Public, production-admin, and staging-admin hosts expose mutually exclusive runtime identities.
- The retired `rc-it-consulting-services.rcitcservices.workers.dev` browser identity is accepted only when non-serving (`000` connection failure or `404`), never merely because it returns a non-200 status.

## 20.10 — TLS, Headers & Browser Security Verification

All approved browser hosts must be reachable using TLS 1.2 or newer and must redirect HTTP traffic to HTTPS. HSTS must include `includeSubDomains` and a max-age of at least 31,536,000 seconds.

Public production must preserve `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, the approved referrer policy and restrictive camera/microphone/geolocation permissions policy. Production and staging admin surfaces must preserve HSTS, nosniff, DENY framing protection, CSP `frame-ancestors`, no-store, noindex and environment identity, without wildcard CORS.

## Execution and closure model

The five runtime modules run sequentially after the inherited source/regression contract: 20.6 → 20.7 → 20.8 → 20.9 → 20.10. This ensures later ownership and security certification does not run before the earlier production surfaces have passed.

The branch or pull-request run is pre-merge evidence only. Phase 20.6–20.10 is CLOSED only when all of the following are true:

1. the Phase 20.5 certified baseline remains in ancestry;
2. inherited `npm run verify` is green;
3. PR public checks use the exact deployed base SHA and its own route inventory;
4. the admin runtime source contract proves both admin Workers receive build-time commit identity and emit only validated commit metadata;
5. 20.6–20.10 are green on the final pull-request head, with the narrowly scoped bootstrap allowance only for the pre-marker Phase 20.5 admin deployment;
6. review findings are resolved without weakening valid controls;
7. the pull request is merged to `main` with an expected-head SHA guard;
8. the post-merge `main` run passes 20.6–20.10 against the exact SHA serving on public, production-admin and staging-admin surfaces;
9. the final `main` SHA and production state are rechecked before closure is reported.

No module is closed based only on source assertions, compilation, a previous release, or a pull-request run.

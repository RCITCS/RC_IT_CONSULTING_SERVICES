# Phase 17.7 — Worker / Custom Domain / Route Ownership Convergence

Status: **17.7 COMPLETE — branch-level ownership convergence closed; final-main live activation remains mandatory for overall Phase-17 closure**

Depends on: Phase 17.6 closure SHA `fc6a53f217b58ba2c80880fd02fedf8bf9e856a9`.

Verified implementation SHA: `78b8730c6a8a7f6817164f33f592675700b39578`.

## Objective

Remove the source-controlled ownership overlap recorded in the immutable Phase 17.1 Cloudflare baseline and establish exactly one authoritative Worker owner for every RC IT company hostname.

## Final source ownership matrix

| Hostname | Authoritative Worker | Mechanism |
| --- | --- | --- |
| `rcitcs.com` | `rc-it-consulting-services` | Production Custom Domain |
| `www.rcitcs.com` | `rc-it-consulting-services` | Production Custom Domain; canonical alias behavior from 17.3 |
| `admin.rcitcs.com` | `rcitcs-admin-production` | Production Custom Domain |
| `admin-staging.rcitcs.com` | `rcitcs-admin-staging` | Production Custom Domain with intentionally-unavailable staging policy |
| legacy `rcitcservices` Worker | none | No RC IT company route/domain |

`workers.dev` exposure is intentionally not decided in 17.7. That remains Module 17.10.

## Historical baseline preserved

Phase 17.1 recorded the real pre-convergence control plane:

- `admin.rcitcs.com/*` existed as a Worker Route to `rc-it-consulting-services`;
- `admin.rcitcs.com` simultaneously existed as a Production Custom Domain on `rcitcs-admin-staging`;
- `admin-staging.rcitcs.com` also belonged to `rcitcs-admin-staging`;
- only two active Worker applications were visible in the client Cloudflare account at audit time.

Those facts remain unchanged in `docs/PHASE_17_DOMAIN_BASELINE.md`. 17.7 does not rewrite history to make the old topology look cleaner than it was.

## Source convergence changes

### Public Worker

`wrangler.jsonc` owns only:

- `rcitcs.com`
- `www.rcitcs.com`

It owns no admin hostname.

### Production admin Worker

`wrangler.admin-production.jsonc` owns only:

- `admin.rcitcs.com`

It declares:

- `workers_dev=false`
- `keep_vars=true`
- `RC_ADMIN_ENVIRONMENT=production`
- no staging-unavailable mode

### Staging admin Worker

`wrangler.admin-staging.jsonc` now owns only:

- `admin-staging.rcitcs.com`

The old production Custom Domain declaration was removed. It retains:

- `workers_dev=false`
- `keep_vars=true`
- `RC_ADMIN_ENVIRONMENT=staging`
- `RC_ADMIN_STAGING_MODE=unavailable`

### Legacy Worker

The old `rcitcservices` configuration remains route-less and may not claim any RC IT company hostname.

## Runtime ownership marker

`worker/admin-only.js` now propagates the source-controlled admin environment into the response header:

- production admin: `X-RC-Admin-Environment: production`
- staging unavailable surface: `X-RC-Admin-Environment: staging`

This marker is not cosmetic. It makes the final-main acceptance gate capable of distinguishing three otherwise visually similar cases for `admin.rcitcs.com`:

1. the canonical production admin Worker handled the request — accepted;
2. the old staging Worker still handled the production hostname — rejected;
3. the old public Worker Route intercepted the hostname and entered admin compatibility logic without the production marker — rejected.

Phase-16 release/media-type markers remain preserved.

## Cloudflare deployment semantics

Wrangler files are the source of truth for Worker deployment configuration. The final public Worker config contains no admin route, so a successful final deployment must not preserve a source-controlled `admin.rcitcs.com/*` route on the public Worker.

The Phase-17 branch is not promoted to production solely to make a PR check pass. Therefore the 17.7 workflow separates:

- **candidate source acceptance** — exact one-owner topology, Worker bundle compilation, runtime ownership-marker regression tests;
- **pre-merge live classification** — read-only observation of the current live admin/staging surfaces;
- **final-main activation** — mandatory proof that production admin returns the `production` ownership marker while staging is the hardened `503` surface with the `staging` marker.

## Regression coverage

`tests/phase17-domain-ownership-convergence.mjs` verifies:

- the exact four-host ownership matrix;
- no duplicate hostname claim across active source configs;
- no admin hostname in the public Worker config;
- no production hostname in staging config;
- no staging hostname in production config;
- no company route in the legacy Worker config;
- explicit production/staging environment declarations;
- staging-unavailable policy remains staging-only;
- Workers Builds config selector retains distinct production and staging entries;
- runtime admin responses propagate the environment ownership marker;
- the Phase 17.1 historical overlap remains preserved as audit evidence.

Historical ownership assertions in `tests/admin-job-management.mjs`, `tests/admin-portal-domain-separation.mjs`, and `tests/admin-visual-proxy.mjs` were updated only where they encoded the superseded Phase-16 staging/production overlap. Their Phase-11/12 job-authoring, proxy, authentication, session, navigation and security assertions remain intact.

`.github/workflows/phase17-domain-ownership-convergence.yml` additionally builds production assets, dry-runs all canonical Wrangler candidates, classifies the current live control plane read-only on pull requests, preserves public/admin separation, and enforces the final-main live owner markers.

## Exact-head acceptance evidence

Implementation SHA `78b8730c6a8a7f6817164f33f592675700b39578` passed all 13 required pull-request workflow families:

- RC IT Services CI
- Wrangler Deployment Validation
- Phase 17.7 Domain Ownership Convergence
- Phase 17 Domain Baseline
- Phase 17.2 Public Production Domain
- Phase 17.3 WWW Canonical Redirect
- Phase 17.4 Production Admin Domain
- Phase 17.5 Admin Staging Isolation
- Phase 17.6 Public Admin Separation
- Phase 12 Runtime Smoke
- Phase 13 Email Runtime Smoke
- Phase 13 Secret Availability
- Phase 14 Contact Inbox Runtime Smoke

The full RC IT Services CI completed architecture, smoke, backend, persistence, admin-auth, dashboard, visual-proxy, route-rendering, design-system, performance-routing, SEO, production-build, performance-budget, SEO-build and Cloudflare configuration checks successfully.

The dedicated 17.7 gate additionally passed the source ownership contract, production asset build, all three canonical Wrangler dry-runs, read-only pre-merge control-plane classification and public-host isolation checks. The final-main live owner-marker step is intentionally skipped on pull requests and is mandatory after eventual merge/deployment.

## Safety properties

17.7 did not:

- redesign the public or admin UI;
- change authentication/RBAC/session authority;
- alter Supabase data or migrations;
- delete email DNS records;
- change TLS/HSTS policy beyond preserving existing headers;
- change `workers.dev` exposure;
- rewrite the Phase 17.1 audit ledger;
- merge the draft Phase-17 PR;
- claim that the unmerged branch has already changed the live Cloudflare ownership topology.

## Explicit deferrals

- DNS record cleanup/conflict removal — 17.8
- TLS/SSL/HSTS convergence — 17.9
- direct origin, Host, CORS and `workers.dev` exposure hardening — 17.10
- email-domain DNS verification — 17.11
- redirect/canonical-host minimization — 17.12

## Closure decision

**Module 17.7 is CLOSED at branch level.**

The source-of-truth topology is converged, affected historical tests were reconciled without deleting audit history, production/staging ownership markers are regression-locked, all canonical Wrangler candidates compile, and the entire exact-head inherited test/build/security suite is green.

Overall Phase-17 closure remains prohibited until the eventual final-main deployment proves the live Cloudflare control plane is actually serving `admin.rcitcs.com` from the production admin Worker and `admin-staging.rcitcs.com` from the isolated staging Worker. That live activation requirement is already enforced by the 17.7 final-main workflow gate.

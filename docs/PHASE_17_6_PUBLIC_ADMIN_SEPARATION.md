# Phase 17.6 — Public `/admin` Redirect and Admin-Domain Separation

Status: **IMPLEMENTED — exact-head verification pending**

Depends on: Phase 17.5 closure.

## Objective

Keep administration authority on `https://admin.rcitcs.com` while preserving a safe navigation-only compatibility alias at `https://rcitcs.com/admin...`.

The public site must never authenticate, proxy, replay, or establish an admin session from a mutating request sent to `/admin`.

## Canonical behavior

For the production public hostname `rcitcs.com`:

- `GET /admin` -> `308 https://admin.rcitcs.com/`
- `HEAD /admin` -> same `308`
- `GET /admin/<path>?<query>` -> `308 https://admin.rcitcs.com/<path>?<query>`
- `HEAD /admin/<path>?<query>` -> same `308`
- `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, and other mutation/non-navigation methods on `/admin...` -> `404 Not Found`

Mutation rejection has:

- no `Location` header;
- no `Set-Cookie` header;
- no-store caching;
- noindex crawler policy;
- no admin-auth proxying.

## Open-redirect hardening

The Phase-16 shared runtime built the public admin redirect with URL-reference resolution:

`new URL(suffix, ADMIN_PRODUCTION_ORIGIN)`

A suffix beginning with `//` can be interpreted as a protocol-relative hostname. Therefore a request shaped like:

`/admin//example.invalid/login`

could escape the intended admin origin if that construction reached the public redirect path.

Phase 17.6 places the authoritative public-admin boundary in `worker/index.js`, before shared runtime dispatch. The implementation:

1. creates a URL from the trusted constant `https://admin.rcitcs.com`;
2. assigns only `pathname` from the incoming `/admin` suffix;
3. assigns the incoming query string separately;
4. never resolves the suffix as a URL reference.

Therefore a leading `//` remains a path on `admin.rcitcs.com` and cannot become an external hostname.

## Boundary ordering

The public Worker entry order is:

1. `www.rcitcs.com` canonicalization from 17.3;
2. `rcitcs.com/admin...` public admin separation from 17.6;
3. legacy `/admin` compatibility on dedicated admin hosts;
4. dedicated-admin Worker dispatch;
5. shared public runtime.

This intentionally preserves the existing two-hop `www.rcitcs.com/admin` -> `rcitcs.com/admin` -> `admin.rcitcs.com` behavior for now. Redirect minimization and the final canonical-host matrix belong to Module 17.12.

The `workers.dev/admin` compatibility path is also left unchanged until the direct-endpoint exposure decision in Module 17.10.

## Dedicated admin-host legacy compatibility

Existing bookmarks to:

`https://admin.rcitcs.com/admin/...`

remain navigation-compatible:

- safe GET/HEAD requests receive a host-local `308` with `/admin` removed;
- mutation requests are not replayed and continue to return `409`, requiring a reload on the canonical host/path so session and CSRF authority are re-established.

## Regression contract

`tests/phase17-public-admin-separation.mjs` verifies:

- ordinary public routes do not enter the admin alias logic;
- dedicated admin hosts do not enter the public-host alias logic;
- root/deep GET and HEAD redirects preserve path/query correctly;
- redirect responses remain no-store/noindex/hardened;
- a leading `//` suffix cannot escape `admin.rcitcs.com`;
- POST/PUT/PATCH/DELETE/OPTIONS are rejected with `404` and no redirect/session cookie;
- `www` canonicalization remains 17.3-first;
- dedicated-host legacy navigation/mutation behavior remains preserved;
- the Cloudflare entrypoint enforces public-admin separation before shared runtime dispatch.

## Live activation model

The Phase-17 branch is not deployed to production merely to make a pull-request live test pass.

The 17.6 workflow therefore:

- proves candidate source/runtime behavior on every PR;
- verifies the existing live `/admin` separation behavior read-only;
- classifies the pre-merge leading-`//` redirect result without following it;
- requires final `main` production to keep the redirect origin pinned to `admin.rcitcs.com`;
- requires all public-host mutation methods to remain rejected;
- verifies production admin remains healthy throughout.

## Explicit deferrals

17.6 does not perform:

- Worker/Custom Domain/Route ownership convergence — 17.7;
- DNS record cleanup — 17.8;
- zone-wide TLS/HSTS convergence — 17.9;
- workers.dev/direct-backend/Host/CORS hardening — 17.10;
- final redirect minimization/canonical-host matrix — 17.12.

## Closure criteria

17.6 may close at branch level only when:

- candidate source tests pass;
- open-redirect defense is regression-locked;
- all public-host mutation methods are proven non-proxying;
- production admin remains healthy;
- live pre-merge behavior is recorded truthfully;
- inherited CI/build/security gates remain green;
- final-main workflow makes safe live redirect activation mandatory.

Final Phase-17 closure remains prohibited until the post-merge live gate confirms the safe redirect origin.

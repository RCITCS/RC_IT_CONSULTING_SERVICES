# Phase 17.5 — Admin Staging Domain Isolation (`admin-staging.rcitcs.com`)

Status: **IMPLEMENTED — exact-head verification pending**

Depends on: Phase 17.4 closure.

## Objective

Eliminate the ambiguous state where `admin-staging.rcitcs.com` can expose the production-connected administration runtime under a staging hostname.

Phase 17 requires staging to be one of two things:

1. genuinely isolated from production data/runtime authority; or
2. intentionally unavailable.

There is currently no independently isolated staging backend/data plane approved for RC IT. Therefore the safe 17.5 posture is **intentionally unavailable**.

## Safety decision

`admin-staging.rcitcs.com` must not be treated as a usable staging environment while it shares production-connected backend authority.

The staging Worker configuration now declares:

- `RC_ADMIN_ENVIRONMENT=staging`
- `RC_ADMIN_STAGING_MODE=unavailable`

`worker/admin-only.js` applies this policy only when both conditions are true:

- incoming hostname is exactly `admin-staging.rcitcs.com`; and
- the deployment environment explicitly sets staging mode to `unavailable`.

This host-specific check is important because the connected `rcitcs-admin-staging` Worker still temporarily owns `admin.rcitcs.com` until Module 17.7. The staging isolation policy therefore **must not block production admin traffic** on `admin.rcitcs.com`.

## Intentionally unavailable response contract

When staging-unavailable mode is active, every request to `admin-staging.rcitcs.com` is intercepted before authentication, CSRF normalization, upstream proxying, or admin HTML rendering.

The response is:

- HTTP `503 Service Unavailable`;
- body: `Staging administration is intentionally unavailable.` for body-bearing methods;
- no body for `HEAD`;
- `Cache-Control: no-store`;
- `X-Robots-Tag: noindex`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- restrictive CSP;
- HSTS retained;
- `Referrer-Policy: no-referrer`;
- restrictive Permissions Policy;
- `Cross-Origin-Opener-Policy: same-origin`;
- `Cross-Origin-Resource-Policy: same-origin`;
- `X-RC-Admin-Environment: staging`;
- `X-RC-Admin-Staging-State: intentionally-unavailable`;
- no `Set-Cookie`;
- no `Location` redirect;
- no production admin HTML;
- no backend authentication processing.

## Production-host protection

Even when the request reaches the currently connected `rcitcs-admin-staging` Worker with the staging variables present, `admin.rcitcs.com` does **not** enter the unavailable branch.

This keeps the current production admin surface operational until the explicit 17.7 ownership cutover moves production to its canonical `rcitcs-admin-production` Worker.

## Source ownership during 17.5

The staging Wrangler configuration still lists both admin Custom Domains because removing the production hostname from the staging Worker is an ownership-convergence change reserved for Module 17.7.

17.5 changes runtime policy, not Cloudflare ownership topology.

No Custom Domain, Route, DNS object, Worker application, secret, or production deployment is deleted or reassigned in this module.

## Regression contract

`tests/phase17-admin-staging-isolation.mjs` verifies:

- staging config remains `rcitcs-admin-staging`;
- `workers_dev=false`;
- explicit staging environment/mode variables;
- production config does not inherit staging-unavailable mode;
- only `admin-staging.rcitcs.com` is classified unavailable;
- production hostname remains unaffected even with staging variables;
- GET/HEAD/POST unavailable responses use `503`;
- no-store/noindex/nosniff/framing/CSP/HSTS controls;
- no cookies and no redirects;
- POST is intercepted before auth/runtime processing;
- staging isolation executes before browser-POST normalization/upstream processing.

## Activation model

During the unmerged Phase-17 pull request, the live staging hostname can still expose the Phase-16 baseline because the candidate branch is intentionally not deployed merely to make a live test pass.

`.github/workflows/phase17-admin-staging-isolation.yml` therefore distinguishes:

- **candidate behavior:** staging is already `503` and isolated in source/runtime tests;
- **pre-merge production behavior:** current live staging is classified without mutation and production admin must remain healthy;
- **final-main behavior:** live `admin-staging.rcitcs.com` must become the hardened intentional `503` surface, otherwise final Phase-17 closure is prohibited.

## Explicit deferrals

17.5 does not perform:

- production/staging Worker ownership convergence — 17.7;
- Route/Custom Domain cleanup — 17.7/17.8;
- public `/admin` redirect convergence — 17.6;
- TLS/HSTS policy convergence — 17.9;
- direct backend/origin exposure hardening — 17.10;
- email DNS work — 17.11.

## Closure criteria

17.5 may close at branch level only when:

- candidate staging-unavailable behavior is fully regression-tested;
- the production hostname is proven unaffected by the host-specific policy;
- the live baseline is recorded without pretending that current staging is already isolated;
- inherited CI/security/build gates remain green;
- the final-main workflow contains a mandatory live `503` activation gate;
- no ownership cutover is pulled forward from 17.7.

Final Phase-17 closure remains prohibited until the live post-merge staging-unavailable gate passes.

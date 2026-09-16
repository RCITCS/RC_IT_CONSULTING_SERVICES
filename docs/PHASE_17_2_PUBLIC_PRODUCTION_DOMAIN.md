# Phase 17.2 — Public Production Domain (`rcitcs.com`)

Status: **COMPLETE — exact-head source/build/live-baseline acceptance passed**

Depends on: Phase 17.1 control-plane baseline closure.

## Objective

Lock `https://rcitcs.com` as the single authoritative public production hostname and canonical public identity for the RC IT corporate application without redesigning the site or pulling later Phase-17 modules forward.

## Authoritative ownership

The authoritative RC IT Cloudflare account is the client account:

- Account ID: `3fdd024f6fbc25c03ed4481352576540`
- Zone: `rcitcs.com`
- Zone ID: `cf815244b9dbd51a490747f597867c68`

The separate/main Cloudflare account `20d349f3f75ab611adb3f987188636e7` is not approved for RC IT work and must not be used as an RC IT deployment target.

The public production apex owner is:

- Worker: `rc-it-consulting-services`
- Hostname: `rcitcs.com`
- Cloudflare binding: Production Custom Domain / proxied Worker DNS surface
- Source config: root `wrangler.jsonc`
- Entry point: `worker/index.js`

## 17.2 implementation decision

No Cloudflare control-plane mutation was required because the authoritative client account already had the desired apex ownership:

`rcitcs.com` -> `rc-it-consulting-services`

The repository declares the same ownership using a Custom Domain route in `wrangler.jsonc`.

17.2 therefore hardened and verified the ownership/canonical contract instead of recreating an already-correct hostname binding.

## Defect discovered during 17.2

The first dedicated 17.2 live acceptance run exposed a real canonical-host defect.

`src/frontend/seo/seo-config.js` previously used this fallback model:

```js
const configuredOrigin = environment.PUBLIC_ORIGIN || '';
export const SITE_ORIGIN = String(
  configuredOrigin || 'https://rc-it-consulting-services.rcitcservices.workers.dev'
).replace(/\/+$/, '');
```

The client Cloudflare Builds inventory captured in 17.1 did not show a `PUBLIC_ORIGIN` build variable. As a result, production/static SEO output could identify the `workers.dev` compatibility endpoint instead of `rcitcs.com` in canonical URLs, sitemap URLs, robots sitemap declarations, Open Graph URLs and structured-data URLs.

This was a production-domain identity defect even though the apex itself already resolved and served the corporate site correctly.

## 17.2 fix

The canonical public source-of-truth is now explicit and source-controlled:

```js
export const SITE_ORIGIN = 'https://rcitcs.com';
```

The environment-dependent `PUBLIC_ORIGIN` fallback was removed from the canonical identity path.

Consequences:

- `rcitcs.com` is the canonical public origin in production builds;
- branch previews remain `noindex` but continue to reference the production apex as canonical;
- `workers.dev` may still deliver compatibility traffic until Module 17.10, but it is no longer allowed to become an alternate canonical public identity;
- the Vercel fallback remains secondary/noindex and does not become canonical.

## Compatibility-smoke correction

The inherited main-branch workflow `.github/workflows/cloudflare-deploy.yml` historically used the `workers.dev` URL both as its delivery endpoint and as its expected canonical SEO origin.

17.2 corrected that distinction:

- delivery/compatibility endpoint: `https://rc-it-consulting-services.rcitcservices.workers.dev`;
- canonical public identity: `https://rcitcs.com`.

The compatibility smoke now verifies that content delivered through `workers.dev` still emits `rcitcs.com` canonical, Open Graph, sitemap and robots identity. This prevents the old workflow from falsely rejecting the correct Phase-17 architecture after final merge.

## Required public-domain behavior

The 17.2 contract requires:

1. `https://rcitcs.com/` resolves and returns HTTP `200` directly, without redirecting the apex to another hostname.
2. The apex response is the corporate/public application, not the admin portal.
3. While Phase 17 remains an unmerged PR, live production continues to expose the PR base/main deployment SHA rather than silently deploying branch commits.
4. Public HTML remains `text/html`.
5. Candidate production output uses `https://rcitcs.com` for canonical, Open Graph, sitemap, robots and structured-data identity.
6. `/api/health` on the apex remains healthy.
7. No admin sign-in content is rendered at the public root.
8. Existing `/admin` separation remains intact; final public-admin redirect/domain convergence belongs to later Phase-17 modules.

## Source contract

`tests/phase17-public-production-domain.mjs` locks:

- public Worker identity;
- root Worker entry point;
- apex Custom Domain declaration;
- explicit `https://rcitcs.com` canonical source-of-truth;
- absence of `PUBLIC_ORIGIN`/`workers.dev` canonical fallback;
- absence of premature `www` or admin Custom Domain declarations in the public config;
- preservation of the dedicated-admin dispatch boundary;
- preservation of the inherited public `/admin` safety behavior;
- authoritative client-account scope and prohibition of the separate/main Cloudflare account for RC IT production ownership.

## Build and live acceptance gate

`.github/workflows/phase17-public-production-domain.yml` now separates candidate-build verification from live-production verification.

For pull requests it proves:

- the candidate source builds successfully;
- generated `about-us.html` uses the apex canonical and Open Graph URL;
- generated sitemap URLs use `https://rcitcs.com`;
- generated `robots.txt` advertises `https://rcitcs.com/sitemap.xml`;
- generated public discovery files do not leak the `workers.dev` hostname as canonical identity;
- live `rcitcs.com` DNS/HTTPS remains healthy and directly serves the corporate application;
- live production remains on the PR base SHA, proving Phase-17 branch changes have not silently replaced production;
- apex `/api/health` remains healthy;
- `GET /admin` retains its inherited `308` production-admin redirect baseline;
- `POST /admin/login` remains rejected with `404` on the public host.

For a future push to `main`, the same workflow waits for the exact merged SHA to appear on `rcitcs.com` and then verifies the live canonical/sitemap/robots identity. This gives the final Phase-17 merge a production activation gate without prematurely deploying this draft branch.

## Exact-head acceptance evidence

Implementation head `2413bea9fc2bd1a933b8c2e7b0dec23bf01dfca9` passed all eight pull-request workflow families:

- Phase 17.2 Public Production Domain;
- Phase 17 Domain Baseline;
- RC IT Services CI;
- Wrangler Deployment Validation;
- Phase 12 Runtime Smoke;
- Phase 13 Email Runtime Smoke;
- Phase 13 Secret Availability;
- Phase 14 Contact Inbox Runtime Smoke.

The dedicated 17.2 gate specifically passed:

- source ownership contract;
- candidate production build;
- apex-only canonical/Open Graph/sitemap/robots identity in candidate output;
- live apex DNS and direct HTTPS `200`;
- PR-base SHA production isolation;
- live public API health;
- inherited public/admin separation baseline.

No manual Cloudflare change was made to complete 17.2.

## Explicit deferrals

17.2 intentionally does **not** complete or modify:

- `www.rcitcs.com` — Module 17.3;
- `admin.rcitcs.com` ownership — Modules 17.4 and 17.7;
- `admin-staging.rcitcs.com` isolation — Module 17.5;
- final public `/admin` redirect strategy — Module 17.6;
- TLS/HSTS policy convergence — Module 17.9;
- origin/Host/CORS/direct-backend exposure — Module 17.10;
- email DNS — Module 17.11;
- final redirect/canonical-host matrix — Module 17.12;
- `workers.dev` exposure decision — Module 17.10.

`workers_dev` therefore remains enabled in the public Worker configuration at 17.2 closure. That is deliberate and is not the final Phase-17 exposure posture.

## 17.2 closure decision

All module requirements are satisfied at the branch/acceptance level required before the final Phase-17 merge:

- authoritative client-account apex ownership is established;
- no unnecessary DNS/Custom-Domain mutation was performed;
- the canonical-host defect discovered by the new gate was fixed at its source-of-truth;
- candidate build output is apex-canonical;
- inherited production compatibility smoke was corrected for the new canonical architecture;
- live production remains healthy and isolated from the unmerged branch;
- all exact-head workflow families passed on the implementation head;
- unrelated Cloudflare accounts were not used as RC IT production owners;
- no later Phase-17 module was pulled forward.

**Module 17.2 is COMPLETE. Module 17.3 may begin only after this closure commit itself passes exact-head CI.**

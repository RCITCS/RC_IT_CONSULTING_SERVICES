# Phase 17.2 — Public Production Domain (`rcitcs.com`)

Status: **IMPLEMENTED — exact-head verification pending**

Depends on: Phase 17.1 control-plane baseline closure.

## Objective

Lock `https://rcitcs.com` as the single authoritative public production hostname for the RC IT corporate application without redesigning the site or pulling later Phase-17 modules forward.

## Authoritative ownership

The authoritative RC IT Cloudflare account is the client account:

- Account ID: `3fdd024f6fbc25c03ed4481352576540`
- Zone: `rcitcs.com`
- Zone ID: `cf815244b9dbd51a490747f597867c68`

The separate/main Cloudflare account `20d349f3f75ab611adb3f987188636e7` is out of scope for RC IT and must not be used as an RC IT deployment target.

The public production apex owner is:

- Worker: `rc-it-consulting-services`
- Hostname: `rcitcs.com`
- Cloudflare binding: Production Custom Domain / proxied Worker DNS surface
- Source config: root `wrangler.jsonc`
- Entry point: `worker/index.js`

## 17.2 implementation decision

No Cloudflare mutation is required in 17.2 because the authoritative client control plane already has the desired apex ownership:

`rcitcs.com` -> `rc-it-consulting-services`

The repository already declares the same ownership using a Custom Domain route in `wrangler.jsonc`.

17.2 therefore hardens the contract rather than recreating an already-correct production binding.

## Required production behavior

The 17.2 gate requires all of the following on the apex:

1. `https://rcitcs.com/` resolves and returns HTTP `200` directly, without redirecting the apex to another hostname.
2. The response is the corporate/public application, not the admin portal.
3. The production page exposes a deployment SHA marker matching the current `main` production baseline while the Phase-17 branch remains unmerged.
4. Public HTML remains `text/html`.
5. Public SEO identity is apex-based:
   - canonical URLs use `https://rcitcs.com/...`;
   - runtime sitemap URLs use `https://rcitcs.com/...`;
   - `robots.txt` advertises the apex sitemap.
6. `/api/health` on the apex remains healthy.
7. No admin sign-in content is rendered at the public root.
8. Existing `/admin` separation remains intact, but its final redirect/domain convergence belongs to 17.6 and admin ownership modules.

## Explicit deferrals

17.2 does **not** change:

- `www.rcitcs.com` — Module 17.3;
- `admin.rcitcs.com` ownership — Modules 17.4 and 17.7;
- `admin-staging.rcitcs.com` isolation — Module 17.5;
- public `/admin` redirect strategy — Module 17.6;
- TLS/HSTS policy convergence — Module 17.9;
- origin/Host/CORS/direct-backend exposure — Module 17.10;
- email DNS — Module 17.11;
- final redirect matrix — Module 17.12;
- `workers.dev` exposure decision — Module 17.10.

`workers_dev` therefore remains enabled in the public Worker configuration during 17.2. This is deliberate and must not be misread as the final Phase-17 exposure posture.

## Source contract

`tests/phase17-public-production-domain.mjs` locks:

- public Worker identity;
- root entry point;
- apex Custom Domain declaration;
- absence of premature `www` or admin Custom Domain declarations in the public config;
- preservation of the dedicated-admin dispatch boundary;
- preservation of the inherited public `/admin` safety behavior;
- authoritative client-account scope.

## Live acceptance gate

`.github/workflows/phase17-public-production-domain.yml` verifies the apex against the live production baseline without mutating Cloudflare.

During a Phase-17 pull request, production is expected to continue serving the PR base SHA, not the unmerged branch SHA. This proves that audit/test commits do not silently alter production.

## Closure criteria

17.2 may be marked complete only after:

- the source contract passes;
- the live apex gate passes;
- inherited architecture/test/build gates remain green;
- no unexpected production deployment occurs from the Phase-17 branch;
- no Cloudflare setting outside the client account is touched;
- no `www`, admin, staging, TLS, origin-hardening, or email-domain work is pulled forward.

Until those exact-head gates pass, 17.2 remains **implemented but not closed**.

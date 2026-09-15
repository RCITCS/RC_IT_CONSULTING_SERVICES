# Phase 17.3 — `www.rcitcs.com` Canonical Redirect

Status: **COMPLETE — source/runtime/build acceptance passed; final-main live 308 activation remains mandatory**

Depends on: Phase 17.2 public production apex closure.

## Objective

Make `https://rcitcs.com` the only rendered public production hostname while preserving `www.rcitcs.com` as a permanent compatibility alias.

The canonical rule is:

`https://www.rcitcs.com/<path>?<query>` -> `308` -> `https://rcitcs.com/<same-path>?<same-query>`

`www` must never remain an independently rendered/indexable production copy after the final Phase-17 deployment.

## Baseline defect

Phase 17.1 established an inconsistent Cloudflare state:

- `rc-it-consulting-services` listed `www.rcitcs.com` as a Production Custom Domain;
- the authoritative DNS record table contained no `www` row;
- public DNS exposed no A, AAAA or CNAME answer for `www.rcitcs.com`;
- Cloudflare itself warned that visitors could not reach `www.rcitcs.com`.

The repository also did not declare `www.rcitcs.com` in root `wrangler.jsonc`, so Worker control-plane intent and source control were not converged.

## Implementation

### Source-controlled Custom Domain ownership

Root `wrangler.jsonc` now declares both public Custom Domains on the same public Worker:

- `rcitcs.com`;
- `www.rcitcs.com`.

Both are owned by `rc-it-consulting-services`.

No admin or staging hostname was added to the public Worker configuration.

### Server-side canonicalization

`worker/index.js` now performs `www` canonicalization before admin/public/API rendering.

The redirect implementation:

- recognizes only hostname `www.rcitcs.com`;
- returns HTTP `308`;
- targets trusted origin `https://rcitcs.com`;
- preserves pathname and query string;
- does not render a response body;
- applies before the legacy admin redirect and application runtime;
- leaves the apex, production-admin and staging-admin hosts untouched.

### Open-redirect defense

The redirect does not construct its target by resolving the incoming pathname as a URL reference.

Instead it creates the trusted apex URL first and then assigns `pathname` and `search`. This prevents an incoming path beginning with `//` from escaping to another host.

Example:

`https://www.rcitcs.com//attacker.example/path?next=%2F`

must remain on:

`https://rcitcs.com//attacker.example/path?next=%2F`

and must never become `https://attacker.example/...`.

### Method semantics

The redirect uses `308`, so clients preserve the request method and body when following it. This prevents a mutation request reaching `www` from being silently converted into a GET.

The public/admin security boundary remains unchanged. For example:

`www.rcitcs.com/admin?...`

first canonicalizes to:

`rcitcs.com/admin?...`

The existing public `/admin` behavior then applies. Final admin-alias convergence remains Module 17.6.

## Regression contract

`tests/phase17-www-canonical.mjs` verifies:

- apex and `www` source-controlled Custom Domain declarations;
- no redirect loop on `rcitcs.com`;
- admin hosts bypass the `www` canonicalizer;
- root `www` redirect;
- deep-path/query preservation;
- `/admin` path preservation for the later admin boundary;
- method-preserving POST redirect status;
- leading-`//` open-redirect defense;
- HEAD behavior;
- no duplicate rendered body from the canonical alias.

Historical regression tests from Phases 10, 12 and 16 were updated only where they had incorrectly encoded “public Worker = exactly one hostname” as a permanent invariant. Their real security invariant remains unchanged: the public Worker may own the approved public apex/www pair, but it must not claim production or staging admin hostnames.

## Live-state change discovered during 17.3

During exact-head PR verification, `www.rcitcs.com` changed from the Phase-17.1 non-resolving baseline to publicly resolving through Cloudflare anycast.

Because the draft Phase-17 branch is intentionally not deployed to production, the reachable `www` host can still serve the existing Phase-16/base-SHA public runtime until the final Phase-17 deployment. That temporary state is explicitly recorded rather than treated as successful canonicalization.

The PR gate therefore distinguishes:

- **candidate behavior:** source/runtime tests must already return the required `308` to the apex;
- **current production isolation:** if live `www` returns `200` before merge, it must be the exact PR-base production SHA rather than an unexplained deployment;
- **final production behavior:** after the final main deployment, live `www` must return `308` to the apex or the Phase-17 production gate fails.

This does not waive the duplicate-host defect. It prevents an unmerged PR from being deployed merely to satisfy a live test while preserving a mandatory activation gate for final release.

## Activation model

No manual Cloudflare mutation was performed in this module.

The authoritative client account already contained the `www.rcitcs.com` Custom Domain object. The source declaration added in 17.3 gives the final Wrangler/Cloudflare deployment the desired source-controlled state.

During the draft Phase-17 pull request:

- source/runtime behavior is verified in CI;
- candidate Wrangler configuration validates successfully;
- live `rcitcs.com` remains on the PR base SHA;
- live `www` may be unresolved, already correctly redirecting, or temporarily expose only the exact base-SHA site while the branch is unmerged.

On the final push to `main`, `.github/workflows/phase17-www-canonical.yml` waits for the live alias and requires:

- root `www` -> `308` -> apex;
- deep path/query preservation;
- `/admin` path/query preservation into the apex boundary;
- method-preserving POST `308`;
- no unresolved/broken alias.

Final Phase-17 closure is prohibited if those live post-merge assertions do not pass.

## Exact-head acceptance evidence

Implementation head `3e222c3aeec729c4837898de0cb2e1012caa9db4` passed all nine pull-request workflow families:

- Phase 17.3 WWW Canonical Redirect;
- Phase 17.2 Public Production Domain;
- Phase 17 Domain Baseline;
- RC IT Services CI;
- Wrangler Deployment Validation;
- Phase 12 Runtime Smoke;
- Phase 13 Email Runtime Smoke;
- Phase 13 Secret Availability;
- Phase 14 Contact Inbox Runtime Smoke.

The full RC IT Services CI passed architecture and historical Phase 9–16 regression coverage, visual-admin delivery, route rendering, design-system checks, performance routing, SEO/preview SEO, optimized production build, performance budgets, prerendered SEO output and Cloudflare configuration checks.

The dedicated 17.3 gate passed:

- source/runtime canonicalization contract;
- candidate production build;
- Wrangler 4.131.0 dry-run with apex + `www` Custom Domains;
- live apex base-SHA production isolation;
- live `www` pre-merge state classification without Cloudflare mutation;
- encoded final-main live `308` activation requirements.

## Explicit deferrals

17.3 does not modify:

- `admin.rcitcs.com` ownership — Modules 17.4 and 17.7;
- `admin-staging.rcitcs.com` isolation — Module 17.5;
- final public `/admin` redirect policy — Module 17.6;
- general redirect matrix — Module 17.12;
- TLS/HSTS convergence — Module 17.9;
- direct `workers.dev` exposure — Module 17.10;
- email DNS — Module 17.11.

## 17.3 closure decision

All branch-level module requirements are satisfied:

- source Custom Domain ownership is locked;
- the server-side 308 canonicalizer is implemented and security-tested;
- Wrangler validation accepts the two public Custom Domain declarations;
- dedicated 17.3 CI passed;
- inherited Phase-17 and historical runtime/security/build gates passed;
- admin/staging ownership remains unchanged;
- no manual Cloudflare mutation was made;
- the separate/main personal Cloudflare account was not used;
- final-main activation requirements are mandatory and cannot be skipped.

**Module 17.3 is COMPLETE at branch level. Its live 308 activation remains a required final-main production gate. Module 17.4 may begin only after this closure commit itself passes exact-head CI.**

# Phase 17.3 — `www.rcitcs.com` Canonical Redirect

Status: **IMPLEMENTED — exact-head verification pending**

Depends on: Phase 17.2 public production apex closure.

## Objective

Make `https://rcitcs.com` the only rendered public production hostname while preserving `www.rcitcs.com` as a permanent compatibility alias.

The canonical rule is:

`https://www.rcitcs.com/<path>?<query>` -> `308` -> `https://rcitcs.com/<same-path>?<same-query>`

`www` must never render an independently indexable copy of the corporate site.

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

The Phase-17.1 baseline test was also corrected so it protects the historical 17.1 evidence instead of permanently forbidding the later intentional `www` source declaration.

## Activation model

No manual Cloudflare mutation is performed in this module.

The authoritative client dashboard already contains a `www.rcitcs.com` Custom Domain object but it is not publicly resolvable. The source declaration added in 17.3 gives the final Wrangler/Cloudflare deployment an authoritative desired state to reconcile.

During the draft Phase-17 pull request:

- source/runtime behavior is tested locally in CI;
- live `rcitcs.com` remains on the PR base SHA;
- live `www` may remain unresolved until final Phase-17 deployment.

On the final push to `main`, the 17.3 production gate must wait for `www` DNS activation and prove real `308` behavior before final Phase-17 closure.

## Explicit deferrals

17.3 does not modify:

- `admin.rcitcs.com` ownership — Modules 17.4 and 17.7;
- `admin-staging.rcitcs.com` isolation — Module 17.5;
- final public `/admin` redirect policy — Module 17.6;
- general redirect matrix — Module 17.12;
- TLS/HSTS convergence — Module 17.9;
- direct `workers.dev` exposure — Module 17.10;
- email DNS — Module 17.11.

## Closure criteria

17.3 may be marked complete at the Phase-17 branch level only after:

- source Custom Domain ownership is locked;
- redirect runtime regression tests pass;
- Wrangler validation accepts the two public Custom Domain declarations;
- dedicated 17.3 CI passes;
- inherited Phase-17 and historical runtime gates remain green;
- no admin/staging ownership is changed;
- no manual mutation is made in the user's separate/main Cloudflare account;
- final-main activation requirements are encoded so a broken/unresolved `www` cannot pass final Phase-17 closure.

Until those gates pass, 17.3 remains **implemented but not closed**.

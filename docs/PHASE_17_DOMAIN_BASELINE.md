# Phase 17 — Domain & Subdomain Baseline

Status: **17.1 OPEN — secondary Cloudflare ownership surface discovered during closure CI**

Baseline source commit: `10deb2f6d3df301454e8f6f3a48a0f9a2b67d847`

Working branch: `phase17-domain-ownership-convergence`

## Scope

Phase 17 is a production-domain architecture and ownership-convergence phase. It does not redesign the public site or admin portal and does not add ATS, candidate portal, SMS/WhatsApp, AI, or other product features.

The Phase 17 invariant is:

> One authoritative production owner per hostname.

No DNS record, Worker route, Custom Domain, build target, or legacy binding may be removed merely because it appears old. Dependency proof is required first.

## Primary Cloudflare account inventory

The read-only Cloudflare dashboard audit established the following for account `3fdd024f6fbc25c03ed4481352576540`:

- exactly one managed domain: `rcitcs.com`;
- zone status **Active**;
- DNS setup **Full**;
- registrar Cloudflare, registration **Active**;
- Zone ID `cf815244b9dbd51a490747f597867c68`;
- Workers account subdomain `rcitcservices.workers.dev`;
- exactly two Worker applications in this account:
  - `rc-it-consulting-services`;
  - `rcitcs-admin-staging`.

The dashboard did **not** show `rcitcs-admin-production` or a Worker application named `rcitcservices` in this account.

## Primary-account Worker ownership

### `rc-it-consulting-services`

Cloudflare shows:

| Binding | Type | Zone |
| --- | --- | --- |
| `admin.rcitcs.com/*` | Route | `rcitcs.com` |
| `www.rcitcs.com` | Production Custom Domain | `rcitcs.com` |
| `rcitcs.com` | Production Custom Domain | `rcitcs.com` |

Production and preview `workers.dev` URLs are enabled.

Cloudflare Builds state:

- repository `RCITCS/RC_IT_CONSULTING_SERVICES`;
- production branch `main`;
- root directory `/`;
- version command `npx wrangler versions upload`;
- non-production branch builds enabled;
- dedicated build API token configured;
- build-time Supabase secret/storage/URL configuration present;
- no deploy hooks;
- build cache enabled.

Active deployment captured during audit:

- Version ID `bacd55c6`;
- 100% traffic;
- source branch `main`;
- source commit `10deb2f6d3df301454e8f6f3a48a0f9a2b67d847`;
- dashboard error rate 0% at capture time;
- 76 saved Worker versions shown.

### `rcitcs-admin-staging`

Cloudflare shows:

| Binding | Type | Zone |
| --- | --- | --- |
| `admin-staging.rcitcs.com/*` | Route | `rcitcs.com` |
| `admin-staging.rcitcs.com` | Production Custom Domain | `rcitcs.com` |
| `admin.rcitcs.com` | Production Custom Domain | `rcitcs.com` |

Production and preview `workers.dev` URLs are disabled.

Cloudflare Builds state:

- repository `RCITCS/RC_IT_CONSULTING_SERVICES`;
- production branch `main`;
- root directory `/`;
- build command `npm run build`;
- deploy command `npx wrangler deploy`;
- version command `npx wrangler versions upload`;
- non-production branch builds enabled;
- dedicated `rcitcs-admin-staging` build token configured;
- no build variables or secrets configured;
- no deploy hooks;
- build cache enabled.

Cloudflare displays a configuration-drift warning instructing the repository root `wrangler.jsonc` to use `"name": "rcitcs-admin-staging"`. That conflicts with the repository model where root `wrangler.jsonc` is the public Worker config and staging has a separate Wrangler config.

Active deployment captured during audit:

- Version ID `895c5744`;
- 100% traffic;
- latest successful build source `10deb2f6d3df301454e8f6f3a48a0f9a2b67d847` from `main`;
- 45 saved Worker versions shown.

A high dashboard error-rate percentage was visible at capture time. It is not classified as a defect by 17.1 because expected rejection/smoke-test traffic can contribute to this metric.

## Primary-account DNS inventory

Cloudflare DNS showed **13 total active records**.

Application/domain-relevant state:

| Hostname | Control-plane state | Proxy state |
| --- | --- | --- |
| `rcitcs.com` | Worker record bound to `rc-it-consulting-services` | Proxied |
| `admin.rcitcs.com` | Worker record bound to `rcitcs-admin-staging` | Proxied |
| `admin-staging.rcitcs.com` | Worker record bound to `rcitcs-admin-staging` | Proxied |
| `www.rcitcs.com` | no DNS-table row even though the public Worker lists it as a Production Custom Domain | no published DNS answer at audit time |
| `links.rcitcs.com` | Resend CNAME to `links1.resend-dns.com` | DNS only, 1 hour |
| apex MX | three Cloudflare Email Routing MX records | DNS only, Auto |
| `send.rcitcs.com` MX | Amazon SES feedback endpoint used by mail delivery | DNS only, 1 hour |
| TXT/DKIM/SPF | Cloudflare Email Routing, Google verification, and Resend/Amazon SES-related records | DNS only |

Apex MX values observed:

- `route2.mx.cloudflare.net` priority 55;
- `route1.mx.cloudflare.net` priority 59;
- `route3.mx.cloudflare.net` priority 68.

Cloudflare also recommends adding DMARC. That belongs to the later email-domain verification/security module.

No old Vercel/Pages/third-party web-hosting pointer was visible in this account's complete 13-record zone inventory.

## Known ownership conflicts in the primary account

### Production admin overlap

`admin.rcitcs.com` is simultaneously represented by two Cloudflare mechanisms:

- `admin.rcitcs.com/*` Route -> `rc-it-consulting-services`;
- `admin.rcitcs.com` Production Custom Domain -> `rcitcs-admin-staging`.

This is a Phase-17 convergence finding. Nothing has been deleted or reassigned during 17.1.

### `www.rcitcs.com` incomplete state

The earlier assumption that `www` was simply absent was incorrect.

Current evidence is:

- `rc-it-consulting-services` lists `www.rcitcs.com` as a Production Custom Domain;
- the DNS record table has no `www` row;
- Cloudflare warns that visitors cannot reach `www.rcitcs.com`;
- public DNS returns no A, AAAA, or CNAME answer for `www.rcitcs.com`.

Therefore `www` is configured at the Worker Custom Domain layer but not externally reachable. Repair belongs to 17.3.

## Source-controlled declarations

| Surface | Source-controlled Worker | Current primary-account reality |
| --- | --- | --- |
| Public | `rc-it-consulting-services` | active Worker |
| Canonical production admin | `rcitcs-admin-production` | config exists, Worker absent from audited primary account |
| Connected admin deployment | `rcitcs-admin-staging` | active Worker; owns both admin Custom Domains |
| Legacy | `rcitcservices` | legacy source config exists; Worker absent from audited primary account |

The runtime still preserves the Phase-16 public/admin boundary:

- GET/HEAD `rcitcs.com/admin...` -> `308` to `https://admin.rcitcs.com/...`;
- mutation requests on the public `/admin` alias are rejected with `404`;
- production/staging admin hosts remain dedicated admin hosts;
- production admin security headers and host-local boundaries remain covered by existing smoke tests.

## Public DNS/runtime baseline

Before any Phase-17 mutations:

- authoritative NS: `max.ns.cloudflare.com`, `venus.ns.cloudflare.com`;
- apex/admin/admin-staging resolve through Cloudflare;
- `www.rcitcs.com` does not publicly resolve;
- apex, production admin, and staging admin returned live `200` responses;
- `GET https://rcitcs.com/admin` returned `308`;
- `POST https://rcitcs.com/admin/login` returned `404`.

No production behavior was changed during this audit.

## NEW BLOCKER — secondary Cloudflare account discovered by exact-head CI

After the primary-account audit was documented, the exact-head GitHub check suite for the Phase-17 branch exposed a Cloudflare GitHub App check named:

`Workers Builds: rcitcservices`

Its Cloudflare details URL targets:

- Cloudflare account ID `20d349f3f75ab611adb3f987188636e7`;
- Worker/script `rcitcservices`.

This is a **different Cloudflare account** from the audited primary account `3fdd024f6fbc25c03ed4481352576540`.

Therefore the statement "`rcitcservices` does not exist" is valid only for the audited primary account. The GitHub integration proves that a second Cloudflare account still has a build/deployment relationship involving a Worker/script named `rcitcservices`.

This secondary account may be legacy, but 17.1 cannot assume that. It must be inspected before closure to establish whether it still owns or can affect any RC IT production hostname, route, Custom Domain, build integration, or deployment path.

## Evidence still required before 17.1 can close

Only the newly discovered secondary Cloudflare ownership surface remains unresolved.

For account `20d349f3f75ab611adb3f987188636e7`, establish read-only evidence for:

1. account identity visible in the Cloudflare account selector;
2. whether `rcitcs.com` or any RC IT zone/domain is present;
3. whether Worker/script `rcitcservices` exists and its Domains/Routes;
4. whether it has any Custom Domain, Worker Route, or active production binding for `rcitcs.com`, `www.rcitcs.com`, `admin.rcitcs.com`, or `admin-staging.rcitcs.com`;
5. whether the GitHub Builds integration is still active and connected to either RC IT repository;
6. whether it is safe to classify this surface as legacy/stale for later cleanup.

No mutation is permitted while gathering this evidence.

## 17.1 closure gate

The primary account inventory is complete, but the cross-account ownership requirement is not yet satisfied.

**Module 17.1 remains OPEN. Do not begin 17.2 until the secondary Cloudflare account/build surface is classified and the resulting exact-head CI passes.**

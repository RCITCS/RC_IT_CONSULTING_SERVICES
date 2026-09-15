# Phase 17 — Domain & Subdomain Baseline

Status: **17.1 COMPLETE — read-only control-plane inventory closed**

Baseline source commit: `10deb2f6d3df301454e8f6f3a48a0f9a2b67d847`

Working branch: `phase17-domain-ownership-convergence`

## Scope

Phase 17 is a production-domain architecture and ownership-convergence phase. It does not redesign the public site or admin portal and does not add ATS, candidate portal, SMS/WhatsApp, AI, or other product features.

The Phase 17 invariant is:

> One authoritative production owner per hostname.

No DNS record, Worker route, Custom Domain, build target, or legacy binding may be removed merely because it appears old. Dependency proof is required first.

## 17.1 closure decision

Module 17.1 is closed after a read-only audit of repository declarations, public DNS/runtime behavior, the client Cloudflare control plane, and the cross-account Cloudflare build signal surfaced by exact-head CI.

No production DNS record, Worker route, Custom Domain, Worker setting, build configuration, secret, database object, email record, or application runtime behavior was changed during the audit.

The audit records conflicts and stale integration surfaces without resolving them. Resolution belongs to later Phase-17 modules.

## Authoritative client Cloudflare account

The RC IT client Cloudflare account is:

- Account ID: `3fdd024f6fbc25c03ed4481352576540`;
- managed zone: `rcitcs.com`;
- Zone ID: `cf815244b9dbd51a490747f597867c68`;
- zone status: **Active**;
- DNS setup: **Full**;
- registrar: Cloudflare;
- registration status: **Active**;
- Workers account subdomain: `rcitcservices.workers.dev`.

The client dashboard showed exactly two active Worker applications:

1. `rc-it-consulting-services`;
2. `rcitcs-admin-staging`.

The client account did **not** show active Worker applications named `rcitcs-admin-production` or `rcitcservices`.

All RC IT production-domain work in Phase 17 is scoped to this client account. No other Cloudflare account is an approved RC IT production owner.

## Client-account Worker ownership

### `rc-it-consulting-services`

Cloudflare shows:

| Binding | Type | Zone |
| --- | --- | --- |
| `admin.rcitcs.com/*` | Route | `rcitcs.com` |
| `www.rcitcs.com` | Production Custom Domain | `rcitcs.com` |
| `rcitcs.com` | Production Custom Domain | `rcitcs.com` |

Production and preview `workers.dev` URLs are enabled.

Cloudflare Builds state:

- repository: `RCITCS/RC_IT_CONSULTING_SERVICES`;
- production branch: `main`;
- root directory: `/`;
- no separate build command shown;
- version command: `npx wrangler versions upload`;
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

- repository: `RCITCS/RC_IT_CONSULTING_SERVICES`;
- production branch: `main`;
- root directory: `/`;
- build command: `npm run build`;
- deploy command: `npx wrangler deploy`;
- version command: `npx wrangler versions upload`;
- non-production branch builds enabled;
- dedicated `rcitcs-admin-staging` build token configured;
- no build variables or secrets configured;
- no deploy hooks;
- build cache enabled.

Cloudflare displays a configuration-drift warning instructing the repository root `wrangler.jsonc` to use `"name": "rcitcs-admin-staging"`. That conflicts with the repository model where root `wrangler.jsonc` is the public Worker configuration and staging has a separate Wrangler configuration. This is a later ownership/build-root convergence item, not a 17.1 mutation.

Active deployment captured during audit:

- Version ID `895c5744`;
- 100% traffic;
- latest successful build source `10deb2f6d3df301454e8f6f3a48a0f9a2b67d847` from `main`;
- 45 saved Worker versions shown.

A high dashboard error-rate percentage was visible at capture time. 17.1 does not classify that metric as a defect because deliberate rejection and smoke-test traffic can contribute to it.

## Authoritative DNS inventory

Cloudflare DNS showed **13 total active records** in the client `rcitcs.com` zone.

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

No old Vercel/Pages/third-party web-hosting pointer was visible in the complete client-zone DNS inventory.

## Known ownership conflicts

### Production admin overlap

`admin.rcitcs.com` is simultaneously represented by two Cloudflare mechanisms:

- `admin.rcitcs.com/*` Route -> `rc-it-consulting-services`;
- `admin.rcitcs.com` Production Custom Domain -> `rcitcs-admin-staging`.

This is a Phase-17 convergence finding. Nothing was deleted or reassigned during 17.1.

### `www.rcitcs.com` incomplete state

The earlier assumption that `www` was simply absent was incorrect.

Current evidence is:

- `rc-it-consulting-services` lists `www.rcitcs.com` as a Production Custom Domain;
- the DNS record table has no `www` row;
- Cloudflare warns that visitors cannot reach `www.rcitcs.com`;
- public DNS returns no A, AAAA, or CNAME answer for `www.rcitcs.com`.

Therefore `www` is configured at the Worker Custom Domain layer but not externally reachable. Repair belongs to 17.3.

## Source-controlled declarations versus client-account reality

| Surface | Source-controlled Worker | Current client-account reality |
| --- | --- | --- |
| Public | `rc-it-consulting-services` | active Worker |
| Canonical production admin | `rcitcs-admin-production` | config exists, Worker absent from client account |
| Connected admin deployment | `rcitcs-admin-staging` | active Worker; owns both admin Custom Domains |
| Legacy | `rcitcservices` | legacy source config exists; Worker absent from client account |

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

## Cross-account GitHub build signal

Exact-head CI surfaced a Cloudflare GitHub App check named:

`Workers Builds: rcitcservices`

Its details URL targets Cloudflare account ID `20d349f3f75ab611adb3f987188636e7` and a Worker/script named `rcitcservices`.

Read-only dashboard evidence established that account `20d349f3f75ab611adb3f987188636e7` is the project owner's separate/main Cloudflare account and is **not approved for RC IT work**. Its managed domains shown during the audit are:

- `infinexit.com`;
- `nxnlogistics.com`.

The account does not manage the `rcitcs.com` zone. Therefore the `Workers Builds: rcitcservices` check is classified as a **stale cross-account GitHub/Cloudflare build integration**, not as an authoritative RC IT domain owner.

Phase-17 rules for this surface:

- do not deploy RC IT to account `20d349f3f75ab611adb3f987188636e7`;
- do not create or move any `rcitcs.com` hostname, route, Custom Domain, DNS object, or production secret to that account;
- do not modify that account as part of ordinary RC IT implementation work;
- cleanup/disconnection of the stale repository build integration must be handled separately and only in a manner that preserves the user's unrelated domains and workloads;
- the existence of this stale build integration does not prevent 17.1 closure because it has been proven outside the authoritative `rcitcs.com` account/zone boundary.

## Hostname inventory at 17.1 closure

| Hostname / endpoint | Current authoritative state | 17.1 disposition |
| --- | --- | --- |
| `rcitcs.com` | Production Custom Domain / Worker DNS object owned by `rc-it-consulting-services`; live public site | identified; 17.2 may converge public production ownership without redesign |
| `www.rcitcs.com` | listed as public Worker Production Custom Domain but no DNS-table row/public resolution | identified broken/incomplete state; repair deferred to 17.3 |
| `admin.rcitcs.com` | Custom Domain on `rcitcs-admin-staging` plus Route to `rc-it-consulting-services` | competing ownership identified; convergence deferred to 17.4/17.7 |
| `admin-staging.rcitcs.com` | Custom Domain and Route on `rcitcs-admin-staging`; same Phase-16 release as production | identified; true staging isolation deferred to 17.5 |
| `rc-it-consulting-services.rcitcservices.workers.dev` | enabled production/preview compatibility surface | identified; exposure decision deferred to 17.10 |
| raw Supabase admin Edge Function | private admin upstream referenced server-side | exposure decision deferred to 17.10 |
| raw Supabase candidate Edge Function | candidate upstream referenced server-side | exposure decision deferred to 17.10 |

## 17.1 closure gate

All 17.1 requirements are satisfied:

- every production/staging/public-alias hostname has an identified current owner or explicitly recorded inconsistent state;
- the authoritative client Cloudflare account and zone are evidenced;
- active client-account Workers, Routes, Custom Domains, Builds projects, and DNS records are inventoried;
- proxied versus DNS-only state is known for the active zone inventory;
- stale/competing bindings are identified without premature deletion;
- the secondary personal Cloudflare account has been classified as outside the `rcitcs.com` ownership boundary and prohibited as an RC IT deployment target;
- live pre-change behavior is recorded;
- current control-plane/runtime truth is distinguished from historical source intent;
- no production behavior changed during the audit.

**Module 17.1 is COMPLETE. Phase 17.2 may begin only after this closure commit passes exact-head CI.**

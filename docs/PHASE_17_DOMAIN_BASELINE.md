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

Module 17.1 is closed after a read-only audit of repository declarations, public DNS/runtime behavior, and the authoritative Cloudflare control plane on 2026-09-15.

No production DNS record, Worker route, Custom Domain, Worker setting, build configuration, secret, database object, email record, or application runtime behavior was changed during the audit.

The audit deliberately records conflicts rather than resolving them. Resolution belongs to later Phase-17 modules.

## Cloudflare account and zone ownership

The authoritative Cloudflare dashboard established:

- the account contains exactly one managed domain: `rcitcs.com`;
- `rcitcs.com` zone status is **Active**;
- DNS setup is **Full**;
- registrar is Cloudflare and registration status is **Active**;
- Zone ID: `cf815244b9dbd51a490747f597867c68`;
- Account ID: `3fdd024f6fbc25c03ed4481352576540`;
- the Workers account subdomain is `rcitcservices.workers.dev`;
- both active RC IT Workers and the `rcitcs.com` zone are in this same Cloudflare account.

These IDs are account/zone identifiers, not credentials. No API token or secret value was exposed or copied during the audit.

## Active Worker inventory

Cloudflare Workers & Pages showed **exactly two Worker applications** in the account:

| Worker | Cloudflare state | Repository / build ownership | 17.1 interpretation |
| --- | --- | --- | --- |
| `rc-it-consulting-services` | exists and active | connected to `RCITCS/RC_IT_CONSULTING_SERVICES` | active public Worker and current route participant for production admin |
| `rcitcs-admin-staging` | exists and active | connected to `RCITCS/RC_IT_CONSULTING_SERVICES` | active admin Worker currently owning both admin Custom Domains |
| `rcitcs-admin-production` | **not present in this Cloudflare account** | source-controlled config exists only | intended future canonical production-admin config, not an active Worker today |
| `rcitcservices` | **not present as a Worker application** | legacy source config exists only | `rcitcservices.workers.dev` is the account subdomain, not a Worker named `rcitcservices` |

No additional untracked RC IT Worker was shown in the authoritative account inventory.

## Active Worker Routes and Custom Domains

### `rc-it-consulting-services`

Cloudflare shows:

| Binding | Type | Zone |
| --- | --- | --- |
| `admin.rcitcs.com/*` | Route | `rcitcs.com` |
| `www.rcitcs.com` | Production Custom Domain | `rcitcs.com` |
| `rcitcs.com` | Production Custom Domain | `rcitcs.com` |

Its production and preview `workers.dev` URLs are **enabled**.

### `rcitcs-admin-staging`

Cloudflare shows:

| Binding | Type | Zone |
| --- | --- | --- |
| `admin-staging.rcitcs.com/*` | Route | `rcitcs.com` |
| `admin-staging.rcitcs.com` | Production Custom Domain | `rcitcs.com` |
| `admin.rcitcs.com` | Production Custom Domain | `rcitcs.com` |

Its production and preview `workers.dev` URLs are **disabled**.

### Ownership conflict recorded for later convergence

`admin.rcitcs.com` currently participates in two Cloudflare mechanisms at the same time:

- `admin.rcitcs.com/*` is a Worker Route to `rc-it-consulting-services`;
- `admin.rcitcs.com` is a Production Custom Domain on `rcitcs-admin-staging`.

This is the central production-admin ownership conflict to resolve in later Phase-17 modules. Nothing was removed during 17.1.

## Authoritative DNS record inventory

Cloudflare DNS showed **13 total active records** for the zone.

Application/domain-relevant state:

| Hostname | Record/control-plane state | Proxy state |
| --- | --- | --- |
| `rcitcs.com` | Worker record bound to `rc-it-consulting-services` | Proxied |
| `admin.rcitcs.com` | Worker record bound to `rcitcs-admin-staging` | Proxied |
| `admin-staging.rcitcs.com` | Worker record bound to `rcitcs-admin-staging` | Proxied |
| `www.rcitcs.com` | no row in the DNS record table even though the public Worker shows it as a Production Custom Domain | no published DNS answer at audit time |
| `links.rcitcs.com` | Resend CNAME to `links1.resend-dns.com` | DNS only, 1 hour |
| apex MX | three Cloudflare Email Routing MX records | DNS only, Auto |
| `send.rcitcs.com` MX | Amazon SES feedback endpoint used by mail delivery | DNS only, 1 hour |
| TXT/DKIM/SPF | Cloudflare Email Routing, Google verification, and Resend/Amazon SES-related records | DNS only |

The apex Cloudflare Email Routing MX records observed were:

- `route2.mx.cloudflare.net` priority 55;
- `route1.mx.cloudflare.net` priority 59;
- `route3.mx.cloudflare.net` priority 68.

The apex TXT surface observed includes:

- Google site verification;
- `v=spf1 include:_spf.mx.cloudflare.net ~all`.

Cloudflare also surfaced a recommendation to add DMARC. That is evidence for the later email-domain verification/security module, not a 17.1 mutation.

No old Vercel/Pages/third-party web-hosting pointer was visible in the complete 13-record inventory. The non-Worker external records were mail/verification records.

## `www.rcitcs.com` mismatch

The audit corrected the earlier assumption that `www` was simply absent.

Authoritative Cloudflare state is internally inconsistent:

- `rc-it-consulting-services` lists `www.rcitcs.com` as a **Production Custom Domain**;
- the DNS record table has no `www` row;
- Cloudflare itself warns that visitors cannot reach `www.rcitcs.com`;
- the public DNS snapshot returned no A, AAAA, or CNAME answer for `www.rcitcs.com`.

Therefore 17.1 records `www` as **configured at the Worker Custom Domain layer but not externally reachable**. Module 17.3 must repair the canonical `www` strategy rather than assuming a clean unprovisioned state.

## Cloudflare Builds ownership

### Public Worker

`rc-it-consulting-services` Builds state:

- repository: `RCITCS/RC_IT_CONSULTING_SERVICES`;
- production branch: `main`;
- root directory: `/`;
- no separate build command;
- version command: `npx wrangler versions upload`;
- a configured deploy command is present;
- non-production branch builds are enabled;
- dedicated build API token is configured;
- build-time Supabase secret/storage/URL configuration is present;
- no deploy hooks;
- build cache enabled.

Its active deployment at audit time:

- Version ID `bacd55c6`;
- 100% traffic;
- source branch `main`;
- source commit `10deb2f6d3df301454e8f6f3a48a0f9a2b67d847`;
- active deployment error rate shown as 0% at capture time;
- 76 saved Worker versions were shown.

### Connected admin Worker

`rcitcs-admin-staging` Builds state:

- repository: `RCITCS/RC_IT_CONSULTING_SERVICES`;
- production branch: `main`;
- root directory: `/`;
- build command: `npm run build`;
- deploy command: `npx wrangler deploy`;
- version command: `npx wrangler versions upload`;
- non-production branch builds are enabled;
- dedicated `rcitcs-admin-staging` build token is configured;
- no build variables or secrets configured;
- no deploy hooks;
- build cache enabled.

Cloudflare displays an explicit configuration-drift warning instructing the repository root `wrangler.jsonc` to use:

```json
{
  "name": "rcitcs-admin-staging"
}
```

That warning conflicts with the repository ownership model where the root `wrangler.jsonc` is the public Worker configuration and staging has a separate Wrangler configuration. This is an ownership/build-root convergence finding for later Phase-17 work, not something changed during 17.1.

Its active deployment at audit time:

- Version ID `895c5744`;
- 100% traffic;
- source branch `main`;
- latest successful build source `10deb2f6d3df301454e8f6f3a48a0f9a2b67d847`;
- 45 saved Worker versions were shown.

A high dashboard error-rate percentage was visible for this Worker during capture. 17.1 does not classify it as a defect because the metric can include deliberate rejection/smoke-test traffic; runtime interpretation remains separate from the ownership audit.

## Source-controlled Worker declarations

| Surface | Source-controlled Worker | workers.dev | Declared custom domains | Baseline interpretation |
| --- | --- | ---: | --- | --- |
| Public corporate | `rc-it-consulting-services` | enabled | `rcitcs.com` | active public production Worker declaration |
| Admin production canonical config | `rcitcs-admin-production` | disabled | `admin.rcitcs.com` | intended canonical production-admin ownership, but Worker absent from current Cloudflare account |
| Connected admin deployment config carried from Phase 16 | `rcitcs-admin-staging` | disabled | `admin.rcitcs.com`, `admin-staging.rcitcs.com` | active Worker and current Custom Domain owner for both admin hostnames |
| Legacy Worker | `rcitcservices` | source config only | no company-domain route in checked-in legacy config | not present as an active Worker in the audited account |

The duplicate source declaration for `admin.rcitcs.com` remains a **known Phase-17 convergence finding**. Phase 16 deliberately used the connected `rcitcs-admin-staging` deployment target while retaining `rcitcs-admin-production` as the intended canonical production configuration.

## Application-level hostname behavior

The checked-in runtime and live baseline establish these boundaries:

- `rcitcs.com/admin` and `rcitcs.com/admin/*`:
  - GET/HEAD: `308` to `https://admin.rcitcs.com/...`;
  - non-GET/HEAD: rejected with `404`; the public host does not process admin credentials.
- `admin.rcitcs.com` and `admin-staging.rcitcs.com` are recognized as dedicated admin hosts.
- the public Worker's internal `*.workers.dev/admin` compatibility path remains implemented.
- the dedicated admin Worker proxies the private admin runtime and rewrites raw upstream admin-auth references before returning browser content.

## Exact-main production baseline

The Phase-16 closure SHA `10deb2f6d3df301454e8f6f3a48a0f9a2b67d847` established the pre-change production baseline:

- `https://rcitcs.com/` served the corporate public application;
- `https://admin.rcitcs.com/` rendered the private admin sign-in surface;
- `https://admin-staging.rcitcs.com/` was live and rendered the same Phase-16 admin release markers;
- `GET https://rcitcs.com/admin` returned `308` to `https://admin.rcitcs.com/`;
- `POST https://rcitcs.com/admin/login` returned `404`;
- production admin preserved `text/html`, `no-store`, `noindex`, CSP, framing protection, host-local routes, unauthenticated session rejection, and hostile-origin POST rejection.

The Phase-17 read-only baseline workflow additionally established:

- apex public DNS resolution through Cloudflare;
- `admin.rcitcs.com` and `admin-staging.rcitcs.com` public DNS resolution through Cloudflare;
- `www.rcitcs.com` public DNS non-resolution;
- live `200` on apex, production admin, and staging admin before Phase-17 mutations.

## Public DNS snapshot

Before any Phase-17 domain changes, the external DNS snapshot observed:

- authoritative nameservers `max.ns.cloudflare.com` and `venus.ns.cloudflare.com`;
- Cloudflare SOA authority;
- apex Cloudflare anycast A/AAAA answers;
- `admin.rcitcs.com` and `admin-staging.rcitcs.com` on the same Cloudflare anycast surface;
- no public CNAME answer for apex/admin/staging;
- no public A, AAAA, or CNAME answer for `www.rcitcs.com`;
- Cloudflare Email Routing MX records;
- Google site-verification and Cloudflare SPF TXT records;
- no public apex CAA answer at capture time.

## Hostname inventory at 17.1 closure

| Hostname / endpoint | Current authoritative state | 17.1 disposition |
| --- | --- | --- |
| `rcitcs.com` | Production Custom Domain / Worker DNS object owned by `rc-it-consulting-services`; live public site | identified; 17.2 will converge public production ownership without redesign |
| `www.rcitcs.com` | listed as public Worker Production Custom Domain but no DNS table row/public resolution | identified broken/incomplete state; repair deferred to 17.3 |
| `admin.rcitcs.com` | Custom Domain on `rcitcs-admin-staging` plus Route to `rc-it-consulting-services` | competing ownership identified; convergence deferred to 17.4/17.7 |
| `admin-staging.rcitcs.com` | Custom Domain and Route on `rcitcs-admin-staging`; same Phase-16 release as production | identified; true staging isolation deferred to 17.5 |
| `rc-it-consulting-services.rcitcservices.workers.dev` | enabled production/preview compatibility surface | identified; exposure decision deferred to 17.10 |
| raw Supabase admin Edge Function | private admin upstream referenced server-side | exposure decision deferred to 17.10 |
| raw Supabase candidate Edge Function | candidate upstream referenced server-side | exposure decision deferred to 17.10 |

## 17.1 closure gate

All 17.1 requirements are satisfied:

- every production/staging/public-alias hostname has an identified current owner or explicitly recorded inconsistent state;
- Cloudflare account/zone ownership is evidenced;
- active Workers, Routes, Custom Domains, Builds projects, and DNS records are inventoried;
- proxied versus DNS-only state is known for the active DNS inventory;
- stale/competing bindings are identified without premature deletion;
- live pre-change behavior is recorded;
- current control-plane/runtime truth is distinguished from historical source intent;
- no production behavior changed during the audit.

**Module 17.1 is COMPLETE. Do not alter this baseline retroactively. Phase 17.2 may begin only after this closure commit passes exact-head CI.**

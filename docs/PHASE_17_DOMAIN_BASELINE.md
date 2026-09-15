# Phase 17 — Domain & Subdomain Baseline

Status: **17.1 OPEN — control-plane inventory still required**

Baseline source commit: `10deb2f6d3df301454e8f6f3a48a0f9a2b67d847`

Working branch: `phase17-domain-ownership-convergence`

## Scope

Phase 17 is a production-domain architecture and ownership-convergence phase. It does not redesign the public site or admin portal and does not add ATS, candidate portal, SMS/WhatsApp, AI, or other product features.

The Phase 17 invariant is:

> One authoritative production owner per hostname.

No DNS record, Worker route, Custom Domain, build target, or legacy binding may be removed merely because it appears old. Dependency proof is required first.

## 17.1 evidence ledger

### Source-controlled Worker declarations

| Surface | Source-controlled Worker | workers.dev | Declared custom domains | Baseline interpretation |
| --- | --- | ---: | --- | --- |
| Public corporate | `rc-it-consulting-services` | enabled | `rcitcs.com` | Public production Worker declaration |
| Admin production canonical config | `rcitcs-admin-production` | disabled | `admin.rcitcs.com` | Intended canonical production-admin ownership |
| Connected admin deployment config carried from Phase 16 | `rcitcs-admin-staging` | disabled | `admin.rcitcs.com`, `admin-staging.rcitcs.com` | Known ownership overlap carried into Phase 17 |
| Legacy Worker | `rcitcservices` | source config only | no company-domain route in the checked-in legacy config | Must not be assumed deleted; account-level proof still required |

The duplicate source declaration for `admin.rcitcs.com` is a **known Phase-17 convergence finding**, not an accidental discovery to delete immediately. Phase 16 deliberately used the connected `rcitcs-admin-staging` deployment target for both admin hostnames while retaining `rcitcs-admin-production` as the intended canonical production configuration.

### Application-level hostname behavior

The checked-in runtime currently establishes these boundaries:

- `rcitcs.com/admin` and `rcitcs.com/admin/*`:
  - GET/HEAD: `308` to `https://admin.rcitcs.com/...`.
  - non-GET/HEAD: rejected with `404`; the public host does not process admin credentials.
- `admin.rcitcs.com` and `admin-staging.rcitcs.com` are recognized as dedicated admin hosts.
- the public Worker's internal `*.workers.dev/admin` compatibility path remains implemented.
- the dedicated admin Worker proxies the private admin runtime and rewrites raw upstream admin-auth references before returning browser content.

### Exact-main production evidence from 2026-09-15

The Phase-16 closure SHA `10deb2f6d3df301454e8f6f3a48a0f9a2b67d847` passed the production gates that establish this Phase-17 baseline:

- `https://rcitcs.com/` served the exact Phase-16 closure SHA and the corporate public application.
- `https://admin.rcitcs.com/` rendered the private admin sign-in surface with the Phase-16 build/media markers.
- `https://admin-staging.rcitcs.com/` was provisioned and rendered the same Phase-16 admin release markers.
- `GET https://rcitcs.com/admin` returned `308` to `https://admin.rcitcs.com/`.
- `POST https://rcitcs.com/admin/login` returned `404`.
- the production admin surface preserved `text/html`, `no-store`, `noindex`, CSP, framing protection, host-local routes, unauthenticated session rejection, and hostile-origin POST rejection.

This proves runtime behavior. It **does not prove Cloudflare account ownership or the complete DNS/control-plane state**.

### Phase-17.1 read-only audit evidence from 2026-09-15

The dedicated `Phase 17 Domain Baseline` GitHub Actions gate passed without mutating Cloudflare or production data. It established:

- `rcitcs.com`: public DNS resolution present through Cloudflare; live corporate surface returned `200`.
- `admin.rcitcs.com`: public DNS resolution present through Cloudflare; admin surface returned `200` with Phase-16 HTML/cache/indexing/build protections.
- `admin-staging.rcitcs.com`: public DNS resolution present through Cloudflare; admin surface returned `200` with the same Phase-16 build marker as production.
- `www.rcitcs.com`: **no public DNS resolution at the audit time**. There is therefore no live `www` canonical redirect today.
- `GET https://rcitcs.com/admin`: `308` to `https://admin.rcitcs.com/`.
- `POST https://rcitcs.com/admin/login`: `404`.

The Phase-17 PR head also passed the inherited full architecture/test/build gate, Wrangler dry-run validation for the public Worker plus both admin Worker configurations and the Cloudflare Builds admin root, Phase-12 deployed candidate/admin boundary smoke, Phase-13 secret-presence and transactional-email runtime gates, and Phase-14 authenticated contact-inbox runtime smoke.

### Public DNS snapshot

A second read-only Phase-17 baseline run captured the externally published DNS surface before any domain changes:

- authoritative nameservers:
  - `max.ns.cloudflare.com`
  - `venus.ns.cloudflare.com`
- SOA authority: Cloudflare (`max.ns.cloudflare.com` / `dns.cloudflare.com`).
- `rcitcs.com` public A answers:
  - `104.21.38.16`
  - `172.67.217.18`
- `rcitcs.com` public AAAA answers:
  - `2606:4700:3030::ac43:d912`
  - `2606:4700:3031::6815:2610`
- `admin.rcitcs.com` and `admin-staging.rcitcs.com` publish the same Cloudflare anycast A/AAAA surface.
- `rcitcs.com`, `admin.rcitcs.com`, and `admin-staging.rcitcs.com` expose no public CNAME answer.
- `www.rcitcs.com` exposes no public A, AAAA, or CNAME answer.
- apex MX currently uses Cloudflare Email Routing:
  - `route2.mx.cloudflare.net` priority 55
  - `route1.mx.cloudflare.net` priority 59
  - `route3.mx.cloudflare.net` priority 68
- apex TXT observed during the snapshot:
  - Google site-verification token
  - `v=spf1 include:_spf.mx.cloudflare.net ~all`
- no public apex CAA answer was observed.

These public DNS answers strongly establish Cloudflare delegation and current external reachability. They **cannot reveal** whether an A/AAAA result is backed by a proxied DNS object versus a Worker Custom Domain, the internal orange-cloud/proxy state, hidden origin values, inactive/stale records, Worker Routes, Custom Domain ownership, Builds ownership, or Cloudflare account/zone identifiers.

Public DNS non-resolution for `www` is therefore runtime evidence, not a substitute for inspecting the authoritative Cloudflare zone. The control-plane audit must still prove whether `www` is genuinely absent from the active zone and whether any stale/disabled/historical binding exists.

## Hostname inventory

| Hostname / endpoint | Purpose | Source state | Live baseline | 17.1 status |
| --- | --- | --- | --- | --- |
| `rcitcs.com` | public production | declared on public Worker | DNS present; Cloudflare A/AAAA; corporate site `200`; exact-main public site previously verified | runtime evidenced; control-plane owner proof open |
| `www.rcitcs.com` | public alias/canonical redirect candidate | no checked-in Worker-domain declaration found at baseline | **no public A/AAAA/CNAME; no public resolution** | control-plane absence proof open; provisioning belongs to 17.3 after 17.1 closes |
| `admin.rcitcs.com` | production admin | declared by production config and Phase-16 connected staging config | Cloudflare A/AAAA; admin portal `200` verified | ownership convergence open |
| `admin-staging.rcitcs.com` | admin staging | declared by Phase-16 connected staging config | Cloudflare A/AAAA; live `200`; same Phase-16 release as production | isolation/product decision open |
| `rc-it-consulting-services.rcitcservices.workers.dev` | public Worker compatibility endpoint | `workers_dev` enabled | exercised by existing CI | exposure decision deferred to 17.10 |
| raw Supabase admin Edge Function | private admin upstream | referenced server-side | exercised by historical CI | exposure decision deferred to 17.10 |
| raw Supabase candidate Edge Function | candidate upstream | referenced server-side | exercised by historical CI | exposure decision deferred to 17.10 |

## Evidence still required before 17.1 can close

The following must come from the authoritative Cloudflare account/control plane. Repository configuration, public DNS resolution, and public HTTP behavior are insufficient substitutes:

1. Cloudflare account and zone containing `rcitcs.com`, including authoritative zone/account ownership and zone ID/account ID evidence.
2. Complete active DNS object inventory for relevant RC IT hostnames, including record type, target/content, TTL, proxy state, and any duplicate/conflicting host objects.
3. Active Worker inventory and account ownership for:
   - `rc-it-consulting-services`
   - `rcitcs-admin-production`
   - `rcitcs-admin-staging`
   - `rcitcservices`
   - any untracked RC IT Worker still bound to a company hostname.
4. Active Worker Routes versus Custom Domains for each RC IT hostname.
5. Cloudflare Builds project ownership and production branch/build-root mapping for public and admin deployments.
6. Confirmation of any stale Worker-domain bindings or old hosting pointers that are still active.
7. Authoritative control-plane confirmation that `www.rcitcs.com` is absent/unprovisioned today, consistent with the public DNS result.

## 17.1 closure gate

Module 17.1 may be marked complete only when all of the following are true:

- every production/staging/public alias hostname has an identified current owner or explicitly evidenced absence;
- Cloudflare account/zone ownership is evidenced;
- active Workers, Routes, Custom Domains, Builds projects, and DNS records are inventoried;
- proxied versus DNS-only state is known;
- stale/competing bindings are identified without deleting them prematurely;
- live pre-change behavior is recorded;
- the evidence distinguishes current runtime truth from historical documentation;
- no production behavior has been changed during the audit.

Until then, status remains **17.1 OPEN** and work must not advance to 17.2.

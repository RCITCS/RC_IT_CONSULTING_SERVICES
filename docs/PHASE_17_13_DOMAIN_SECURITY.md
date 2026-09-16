# Phase 17.13 — Domain security verification

Status: **CLOSED — branch verification complete; DMARC/live activation remain final-main blockers**

Depends on Phase 17.12 closure SHA `0c1297dc8696cf39d1e3a0063039d2a499480777`.

Verification head: `e274574ecb125d17b22fee001dbf283aa5599ae5`.

## Security invariants

Phase 17 domain security is evaluated as a single ingress boundary rather than a collection of unrelated headers.

### Public production

- only `rcitcs.com` and canonical alias `www.rcitcs.com` are accepted public Hosts;
- HTTP is permanently redirected to HTTPS;
- HTTPS responses carry HSTS;
- `X-Content-Type-Options: nosniff` and framing protection remain active;
- public `/admin` navigation redirects to the dedicated admin domain while mutations fail closed;
- no sensitive backend publishes wildcard browser CORS;
- `workers.dev` and preview URLs are disabled by source configuration.

### Production admin

- `admin.rcitcs.com` is the only production-admin Host;
- responses are `no-store`, `noindex`, framing-denied and protected by CSP;
- HSTS remains active;
- cookies stay secure/host-local rather than introducing a parent-domain `Domain=rcitcs.com` cookie;
- mutating requests retain same-origin/CSRF authority;
- raw Supabase endpoints are not the canonical browser identity.

### Staging admin

- `admin-staging.rcitcs.com` is a separate staging Host;
- final production state is intentionally unavailable, not an alias of production admin;
- staging remains `no-store` and `noindex`.

### Email-domain authentication

SPF, DKIM, return-path and tracking DNS are verified by 17.11. `_dmarc.rcitcs.com` remains absent in the pre-merge production state and is therefore an explicit final-production blocker.

Required initial DMARC record:

`v=DMARC1; p=none; rua=mailto:dmarc@rcitcs.com; adkim=s; aspf=s; pct=100`

The initial `p=none` policy is intentional monitoring. Any later move to quarantine/reject requires mail-flow evidence and is outside Phase 17.

## Control-plane boundary

The authoritative RC IT Cloudflare account remains account `3fdd024f6fbc25c03ed4481352576540` and zone `cf815244b9dbd51a490747f597867c68`, as established in the immutable 17.1 audit. The stale GitHub App build into account `20d349f3f75ab611adb3f987188636e7` is not accepted as RC IT production authority and cannot satisfy a Phase-17 production gate.

## Exact-head closure evidence

Verification head `e274574ecb125d17b22fee001dbf283aa5599ae5` completed 21 check runs with no failures. The dedicated Phase-17.13 gate proved:

- source security invariants for all canonical Workers;
- current public HTTPS/HSTS, nosniff and framing headers;
- current production-admin HSTS, no-store, noindex, framing and CSP headers;
- no permissive wildcard CORS at the admin surface;
- DMARC state classified explicitly rather than silently accepted;
- final-main ownership/staging/workers.dev checks remain reserved for post-merge activation.

Full RC IT Services CI, Wrangler validation and inherited Phase-17 gates completed without failure.

## Final-main security gate

Overall Phase 17 cannot close until post-deployment checks prove all of the following together:

1. HTTPS/HSTS on public and admin hosts;
2. canonical www and `/admin` behavior;
3. production admin ownership marker;
4. staging unavailable marker;
5. alternate `workers.dev` production exposure removed;
6. sensitive direct backend requests rejected;
7. no permissive browser CORS on sensitive surfaces;
8. exactly one valid `_dmarc.rcitcs.com` TXT policy;
9. existing SPF/DKIM/Email Routing records remain intact.

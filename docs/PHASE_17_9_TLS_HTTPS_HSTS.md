# Phase 17.9 — TLS / SSL / HTTPS / HSTS

Status: **IMPLEMENTED — exact-head verification pending**

Depends on: Phase 17.8 closure SHA `319fa76683e1e6d865eedaaabf206728631c91a1`.

## Objective

Make encrypted transport a source-enforced invariant for every RC IT web/admin hostname and prove that the Cloudflare edge presents a valid HTTPS endpoint with a durable HSTS policy.

Approved hostnames:

- `rcitcs.com`
- `www.rcitcs.com`
- `admin.rcitcs.com`
- `admin-staging.rcitcs.com`

## Source transport policy

The public and admin Worker entrypoints now enforce:

- HTTP requests on approved company hostnames are permanently redirected to the same HTTPS URL with status `308`;
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` is attached to public responses, canonical `www` redirects, public `/admin` responses, production-admin responses, admin interaction assets, and the intentional staging-unavailable response;
- HTTPS enforcement is host-scoped and does not rewrite arbitrary `workers.dev` or unrelated hostnames;
- redirect targets are constructed by changing only the trusted URL scheme, preserving hostname/path/query and avoiding host injection.

The HSTS `preload` token declares policy intent only. This module does not claim that rcitcs.com has been submitted to or accepted by the external browser preload list.

## Cloudflare/TLS boundary

TLS termination for the company Custom Domains is owned by Cloudflare. Wrangler source cannot independently set the zone's certificate lifecycle or edge minimum TLS setting.

The final-main verification gate therefore proves the externally observable contract:

1. every approved HTTPS hostname completes a valid TLS handshake through `curl`;
2. every approved hostname responds over HTTPS;
3. the response includes the required HSTS policy;
4. plain HTTP reaches a permanent redirect whose `Location` is HTTPS;
5. the redirect stays on the same approved hostname except for `www`, whose canonical destination may be the approved apex as defined by 17.3.

## Security invariants preserved

17.9 does not weaken or replace:

- Phase-16 admin no-store/noindex/CSP/framing controls;
- Phase-16 host-only admin session authority;
- Phase-17.6 public `/admin` mutation rejection;
- Phase-17.7 one-owner-per-host topology;
- Phase-17.8 DNS conflict policy.

## Regression coverage

`tests/phase17-transport-security.mjs` validates Worker-level HTTPS redirection, HSTS propagation, canonical `www` transport behavior, production/staging admin transport behavior, and host scoping.

`.github/workflows/phase17-transport-security.yml` validates source behavior on every PR, classifies the existing live edge without mutation, and requires the full HTTPS/HSTS contract after final-main activation.

## Closure criteria

17.9 may close at branch level when:

- public and admin source paths enforce HTTPS/HSTS;
- redirect behavior is regression-tested;
- existing admin security headers remain preserved;
- candidate Wrangler bundles compile;
- the dedicated 17.9 workflow passes;
- full inherited CI remains green.

Overall Phase-17 closure still requires post-main live verification on all approved hostnames.

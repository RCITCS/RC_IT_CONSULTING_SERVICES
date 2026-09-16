# Phase 17.12 — Redirect and canonical-host matrix

Status: **CLOSED — branch verification complete; final-main live activation remains a Phase-17.16 gate**

Depends on Phase 17.11 closure SHA `7a2c9f40ee3fd067f0188ed323ea0e4b6d0ebda4`.

Verification head: `c0422252f915d7af1da320fee3134308301819b2`.

## Canonical authorities

| Incoming surface | Method | Required result |
| --- | --- | --- |
| `http://rcitcs.com/*` | any | `308` to the identical path/query on `https://rcitcs.com` |
| `https://rcitcs.com/*` | normal public request | served by the public production Worker |
| `http://www.rcitcs.com/*` | any | transport redirect, ultimately canonical HTTPS apex |
| `https://www.rcitcs.com/*` | any | `308` to identical path/query on `https://rcitcs.com` |
| `https://rcitcs.com/admin` | GET/HEAD | `308` to `https://admin.rcitcs.com/` |
| `https://rcitcs.com/admin/<path>` | GET/HEAD | `308` to the same suffix/query on `https://admin.rcitcs.com/<path>` |
| `https://rcitcs.com/admin*` | POST/PUT/PATCH/DELETE | fail closed; never proxy or authenticate through the public host |
| `https://admin.rcitcs.com/admin*` | GET/HEAD legacy bookmark | `308` to the canonical path on the same admin host |
| `https://admin.rcitcs.com/admin*` | mutation | `409`; caller must reload canonical admin route before resubmitting |
| `https://admin.rcitcs.com/*` | canonical admin | dedicated production-admin authority only |
| `https://admin-staging.rcitcs.com/*` | final production state | intentionally unavailable staging boundary, not a production alias |

## Redirect safety properties

- Redirect targets are built from pinned trusted origins rather than resolving an untrusted request path as a URL reference.
- Paths and query strings are preserved across public canonicalization.
- `//example.invalid`-style path input cannot become a protocol-relative open redirect.
- Public `/admin` mutation requests are never redirected with credentials or replayed against the admin domain.
- Admin legacy-route migration never changes the hostname.
- Redirect responses carry transport/security headers and do not become a cacheable authentication surface.

## Closure evidence

The Phase-17.12 exact-head suite proved:

- the source/runtime redirect matrix with executable Request/Response assertions;
- public `/admin` GET redirect and mutation rejection against the current live domain;
- legacy admin path canonicalization on the dedicated admin host;
- open-redirect resistance for protocol-relative-looking paths;
- full RC IT Services CI, Wrangler validation and all inherited Phase-17 gates without failure.

## Final-main acceptance

After merge/deployment, the live workflow must prove the complete HTTP/HTTPS, apex/www, public/admin and staging matrix. Pull-request runs prove source behavior and classify current production without pretending that unmerged custom-domain changes are active.

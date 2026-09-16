# Phase 17.14 — Production browser/runtime acceptance

Status: **CLOSED — branch/runtime baseline verified; exact-main live activation remains Phase 17.16**

Depends on Phase 17.13 closure SHA `227af34a185311a2250274eff213f1a5a186a6c4`.

Verification head: `d5049b42750c18d501c3410e39f267db05872579`.

## Objective

Make the final Phase-17 production acceptance executable against the actual browser-facing authorities rather than legacy compatibility URLs.

## Production browser authorities

- Public: `https://rcitcs.com`
- Canonical alias: `https://www.rcitcs.com` -> permanent redirect to apex
- Production admin: `https://admin.rcitcs.com`
- Staging admin: `https://admin-staging.rcitcs.com`, intentionally unavailable in the final Phase-17 state

`workers.dev`, Vercel and raw Supabase URLs are not accepted production browser identities.

## Inherited CI correction

The historical `RC IT Services CI` main-only production smoke targeted `rc-it-consulting-services.rcitcservices.workers.dev`, tested a Vercel fallback and used raw backend surfaces as positive browser/runtime acceptance endpoints. Those assumptions conflict with Phase 17.10, which deliberately closes alternate production ingress.

17.14 moved that smoke coverage to `https://rcitcs.com` and `https://admin.rcitcs.com` while retaining the useful page, Careers, application, SEO, cache, authentication and security assertions. Its main-only deployment assertions now also verify staging isolation and `workers.dev` shutdown.

## Acceptance matrix

Final-main browser/runtime acceptance requires:

- apex home and representative deep public routes return rendered HTML;
- public API health remains healthy;
- Careers vacancy, application noindex, sitemap/robots and immutable asset cache behavior remain intact;
- `www` permanently canonicalizes to apex with path/query preservation;
- public `/admin` GET/HEAD redirects to production admin while mutation requests fail closed;
- production admin returns HTML, not raw source, with no-store, noindex, CSP, framing protection and HSTS;
- unauthenticated admin session remains `401`;
- hostile cross-origin admin mutation remains rejected;
- production admin exposes the `production` environment ownership marker;
- staging returns the intentional `503` state with staging markers;
- public `workers.dev` does not serve the site after Phase-17 deployment;
- the exact merged main SHA is observable from the public deployment marker before final closure.

## Closure evidence

Verification head `d5049b42750c18d501c3410e39f267db05872579` completed 22 check runs with no failures. The dedicated 17.14 gate proved the source acceptance contract plus the current apex/admin production baseline. Full CI and all inherited Phase-17 workflows were green; final-main-only deployment assertions remained correctly skipped on the pull request.

## Scope boundary

This is production-domain runtime acceptance only. It does not replace Phase 18 responsive testing, Phase 19 final SEO/performance/accessibility certification, or Phase 20 overall release certification.

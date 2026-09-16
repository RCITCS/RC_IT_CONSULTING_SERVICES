# Phase 17.10 — Origin, Host, CORS and Direct-Backend Exposure Hardening

Status: **17.10 COMPLETE — branch-level exposure hardening closed; final-main live exposure verification remains mandatory for overall Phase-17 closure**

Depends on: Phase 17.9 closure SHA `1fe7be84803fccca8cde7e526d88e49ed2444c7b`.

Verified implementation SHA: `7f867dd9e04c1f5982f44b8d208f44ac3317c9c0`.

## Objective

Make the approved RC IT company domains the only public production ingress and prevent alternate Worker/origin/backend surfaces from silently becoming a second production path.

## Worker exposure policy

All active RC IT Wrangler configs now explicitly declare:

- `workers_dev: false`
- `preview_urls: false`

The approved public Worker remains reachable only through its Custom Domains:

- `rcitcs.com`
- `www.rcitcs.com`

Production and staging admin Workers remain reachable only through their dedicated Custom Domains.

The public Worker additionally fails closed with `404` + `no-store` for any hostname outside the approved public/admin host sets. This is defense in depth against an accidental future route or alternate-host exposure.

## Candidate application ingress

Candidate intake is now Cloudflare-production-only:

- accepted browser origins: `https://rcitcs.com`, `https://www.rcitcs.com`;
- accepted trusted proxy: `cloudflare` only;
- retired production origins such as the historical `workers.dev` and Vercel surfaces are rejected before Supabase is called;
- the Supabase candidate Edge Function still requires the modern service credential, proxy marker, approved original origin and bounded trusted client IP;
- no browser CORS header is emitted by the sensitive intake service.

## Public Careers backend boundary

The Careers projection remains public information, but the raw Supabase Edge Function is no longer an anonymous alternate application endpoint.

The Cloudflare Worker now authenticates to `public-careers` with the existing encrypted `SUPABASE_SECRET_KEY` and an explicit `x-rcitcs-public-proxy: cloudflare` marker. The Edge Function validates the bearer credential in constant time before querying the server-only RPC.

The secret remains encrypted in Cloudflare/Supabase runtime configuration and is never rendered into browser HTML or committed as a plaintext Wrangler variable.

## Admin backend boundary

The admin browser authority remains `https://admin.rcitcs.com`. Existing controls remain intact:

- dedicated Host ownership;
- Cloudflare proxy marker;
- same-origin Origin/Referer/fetch-metadata validation for mutations;
- CSRF validation;
- secure host-local cookies;
- no browser CORS enablement;
- rate limiting and authenticated server authority.

A raw Supabase URL is not a supported admin origin and is never used as the canonical browser/admin identity.

## CORS policy

RC IT production browser flows are same-origin. Sensitive Supabase Edge Functions do not publish `Access-Control-Allow-Origin: *` or another browser CORS grant. Cross-origin browser access is therefore not part of the application contract.

## Final-main activation

The final-main gate must prove:

1. apex and canonical `www` Custom Domains remain operational;
2. the public `workers.dev` production URL no longer serves the RC IT website;
3. version/preview URLs are disabled by configuration;
4. direct unauthenticated candidate and Careers Edge POSTs are rejected;
5. the public website does not expose a permissive CORS policy;
6. public `/admin` mutations remain rejected and dedicated admin Host isolation remains intact.

## Closure evidence

Exact-head verification on `7f867dd9e04c1f5982f44b8d208f44ac3317c9c0` passed:

- Phase 17.10 Origin Host CORS Hardening;
- RC IT Services CI;
- Wrangler Deployment Validation;
- Phase 17.2–17.9 inherited domain gates;
- Phase-12/13/14 inherited runtime/security gates.

The final stale regression fixture was the sitemap runtime mock, which was updated to model the authenticated Cloudflare-to-Careers backend boundary without changing sitemap behavior.

## Closure criteria

All branch-level 17.10 criteria are satisfied: source/config hardening, backend-boundary regression tests, Wrangler dry-runs, dedicated 17.10 CI and full inherited CI are green.

Final Phase-17 closure still requires the post-main exposure checks against the deployed Cloudflare/Supabase surfaces.

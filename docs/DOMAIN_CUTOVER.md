# RC IT Services — Production Domain Cutover

## Approved production host model

- canonical public origin: `https://rcitcs.com`
- compatibility hostname: `https://www.rcitcs.com` → permanent 308 redirect to the same apex path/query
- temporary Cloudflare origin: `https://rcitcservices.frsmkgit.workers.dev` retained only as an operational/debug surface and search-isolated with `X-Robots-Tag: noindex, nofollow`
- Cloudflare branch previews remain noindex through the existing build-time preview gate and runtime secondary-origin header
- Vercel remains a secondary globally-noindex fallback

## Cloudflare ownership

The first production attempt declared apex and `www` as Worker Custom Domains. The application and preview builds passed, but Cloudflare rejected production route promotion before either hostname became live. Because Custom Domain creation replaces/creates DNS records and cannot attach to a hostname with a conflicting CNAME, the controlled hotfix uses zone-scoped Worker routes for both hostnames instead of attempting DNS replacement.

Current Wrangler production routes are:

- `rcitcs.com/*` in zone `rcitcs.com`
- `www.rcitcs.com/*` in zone `rcitcs.com`

This route model uses the existing Cloudflare DNS hostname records and only attaches the Worker execution route. Workers Builds already has the required Workers Routes permission. If live verification proves either hostname lacks a proxied DNS record, DNS provisioning remains the next infrastructure action rather than being hidden behind a false successful deploy.

## SEO ownership

`https://rcitcs.com` remains the default `SITE_ORIGIN`. Canonicals, sitemap URLs, robots sitemap reference, Organization/WebSite/WebPage identifiers, Service schema and social URL metadata therefore point at the real production domain. The temporary Workers hostname must never regain canonical ownership.

## Email routing boundary

Incoming domain mail will use Cloudflare Email Routing with `rcitcservices@gmail.com` as the destination mailbox after that destination is verified in Cloudflare. Planned inbound aliases include `info@rcitcs.com`, `contact@rcitcs.com`, `support@rcitcs.com`, `career@rcitcs.com` and `legal@rcitcs.com`.

Outbound transactional mail remains the Phase 13 provider responsibility (Resend or another approved sender) and is not implemented by this cutover.

## Verification gate

After merge to `main`, CI must prove:

1. the Cloudflare production deploy succeeds with both zone routes
2. `rcitcs.com` resolves and serves all protected deep routes and `/api/health` over HTTPS
3. canonical metadata, sitemap and robots use `https://rcitcs.com`
4. `www.rcitcs.com` returns a permanent redirect preserving path/query
5. the workers.dev production hostname returns `X-Robots-Tag: noindex, nofollow`
6. real 404, legacy redirects, immutable assets and HTML revalidation remain correct
7. Vercel fallback remains reachable and isolated

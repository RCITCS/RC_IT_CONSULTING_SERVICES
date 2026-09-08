# RC IT Services — Production Domain Cutover

## Approved production host model

- canonical public origin: `https://rcitcs.com`
- compatibility hostname: `https://www.rcitcs.com` → permanent 308 redirect to the same apex path/query
- temporary Cloudflare origin: `https://rcitcservices.frsmkgit.workers.dev` retained only as an operational/debug surface and search-isolated with `X-Robots-Tag: noindex, nofollow`
- Cloudflare branch previews remain noindex through the existing build-time preview gate and runtime secondary-origin header
- Vercel remains a secondary globally-noindex fallback

## Cloudflare ownership

The Worker declares both apex and `www` as Custom Domains in `wrangler.jsonc`. On the production `main` deployment, Wrangler/Cloudflare owns the hostname mapping, DNS record creation and certificate issuance. Non-production Workers Builds use `wrangler versions upload`, so branch previews create Worker versions without promoting the production domain routes.

## SEO ownership

`https://rcitcs.com` is the default `SITE_ORIGIN`. Canonicals, sitemap URLs, robots sitemap reference, Organization/WebSite/WebPage identifiers, Service schema and social URL metadata therefore point at the real production domain. The temporary Workers hostname must never regain canonical ownership.

## Email routing boundary

Incoming domain mail will use Cloudflare Email Routing with `rcitcservices@gmail.com` as the destination mailbox after that destination is verified in Cloudflare. Planned inbound aliases include `info@rcitcs.com`, `contact@rcitcs.com`, `support@rcitcs.com`, `career@rcitcs.com` and `legal@rcitcs.com`.

Outbound transactional mail remains the Phase 13 provider responsibility (Resend or another approved sender) and is not implemented by this cutover.

## Verification gate

After merge to `main`, CI must prove:

1. `rcitcs.com` serves all protected deep routes and `/api/health` over HTTPS
2. canonical metadata, sitemap and robots use `https://rcitcs.com`
3. `www.rcitcs.com` returns a permanent redirect preserving path/query
4. the workers.dev production hostname returns `X-Robots-Tag: noindex, nofollow`
5. real 404, legacy redirects, immutable assets and HTML revalidation remain correct
6. Vercel fallback remains reachable and isolated

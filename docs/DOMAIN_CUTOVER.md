# RC IT Services — rcitcs.com Cutover Status

## Status

`PENDING CLOUDFLARE ACCOUNT / ZONE LINKAGE`

The requested production domain is `rcitcs.com` with `www.rcitcs.com` normalized to the apex domain. Two controlled production attempts were made after all application and preview checks passed:

1. Worker Custom Domains for `rcitcs.com` and `www.rcitcs.com`.
2. Zone-scoped Worker routes for `rcitcs.com/*` and `www.rcitcs.com/*`.

Both were rejected by Cloudflare at production route promotion while the same source built successfully and uploaded as a branch Worker version. This proves the application bundle is valid and isolates the blocker to production access to the `rcitcs.com` Cloudflare zone from the existing `rcitcservices` Worker/Workers Builds deployment identity.

## Safety recovery

Until the account/zone linkage is corrected, production configuration intentionally remains on the verified Workers endpoint:

`https://rcitcservices.frsmkgit.workers.dev`

The SEO canonical origin, sitemap, robots reference and production route verification also remain on that working origin. This avoids advertising an unreachable canonical domain or accidentally applying `noindex` to the only live production origin.

## Required infrastructure resolution

The Worker deployment identity and the `rcitcs.com` zone must be in an accessible Cloudflare account scope with permission to attach the Worker to the zone. Once that is true, the preferred final model remains Worker Custom Domains because this Worker is the website origin; Cloudflare can then own the DNS mapping and TLS issuance.

The cutover must be re-applied and live-verified before `rcitcs.com` is declared production.

## Email boundary

The intended inbound destination remains `rcitcservices@gmail.com`. Cloudflare Email Routing aliases are still planned for `info@rcitcs.com`, `contact@rcitcs.com`, `support@rcitcs.com`, `career@rcitcs.com` and `legal@rcitcs.com`. Email Routing requires the destination verification and zone-level routing configuration; it has not been falsely marked configured.

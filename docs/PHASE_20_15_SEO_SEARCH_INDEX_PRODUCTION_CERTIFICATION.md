# Phase 20.15 SEO & Search-Index Production Certification

## Scope

Certifies production sitemap, robots, canonical metadata, structured data, dynamic JobPosting data, index/noindex boundaries and exclusion of private/admin surfaces.

## Production model

Published vacancies are database-backed at runtime. Static build tests alone are insufficient. The production gate therefore requires representative live vacancy URLs to appear in the dynamic sitemap and verifies their runtime JobPosting JSON-LD.

Application routes remain crawlable so page-level directives can be observed, but they must be `noindex,nofollow` and must not appear in the sitemap.

The dedicated admin origin must remain noindex/no-store and absent from every public discovery surface.

## Closure

20.15 closes only after exact-head inherited verification, production discovery/metadata acceptance, exact-head merge and post-merge exact-SHA production acceptance.

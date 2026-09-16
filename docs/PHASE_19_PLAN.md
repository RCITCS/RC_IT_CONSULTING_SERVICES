# Phase 19 — SEO, Accessibility & Performance Certification

## Status

**IN PROGRESS**

Baseline commit: `396db981e7a9cf768f23c8a54d6038742d15bffc` (Phase 18 closure)

Working branch: `phase19-seo-performance-accessibility`

Phase 19 is a production quality-certification phase. It does not redesign the approved public website, add ATS features, reopen Phase 18 responsive work, or introduce infrastructure simply because a generic checklist recommends it.

## Governing rules

1. Work sequentially through 19.1–19.18. A material finding reopens the relevant gate and blocks final closure.
2. Preserve approved UX and product behavior unless a defect requires a targeted correction.
3. Measure before optimizing. No speculative indexes, caches, load balancers, libraries, rewrites, or dependency additions.
4. Public discovery surfaces may be indexable. Admin, staging, authenticated, application-submission, and other private surfaces remain excluded as appropriate.
5. Caching must never expose candidate, contact, session, admin, document, or other private responses across users.
6. Database optimization is query-plan and workload driven. An `unused_index` advisory alone is not sufficient evidence to remove an index.
7. Completion requires source contracts, production build verification, browser/runtime evidence, security regression evidence, and final cross-role review.
8. Exact-SHA production acceptance belongs at closure. A successful local build or CI run alone is not Phase-19 completion.

## Existing controls inherited from earlier phases

The Phase-18 baseline already contains substantial quality architecture that Phase 19 must preserve and strengthen:

- canonical production origin `https://rcitcs.com`
- per-route titles and descriptions
- route-specific index/noindex policy
- canonical links
- Open Graph and Twitter metadata
- Organization, WebSite, WebPage, Breadcrumb, Service and JobPosting JSON-LD where applicable
- generated `sitemap.xml`
- generated `robots.txt`
- legacy redirect model
- internal-link route validation
- prerendering of public routes and published jobs
- route-level JavaScript splitting
- route CSS splitting
- gzip performance budgets
- immutable caching for hashed assets
- HTML revalidation policy
- Phase-18 Chromium/Firefox/WebKit responsive matrix
- admin `no-store`, `noindex`, HTTPS/HSTS and domain separation controls

Phase 19 therefore audits and certifies these mechanisms instead of creating duplicate sources of truth.

## Module sequence

### 19.1 — SEO Baseline & Crawl Inventory

- inventory canonical public routes, service detail routes, published job routes and non-indexable application/private routes
- verify every canonical route has a resolvable content renderer and SEO descriptor
- inventory legacy redirects and route aliases
- establish production crawl acceptance set

### 19.2 — Indexation, Robots & Canonical Architecture

- verify self-canonical public pages
- verify index/noindex policy by route class
- ensure admin and private surfaces cannot become search results
- verify preview/non-production indexation behavior
- verify canonical host remains `rcitcs.com`

### 19.3 — Metadata & Social Sharing

- verify unique, meaningful titles and descriptions
- verify Open Graph and Twitter metadata
- verify absolute social image URLs and canonical URLs
- avoid arbitrary character-count rules that are not search-engine requirements

### 19.4 — Sitemap & URL Architecture

- sitemap contains only eligible canonical URLs
- no legacy aliases, login, application forms, admin URLs or duplicate hosts
- preserve clean stable route slugs unless evidence requires migration

### 19.5 — Heading, Semantic HTML & Content Structure

- one primary page H1 is the RC IT Services project convention
- valid main-content landmark on public routes
- semantic section structure and accessible navigation contracts
- do not treat raw H1 count as a substitute for semantic review

### 19.6 — Structured Data / Schema

- validate Organization/WebSite/WebPage/Breadcrumb/Service/JobPosting graph contracts
- only emit schema supported by visible page data
- published vacancy structured data must stay synchronized with the real job model

### 19.7 — Internal Linking & Broken-Link Audit

- crawl every generated internal link
- prohibit links to legacy aliases from canonical pages
- validate query/hash links against their canonical pathname
- verify redirects deliberately preserve intended destination behavior

### 19.8 — Image SEO & Media Optimization

- meaningful images require alt text
- decorative images may use empty alt where appropriate
- verify dimensions/loading behavior where applicable
- compress/convert only where measurable transfer savings justify it
- avoid lazy-loading likely LCP/above-fold media

### 19.9 — Accessibility / WCAG Audit

Target: WCAG 2.2 AA engineering conformance for the tested public/admin surfaces.

- landmarks and document structure
- keyboard navigation
- focus visibility and focus order
- accessible names for controls
- labels and validation for forms
- contrast-sensitive regressions
- reduced-motion behavior where relevant
- modal/menu semantics
- touch-target regressions retained from Phase 18

### 19.10 — Core Web Vitals

- measure LCP, INP and CLS on representative production/public routes
- optimize only measured bottlenecks
- preserve functional and visual behavior while correcting regressions

### 19.11 — Frontend Runtime Performance

- inspect network and runtime behavior
- prevent avoidable duplicate work and unnecessary render/event churn
- retain efficient route loading
- measure before adding debounce/throttle behavior

### 19.12 — Bundle / Code-Splitting / Dependency Optimization

- retain route-level JavaScript and CSS splitting
- verify initial and lazy-chunk budgets
- identify genuinely unused dependencies
- no dependency churn without measurable benefit

### 19.13 — API & Network Performance

- inspect public careers, contact and admin request behavior
- validate payload size, pagination where operational datasets warrant it, compression and request count
- do not cache authenticated/private responses without isolation proof

### 19.14 — Database Query & Index Performance

- Supabase performance advisor
- `pg_stat_statements` workload evidence
- table/index statistics
- EXPLAIN/plan review for material application queries when needed
- no generic index creation/removal

Current Phase-19 baseline evidence: Supabase reports `unused_index` INFO findings, while many core indexes show real scan activity and current tables are small. No index is approved for removal solely from the advisor result.

### 19.15 — Caching & Delivery Architecture

- verify Cloudflare/existing delivery rather than adding another CDN
- immutable cache only for content-addressed static assets
- revalidate HTML/dynamic public content correctly
- preserve `no-store` for authenticated/admin/private responses
- prove no cross-user cache leakage

### 19.16 — Lighthouse & Automated Quality Gates

- source-level Phase-19 contract
- build/SEO/performance regression suite
- representative browser accessibility/runtime checks
- production HTTP checks
- quality evidence must be reproducible in CI

### 19.17 — Search Console / Production SEO Verification

- verify ownership/setup requirements for the canonical property
- production `robots.txt` and `sitemap.xml` reachable
- canonical host/redirect behavior remains correct
- distinguish engineering readiness from search-engine crawl/index timing

### 19.18 — Final Cross-Role Production Acceptance

Required independent perspectives:

- Product Owner
- Solution/Software Architect
- Senior Frontend
- Backend/API
- Database
- QA
- Security
- SEO
- Performance
- Accessibility
- End User/Admin

Any material issue reopens its owning module.

## Closure gate

Phase 19 can be marked **COMPLETED & VERIFIED** only when:

- 19.1–19.18 are closed
- branch source is clean and reviewable
- all Phase-19 and inherited regression gates are green at the exact head SHA
- no unresolved review thread or known material defect remains
- production is verified at the exact merged SHA
- canonical public SEO surfaces pass production crawl checks
- admin/private indexation and cache controls remain intact
- Supabase security advisor remains clear or every finding is explicitly resolved/accepted with evidence
- performance findings are evidence-based and no speculative DB/infrastructure change remains
- primary and company mirror are reconciled according to the existing repository ownership process

Phase 20 remains the overall production release-certification phase.
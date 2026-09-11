# RC IT Services — SEO Architecture Contract

## Purpose

Phase 6 converted the public website from a client-rendered SPA shell into a prerendered public site while retaining the existing client-side components and interactions. Phase 11 moved vacancy authority into PostgreSQL and Phase 12 activated the real candidate application journey. Search engines and non-JavaScript clients must receive route-specific HTML content, metadata and semantics directly in the initial response, while runtime-owned vacancies remain consistent with the database authority.

## Source of truth

`src/frontend/seo/seo-config.js` owns:

- public production origin
- static-page metadata
- legacy redirect definitions
- the deployment search-indexing gate
- the explicit job-search eligibility gate

`src/frontend/seo/seo-model.js` owns the static SEO model:

- canonical URL generation
- service/industry metadata derived from route data
- service-detail metadata
- index/noindex policy
- Open Graph and social metadata
- Organization, WebSite, WebPage, Service and BreadcrumbList JSON-LD
- static sitemap route selection and XML rendering
- robots rules
- redirect output

`src/backend/runtime/public-careers.js` and `src/backend/runtime/job-posting.js` own database-backed vacancy SEO at request time:

- canonical single-job metadata
- runtime index/noindex preservation
- eligible `JobPosting` JSON-LD derived from the same public vacancy content shown to candidates
- application-route `noindex,nofollow`
- preview-indexing isolation

`src/backend/runtime/public-sitemap.js` augments the production static sitemap with the currently published DB-backed vacancy URLs from the same narrow public Careers projection. It never adds application URLs.

The current canonical origin defaults to the active Cloudflare production hostname. Phase 17 must set `PUBLIC_ORIGIN` to the approved custom production domain when that domain is configured. Canonicals must not point to an unconfigured future domain.

## Production indexability policy

Indexable on the primary production deployment now:

- canonical public marketing pages
- service pages
- service capability detail pages
- industry pages
- Careers landing page
- genuine currently published job-detail pages with the operational Phase 12 application journey
- legal/public information pages

Noindex now:

- Login
- job application form routes
- future private/admin routes
- 404 responses
- runtime error/degraded vacancy responses
- every non-main Cloudflare branch-preview route

Login and job-application URLs remain crawlable while carrying `noindex`; they are deliberately **not** disallowed in `robots.txt`. Future private/admin data must be protected by authentication/authorization rather than relying on robots directives as a security boundary.

Compatibility aliases are redirects and never sitemap entries.

## Deployment search-indexing gate

Cloudflare Workers Builds exposes `WORKERS_CI_BRANCH`. The build-time policy distinguishes the primary `main` deployment from non-main branch previews.

`DEPLOYMENT_SEARCH_INDEXING_ENABLED` is true only when:

- the Workers build branch is `main`; or
- no Workers branch variable is present, which allows local/GitHub CI to validate the production SEO model deterministically.

For a non-main Cloudflare branch preview:

- the full static route set is still prerendered for QA;
- every static route descriptor is `noindex`;
- every prerendered HTML route contains `noindex,nofollow`;
- `getIndexableRoutes()` returns zero routes;
- the static `sitemap.xml` contains no URL entries;
- the runtime sitemap handler recognizes that zero-entry sitemap as the preview sentinel and does not query or append database-backed job URLs;
- runtime Careers/job rendering preserves the base preview `noindex` directive;
- runtime job pages do not emit `JobPosting` on previews;
- `robots.txt` does not advertise a sitemap;
- canonical URLs continue to reference the approved primary production origin rather than the preview hostname.

This prevents branch-preview URLs from becoming an alternate searchable copy without creating the contradictory `robots.txt` + `noindex` combination.

The Vercel deployment is retained only as a secondary live fallback. Its configuration applies `X-Robots-Tag: noindex, nofollow` globally so it does not compete with Cloudflare as a second indexable origin. Automatic Vercel Git deployment remains disabled; a live Vercel deployment must not be reported as carrying a new header until that configuration is actually deployed and verified.

## Job-search eligibility gate

A visible catalogue status is not sufficient evidence that a route is eligible for Google Job Search. `JOB_SEARCH_INDEXING_ENABLED` may be true only when both of these conditions are proven:

1. the vacancy is a genuine, currently open published position; and
2. candidates have a real working way to apply, with submission persisted or visibly failed rather than silently accepted.

Phase 12 satisfies the application-path requirement. Production database state remains the vacancy authority. Therefore the gate is now enabled for published/open runtime vacancies.

When the gate is enabled and the deployment itself is search-eligible:

- the canonical single-job page is `index,follow`;
- the page contains `JobPosting` generated from the same authoritative vacancy content shown to candidates;
- the job URL is added to the runtime production sitemap;
- the real Apply link leads to the Phase 12 application form;
- application pages remain `noindex,nofollow` and never emit `JobPosting`;
- `robots.txt` continues to allow crawling of both job and application route families so page-level directives can be observed.

If the deployment is a branch preview, or if a job is not returned by the published public vacancy projection, the runtime must not create an indexable JobPosting surface.

## Structured data policy

Every prerendered static route receives Organization, WebSite and WebPage structured data. Service routes additionally receive Service schema. Nested public routes receive BreadcrumbList where applicable.

Organization legal identity and registered-address data are derived from the existing centralized company configuration rather than being duplicated inside the SEO model.

Runtime `JobPosting` is derived only from the approved published vacancy projection. Its description is generated as structured HTML from the visible job summary, department, location, working arrangement, employment type, experience, technologies, required/preferred skills, industry context, responsibilities, qualifications, working-style detail, response window and employment terms. Salary, sponsorship, credentials or other facts are never invented.

Job application forms never receive JobPosting schema. JobPosting may exist only on the canonical, indexable single-job description route.

## Sitemap policy

The production `/sitemap.xml` response consists of:

1. the build-generated static sitemap containing static routes whose centralized SEO descriptor is explicitly indexable; plus
2. currently published runtime vacancy URLs returned by the same public Careers boundary used to render candidate-facing jobs.

Legacy aliases, Login, application forms and unknown routes are excluded. The runtime sitemap does not invent job URLs and does not depend on a browser database credential. If the public vacancy projection is temporarily unavailable, the static marketing sitemap remains available and job discovery continues through the Careers page until the dependency recovers.

Non-main Cloudflare preview builds deliberately produce a valid zero-entry static sitemap. The runtime handler preserves that zero-entry document without querying or appending database-backed vacancies.

## Redirect and 404 policy

Historical compatibility URLs use permanent redirects to their canonical destinations. Production static-asset routing uses a real 404 page/status rather than returning the home SPA shell with HTTP 200 for unknown routes. Cloudflare uses a single no-trailing-slash HTML policy so extension and trailing-slash variants converge on the clean canonical route.

## Internal-link policy

Automated tests render every static public route and reject links that point to legacy aliases or paths outside the known prerender route set. Runtime Careers tests separately verify database-backed navigation, application links, canonical vacancy content, preview isolation and fail-closed behaviour.

## Phase boundary

Phase 6 established the public SEO architecture. Phase 11 established PostgreSQL vacancy authority. Phase 12 now owns the real application journey and the resulting activation of eligible runtime job indexing, runtime JobPosting, and DB-backed sitemap augmentation. The final custom-domain cutover remains Phase 17 work.

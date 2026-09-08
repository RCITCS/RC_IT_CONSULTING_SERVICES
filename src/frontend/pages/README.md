# Frontend Pages

`src/frontend/pages` is the route-level ownership boundary for the public website.

## Rules

- Every canonical public route has an explicit named page module or belongs to a deliberately documented dynamic route family.
- Page modules compose shared UI primitives; they do not own global navigation, footer, transport APIs, deployment logic or unrelated routes.
- Compatibility URLs are routed separately from canonical pages so future SEO work can redirect or de-index them without changing page ownership.
- Data-driven route families such as service capability details and job details use a named route-family module instead of generating dozens of duplicated files with identical rendering logic.
- Shared layout/components remain outside page modules and are handled in the later design-system phase.

## Route ownership

- `home.page.js` — `/`
- `about.page.js` — `/about-us`
- `contact.page.js` — `/contact`
- `products.page.js` — `/products`
- `white-papers.page.js` — `/white-papers`
- `careers.page.js` — `/careers`
- `careers/job-detail.page.js` — `/careers/jobs/:slug`
- `careers/application.page.js` — `/careers/jobs/:slug/apply`
- `services/it/*` — canonical IT service pages
- `services/management/*` — canonical management service pages
- `services/education/*` — canonical education service pages
- `services/service.page.js` — service capability detail route family
- `industries/*` — canonical industry pages
- `support/faqs.page.js` — `/faqs`
- `support/blog.page.js` — `/blog`
- `support/login.page.js` — `/login`
- `support/privacy.page.js` — `/privacy`
- `support/cookies.page.js` — `/cookies`
- `support/terms.page.js` — `/terms`
- `support/not-found.page.js` — unknown routes

## Compatibility routes

The router currently preserves these historical URLs without treating them as separate product pages:

- `/careers/job-opportunities` → Careers
- `/careers/upload-your-resume` → Careers
- `/consult-expert` → Contact

Their final redirect/indexing treatment belongs to the SEO phase; Phase 3 only preserves compatibility while removing duplicate page ownership.

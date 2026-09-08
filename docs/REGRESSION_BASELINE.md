# RC IT Services — Architecture & Regression Baseline

**Baseline branch:** `architecture/product-platform-refactor`  
**Baseline parent:** `main` at the start of structured refactoring  
**Purpose:** Define the behaviour and technical contracts that must be preserved while the repository is migrated into a professional `src/` architecture.

---

## 1. Current runtime architecture

### Public frontend

Current source is a client-rendered JavaScript application served from `public/`.

- shell: `public/index.html`
- entry: `public/js/app.js`
- router: `public/js/router.js`
- page/config data: `public/js/pages*.js`, career data modules and `site-config.js`
- page rendering: `render-home.js`, `render-main.js`, `render-careers.js`, `render-contact.js`, `render-support.js`
- interactions: navigation, careers, forms and UI modules under `public/js`
- CSS entry: `public/css/app.css`
- Bootstrap use: Bootstrap grid only, bundled from npm

### Production build

`npm run build` uses esbuild to:

1. copy `public/` to `dist/`
2. bundle/minify JavaScript
3. bundle/minify CSS
4. generate hashed `dist/assets/app-*.js` and `app-*.css`
5. rewrite `dist/index.html` to use the hashed assets
6. remove copied source `dist/js` and `dist/css`

### Local runtime

`server.mjs` currently serves:

- SPA shell for extensionless routes
- source CSS/JS during local development
- JSON APIs under `/api/*`
- filesystem JSON records for some local/dev submissions
- filesystem CV uploads for the legacy resume endpoint

### Cloudflare

Primary production is Cloudflare Workers + static assets.

- Worker entry: `worker/index.js`
- SPA fallback enabled in `wrangler.jsonc`
- Worker handles API routes first
- public deep routes fall back to `index.html`
- Git-connected Cloudflare Workers Builds is the production CD path

### Vercel

Vercel remains a secondary live fallback. Git auto-deploy is intentionally paused while the free deployment rate limit applies.

---

## 2. Current top-level public routes

The current router explicitly supports:

- `/`
- `/about-us`
- `/products`
- `/white-papers`
- `/contact`
- `/careers`
- `/careers/jobs/:slug`
- `/careers/jobs/:slug/apply`
- `/blog`
- `/faqs`
- `/login`
- `/privacy`
- `/cookies`
- `/terms`

### Service routes

- `/services/it/consultancy-services`
- `/services/it/cyber-security`
- `/services/it/artificial-intelligence`
- `/services/it/cloud-computing`
- `/services/it/big-data`
- `/services/it/it-support-services`
- `/services/management/risk`
- `/services/management/strategy-and-implementation`
- `/services/management/sustainability`
- `/services/education/consultancy`

Each service may expose child capability routes using:

`<service-route>/<howWeHelp.slug>`

Examples already relied on in production include:

- `/services/it/consultancy-services/agile`
- `/services/it/consultancy-services/advanced-analytics`
- `/services/it/consultancy-services/digital-marketing`
- `/services/it/consultancy-services/digital-delivery`
- `/services/it/consultancy-services/ai-and-automation`

The same child-route contract applies to cyber security, AI, cloud, big data, IT support, management and education service capability items.

### Industry routes

- `/industry/automotive-industry-it-services`
- `/industry/banking-and-finance`
- `/industry/media-and-communication`
- `/industry/education`

---

## 3. Current navigation contract

### Desktop

- logo/brand returns to home
- Home and About are direct routes
- Services is a grouped mega menu
- Industry is a grouped menu
- Careers is currently normalized at runtime into a direct `/careers` route
- Contact is a direct route
- Consult our Expert routes to the unified Contact/consultation flow
- active navigation state is visible
- menus close on outside click and Escape

### Mobile/tablet

- off-canvas navigation
- nested grouped navigation where relevant
- focus containment
- Escape/outside-click close
- body scroll lock while open
- route activation closes drawer
- resize to desktop clears stale mobile state

### No-dead-control contract

Public navigation must not introduce `href="#"` placeholders.

---

## 4. Current public interaction contracts

### Home

The homepage currently exposes:

- primary consultation CTA → Contact consultation anchor
- Explore Services
- Our Products
- White Papers
- Consult our Expert → unified Contact consultation anchor
- capability cards
- industry cards
- partner/client sections
- final CTA

### Services

- every service has a hero
- service overview
- real hero and secondary imagery
- How We Help cards
- each How We Help `Read More` uses a dedicated URL, not a dead modal placeholder
- service child pages expose delivery approach, related capabilities and CTA

### Industries

- hero
- industry context
- sector priorities where defined
- relevant capabilities
- delivery method
- business outcomes
- CTA

### Careers

- one consolidated Careers destination
- grouped/searchable opening list
- role selection updates the job detail without scrolling the entire page
- job detail includes location, working style, employment type, experience, technology, industry context, JD, responsibilities, qualifications, benefits and Apply
- job-specific Apply route exists
- application UI currently requests resume and cover letter up to 20 MB each
- submission is intentionally disabled until private recruitment storage exists

### Contact

- one unified enquiry page
- Company / Organisation optional
- Job Title optional
- Email label, not Business Email
- phone required
- Consultation topic retained
- textarea auto-grows and does not expose the browser diagonal resize control
- informational contact cards are non-competing guidance, not separate forms
- registered-office section and map retained

### Products

- product information remains visible
- demo request workflow remains available where currently exposed

### White Papers

- professional technology perspectives remain available

### Legal

- Privacy, Cookies and Terms remain MNC-style long-form pages
- footer links remain functional

---

## 5. Current visual regression contract

Structural migration must not unintentionally alter:

- brand mark and RC IT Services wordmark
- current neutral/off-white visual direction
- dark navy/graphite and warm accent palette
- typography hierarchy
- header height/placement
- mega-menu geometry
- buttons and hover/focus behaviour
- card proportions
- service/industry hero layout
- footer structure
- Careers split browser
- Contact layout
- desktop/tablet/mobile breakpoints
- approved real photography policy

Real photography remains the only accepted public-image policy unless an explicit product decision changes it.

---

## 6. Current image policy and technical observations

### Product policy

- real-world photography only
- no synthetic people
- no AI-generated hero/editorial images
- image must be semantically related to page purpose
- hero and secondary/editorial imagery should not be casually duplicated

### Current technical implementation

Most public images are remotely hosted on Pexels or Unsplash and referenced from `site-config.js`.

This is acceptable as a baseline but creates performance and operational dependencies that should be addressed in the performance phase through controlled local/CDN image handling, sizing and modern formats where licensing permits.

---

## 7. Current CI/CD baseline

GitHub Actions currently performs:

- Node 20 setup
- dependency installation
- smoke tests
- optimized production build
- production-bundle checks
- Cloudflare configuration checks

On `main`, an additional job verifies live production routes after Cloudflare Workers Builds deploys.

Representative live routes tested:

- `/`
- `/careers`
- `/contact`
- `/services/it/cyber-security`
- `/services/it/consultancy-services/agile`
- `/privacy`
- `/api/health`

Vercel fallback routes are also checked on `main`.

---

## 8. Known baseline technical debt and defects

These are recorded so they are not mistaken for new regressions during the migration.

### 8.1 Configuration is mutated at runtime

`app.js` changes Careers navigation/FAQ configuration at runtime. Navigation data should have one canonical definition rather than being corrected after import.

### 8.2 `ALL_ROUTES` contains legacy routes

`site-config.js` still lists:

- `/careers/job-opportunities`
- `/careers/upload-your-resume`
- `/consult-expert`

while the current router uses consolidated `/careers` and `/contact`. The smoke test therefore validates shell delivery for some legacy paths rather than actual route content.

### 8.3 Existing route smoke test is shell-oriented

The test confirms `site-root` exists but does not verify that the client router renders the intended page instead of a Not Found view.

A stronger route contract test is required.

### 8.4 Contact API schemas are inconsistent across runtimes

The current public form posts:

- firstName
- lastName
- company optional
- jobTitle optional
- email
- phone
- consultationTopic
- message
- privacyConsent

The Cloudflare Worker is close to this contract.

The legacy local Node server still expects required company/job title and `businessEmail`, which no longer matches the public form.

### 8.5 API response semantics differ

Local Node APIs persist selected requests and return 201.
Cloudflare currently validates several requests without persistent storage and returns 202.
Production persistence must not be simulated.

### 8.6 Legacy CV endpoint no longer matches product requirement

`server.mjs` still supports a 5 MB generic `/api/resume` upload to local filesystem. The approved product direction is job-specific applications with separate resume and cover letter up to 20 MB each using private object storage.

### 8.7 Local CSP is stale

The local Node Content-Security-Policy allows Unsplash images but many approved images now use Pexels. This can block valid images when exercising the local production server.

### 8.8 Public source structure is flat

`public/js` contains page data, rendering, interactions, forms and application bootstrap in one technical layer. `render-main.js` owns unrelated page types. This is the primary architectural issue Phase 2/3 will correct.

### 8.9 CSS ownership is broad

The CSS bundle includes global components, service, careers, legal and audit-fix layers together. The production bundle is minified, but source ownership and route-level loading can be improved.

### 8.10 Admin/backend product does not exist yet

`/login` is intentionally unconfigured. There is no persistent admin identity, session, database-backed jobs CMS, applications inbox, notifications, email history or audit-log UI yet.

---

## 9. Refactor protection strategy

The structured migration will use these gates:

1. create source structure without changing public output
2. switch build ownership only after source parity exists
3. migrate one page family at a time
4. retain route names
5. retain CSS classes until intentional design-system cleanup
6. strengthen tests before deleting old modules
7. remove obsolete public source only after parity is verified
8. use a dedicated refactor branch and pull request before updating production `main`

---

## 10. Phase 1 acceptance evidence

Phase 1 is considered verified when all of the following are true:

- repository architecture documented
- current build/deployment architecture documented
- public route contract documented
- current interaction contract documented
- visual protection contract documented
- known defects/technical debt documented
- CI on the baseline branch/PR confirms current test/build behaviour before structural code changes

No public design or interaction change is part of Phase 1.

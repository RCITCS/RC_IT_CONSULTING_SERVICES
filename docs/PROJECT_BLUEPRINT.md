# RC IT Services — Product & Engineering Blueprint

**Project:** RC IT Services public website + private administration platform  
**Legal entity:** R C OVERSEAS LTD  
**Repository:** `SRIHARIKATTAFM/RC-IT-SERVICES`  
**Primary production target:** Cloudflare Workers  
**Secondary/fallback target:** Vercel  
**Document status:** Controlled project blueprint  

---

## 1. Product objective

RC IT Services must present as a credible UK technology consulting and engineering business rather than a generic template website. The public website, careers experience, enquiry workflows, future administration system, email workflows, SEO, security and production operations are treated as one product.

The project must remain maintainable by a professional engineering team. Source structure, naming, architecture, tests and documentation must be understandable without relying on generated-code conventions or a single monolithic renderer.

### Non-negotiable product principles

1. Preserve approved public design, navigation, information hierarchy and route behaviour during architectural migration.
2. Use real, context-appropriate photography for public imagery. Do not introduce synthetic/AI-generated people or decorative images that do not support the page purpose.
3. Every visible action must have a defined destination and behaviour.
4. Public content must not expose placeholder, development, internal implementation or unconfigured-success messages.
5. Public pages must be fast, accessible, responsive and search-engine friendly.
6. Administration must be isolated from the public website and protected by real authentication and authorization; obscurity is not a security control.
7. Candidate documents and administrative data must never be committed to Git or stored in publicly accessible asset folders.
8. Transactional email must be implemented behind a provider abstraction so Gmail, Resend or another approved provider can be selected without rewriting business logic.
9. No phase is considered complete until implementation, review, automated tests and regression checks pass.

---

## 2. Product surfaces

### 2.1 Public website

Planned canonical production host after domain acquisition:

- `https://www.rcitcs.com`
- `https://rcitcs.com` → canonical redirect to `www`

Responsibilities:

- company positioning
- services
- service detail pages
- industries
- About Us
- Careers and job discovery
- individual job pages
- candidate application flow
- Products
- White Papers / Insights
- Contact / consultation flow
- legal pages
- public SEO

### 2.2 Private administration application

Planned host:

- `https://admin.rcitcs.com`

Responsibilities:

- secure administrator authentication
- password change
- forgot/reset password
- dashboard
- job CRUD/publishing
- candidate applications
- document access
- candidate status management
- candidate communication
- contact enquiries
- notifications
- email history
- audit logs
- operational settings

The administration hostname must be excluded from search indexing and must not depend on URL secrecy for security.

### 2.3 Backend/API

Potential host if architectural separation is useful:

- `https://api.rcitcs.com`

The API may also remain on Worker routes under the public/admin host if that reduces complexity without weakening boundaries.

Responsibilities:

- auth/session endpoints
- jobs
- applications
- contact enquiries
- notifications
- email orchestration
- file metadata and signed/private document access
- audit logging

---

## 3. Target repository architecture

The current application will be migrated incrementally. We will not rebuild the public site from scratch.

```text
RC-IT-SERVICES/
├── src/
│   ├── frontend/
│   │   ├── pages/
│   │   │   ├── home/
│   │   │   ├── about/
│   │   │   ├── careers/
│   │   │   ├── contact/
│   │   │   ├── products/
│   │   │   ├── white-papers/
│   │   │   ├── services/
│   │   │   ├── industries/
│   │   │   └── legal/
│   │   ├── components/
│   │   │   ├── navigation/
│   │   │   ├── footer/
│   │   │   ├── forms/
│   │   │   ├── cards/
│   │   │   ├── sections/
│   │   │   └── common/
│   │   ├── layouts/
│   │   ├── router/
│   │   ├── assets/
│   │   ├── styles/
│   │   ├── config/
│   │   └── utils/
│   │
│   └── backend/
│       ├── admin/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── layouts/
│       │   └── styles/
│       ├── api/
│       │   ├── auth/
│       │   ├── careers/
│       │   ├── applications/
│       │   ├── contact/
│       │   ├── notifications/
│       │   └── email/
│       ├── services/
│       │   ├── auth/
│       │   ├── email/
│       │   ├── storage/
│       │   └── notifications/
│       ├── database/
│       │   ├── migrations/
│       │   ├── repositories/
│       │   └── schema/
│       ├── middleware/
│       ├── security/
│       ├── validation/
│       └── config/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── accessibility/
│   ├── seo/
│   └── smoke/
├── scripts/
├── docs/
├── public/
├── dist/
└── deployment configuration
```

### Migration rule

Existing public output remains the regression reference until each migrated page is verified. Old modules are removed only after their replacements pass route, content, interaction and visual/DOM regression checks.

---

## 4. Public information architecture

The approved public structure remains conceptually:

```text
Home
About Us
Services
├── IT
│   ├── Consultancy Services
│   │   ├── Agile
│   │   ├── Advanced Analytics
│   │   ├── Digital Marketing
│   │   ├── Digital Delivery
│   │   └── AI and Automation
│   ├── Cyber Security
│   ├── Artificial Intelligence
│   ├── Cloud Computing
│   ├── Big Data
│   └── IT Support Services
├── Management
│   ├── Risk
│   ├── Strategy and Implementation
│   └── Sustainability
└── Education
    └── Consultancy

Industry
├── Automotive Industry IT Services
├── Banking and Finance
├── Media and Communication
└── Education

Careers
├── Current Openings
├── Job Details
└── Job Application

Products
White Papers
Contact
Privacy
Cookies
Terms
```

The existing published route set is authoritative during refactoring. Route names are not casually renamed.

---

## 5. Careers architecture

### Candidate experience

1. Candidate opens `/careers`.
2. Openings are grouped by professional discipline.
3. Search supports title, skill, technology, industry, location and related job metadata.
4. Selecting a role updates the job description without forcing the entire page to jump.
5. Each published role receives a dedicated canonical route such as `/careers/jobs/senior-data-engineer`.
6. Apply opens a job-specific application experience.
7. Resume and cover-letter files support up to 20 MB each, subject to security validation.
8. Submission creates a persistent application record.
9. Candidate receives a professional acknowledgement.
10. Admin receives a dashboard notification and recruitment email notification.

### Job administration

Job lifecycle:

- draft
- published
- closed
- archived

Admin capabilities:

- create
- edit
- preview
- publish
- unpublish
- close
- archive/delete according to retention rules
- duplicate
- set category
- set location
- set working model
- set employment type
- set experience
- set technologies
- set responsibilities
- set qualifications
- set benefits
- set opening/closing dates

Only published jobs appear publicly and in JobPosting structured data.

---

## 6. Candidate application data model

Minimum logical record:

```text
Application
- id
- job_id
- candidate_name
- email
- phone
- location
- linkedin_url
- portfolio_url
- cover_letter_text
- resume_document_id
- cover_letter_document_id
- submitted_at
- status
- source
- consent_version
- consent_at
```

Status model:

- new
- under_review
- shortlisted
- interview
- assessment
- offer
- hired
- rejected
- withdrawn

Separate status-history records preserve accountability.

---

## 7. Administration security

Administration is a protected application, not a hidden route.

Required controls:

- strong password hashing
- authenticated server-side sessions
- secure, HttpOnly and SameSite cookies where applicable
- login throttling/rate limiting
- password change
- forgot password
- single-use, time-limited password reset tokens
- session invalidation
- CSRF protection where the session architecture requires it
- output encoding and input validation
- authorization checks on every admin API operation
- noindex/nofollow
- restrictive security headers
- audit trail for privileged actions
- file access authorization
- optional MFA/TOTP in a later security increment
- Cloudflare Access may be used as an additional perimeter, never as the only application authorization control

---

## 8. Data and file storage

The production backend requires persistent storage.

Logical database domains:

```text
admins
admin_sessions
password_reset_tokens
jobs
job_categories
applications
application_documents
application_status_history
contact_enquiries
candidate_messages
notifications
email_logs
audit_logs
```

Cloudflare D1 is a likely fit if the production platform remains Cloudflare-first, but provider selection must be based on operational requirements rather than convenience alone.

Candidate documents require private object storage. Cloudflare R2 is a likely fit if Cloudflare-first.

Files must never be committed to Git or exposed through public static paths.

Document validation must include:

- allowed extension
- MIME validation
- file-size validation
- safe generated storage key
- no user-controlled public file path
- access authorization
- malware scanning strategy where available/required

---

## 9. Email architecture

Planned domain mail identities:

| Address | Responsibility |
| --- | --- |
| `info@rcitcs.com` | General information |
| `contact@rcitcs.com` | Sales and contact enquiries |
| `support@rcitcs.com` | Customer/technical support |
| `career@rcitcs.com` | Recruitment communication |
| `legal@rcitcs.com` | Legal/privacy matters |
| `noreply@rcitcs.com` | Automated transactional messages |

### Inbound

Cloudflare Email Routing may forward role-based addresses to an approved Gmail inbox.

### Outbound

Outbound transactional delivery will use a provider abstraction. Candidates include:

- Gmail API / Google Workspace
- Resend
- another approved provider

Cloudflare Email Routing is not treated as a complete transactional sending platform.

### Required transactional events

- contact acknowledgement
- internal contact notification
- job application acknowledgement
- internal application notification
- candidate status update
- interview invitation
- admin reply
- password reset
- password changed

Email templates must share a centralized RC corporate shell and must not be independently hardcoded across endpoint handlers.

---

## 10. SEO architecture

Public pages are indexable. Admin pages are not.

### Every indexable page requires

- unique title
- unique meta description
- canonical URL
- semantic heading hierarchy
- Open Graph metadata
- social metadata
- contextual internal links
- descriptive image alt text
- stable crawlable URL
- meaningful HTTP status

### Structured data

Where applicable:

- Organization
- WebSite
- WebPage
- Service
- BreadcrumbList
- JobPosting
- FAQPage
- Article

### Careers SEO

Each published opening should have a canonical job URL and valid JobPosting structured data. Closed jobs must be removed or marked appropriately rather than left indefinitely as active openings.

### Crawl controls

- generated sitemap(s)
- `robots.txt`
- canonicalization
- redirect map
- 404 handling
- noindex for admin/auth/private surfaces

`robots.txt` is a crawl hint, not a security mechanism.

---

## 11. Performance requirements

Performance is part of architecture and acceptance criteria.

### Targets

- LCP < 2.5 s at the 75th percentile target
- INP < 200 ms target
- CLS < 0.1 target
- Lighthouse Performance ≥ 90 where realistically measurable
- Accessibility ≥ 95 target
- Best Practices ≥ 95 target
- SEO ≥ 95 target

### Implementation principles

- route/page-scoped JavaScript
- lazy loading where appropriate
- dynamic imports for noncritical features
- remove dead code
- avoid loading careers/admin logic on unrelated public pages
- split page styles from global primitives
- minify assets
- hashed immutable production assets
- AVIF/WebP where appropriate
- responsive image source sizes
- explicit image dimensions to limit layout shift
- lazy load below-the-fold imagery
- preload only true critical assets
- avoid unnecessary third-party libraries
- exploit Cloudflare CDN caching and compression

Bootstrap may be used selectively where it provides value. It must not turn the public website into default Bootstrap visual design or increase payload without benefit.

---

## 12. Deployment architecture

### Production direction

```text
GitHub main
   ↓
GitHub CI
   ├── install
   ├── tests
   ├── production build
   ├── architecture checks
   ├── route checks
   └── security/static checks
   ↓
Cloudflare Workers Builds
   ↓
Cloudflare production
   ↓
post-deployment smoke verification
```

Cloudflare is the primary production deployment target.

Vercel remains an optional secondary/fallback deployment. Automatic Vercel deployments may stay paused while free deployment rate limits apply.

### Environments

Target model after domain setup:

```text
Development: local
Staging: staging.rcitcs.com
Production: www.rcitcs.com
Admin staging: admin-staging.rcitcs.com
Admin production: admin.rcitcs.com
```

---

## 13. Testing strategy

Required layers:

- unit tests
- integration tests
- route smoke tests
- public interaction tests
- careers selection/search tests
- application workflow tests
- admin auth tests
- password reset tests
- email adapter tests
- API validation tests
- responsive/mobile QA
- accessibility checks
- SEO checks
- deployment checks

A phase cannot be marked complete because code was written. It must pass its acceptance criteria and regression checks.

---

## 14. Human engineering standards

Code review standard:

- meaningful file names
- meaningful function names
- small focused modules
- predictable directory ownership
- no unexplained duplicated logic
- no arbitrary generated suffixes such as `final`, `new`, `v2`, `fix2`
- no monolithic renderer controlling unrelated pages
- no placeholder production copy
- comments explain *why*, not obvious syntax
- architectural decisions documented when non-obvious
- dependencies added only with a measurable purpose
- business rules centralized rather than copied across UI and API

---

## 15. Change-control rule

During structural migration the following are protected unless an explicit product decision says otherwise:

- visual design
- colors
- typography
- header
- mega menus
- navigation
- route URLs
- existing approved content
- public interaction behaviour
- cards and buttons
- responsive behaviour
- footer
- imagery already approved after contextual audit

If an implementation changes protected behaviour unintentionally, it is a regression and must be corrected before the phase closes.

---

## 16. External dependencies not available yet

The following are intentionally deferred until provided/approved:

- final `rcitcs.com` domain registration
- production DNS/subdomain mapping
- production email provider credentials/configuration
- inbound forwarding destination(s)
- production database instance/binding
- production private object-storage binding
- initial admin identity/bootstrap secret

Code may prepare provider-neutral interfaces before these are available, but no phase may claim live production integration until the relevant infrastructure exists and is verified.

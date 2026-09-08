# RC IT Services — Route and Interaction Matrix

This matrix describes the approved public route and interaction contract used during the structured refactor.

## Utility navigation

| UI | Destination | Behaviour |
| --- | --- | --- |
| Blog | `/blog` | Editorial route |
| FAQs | `/faqs` | Accessible accordion page |
| Login | `/login` | Public information/login boundary; production authentication is not enabled in the baseline build |

## Main navigation

| Menu | Submenu | Route |
| --- | --- | --- |
| Home | — | `/` |
| About Us | — | `/about-us` |
| SERVICES > IT | Consultancy Services | `/services/it/consultancy-services` |
| SERVICES > IT | Cyber Security | `/services/it/cyber-security` |
| SERVICES > IT | Artificial Intelligence | `/services/it/artificial-intelligence` |
| SERVICES > IT | Cloud Computing | `/services/it/cloud-computing` |
| SERVICES > IT | Big Data | `/services/it/big-data` |
| SERVICES > IT | IT Support Services | `/services/it/it-support-services` |
| SERVICES > Management | Risk | `/services/management/risk` |
| SERVICES > Management | Strategy and Implementation | `/services/management/strategy-and-implementation` |
| SERVICES > Management | Sustainability | `/services/management/sustainability` |
| SERVICES > Education | Consultancy | `/services/education/consultancy` |
| Industry | Automotive Industry IT Services | `/industry/automotive-industry-it-services` |
| Industry | Banking and Finance | `/industry/banking-and-finance` |
| Industry | Media and Communication | `/industry/media-and-communication` |
| Industry | Education | `/industry/education` |
| Careers | — | `/careers` |
| Contact | — | `/contact` |
| Consult our Expert | — | `/contact?intent=consultation#contact-form` |

## Homepage actions

| Button / card | Destination / action |
| --- | --- |
| Our Products | `/products` |
| White Papers | `/white-papers` |
| Consult our Expert | `/contact?intent=consultation#contact-form` |
| Explore Services | `/services/it/consultancy-services` |
| Industry cards | Dedicated industry routes |
| Final consultation CTA | Unified Contact consultation flow |

## Service interactions

Every service `HOW WE HELP` card has a dedicated child route.

Pattern:

`<service-route>/<capability-slug>`

Examples:

- `/services/it/consultancy-services/agile`
- `/services/it/consultancy-services/advanced-analytics`
- `/services/it/consultancy-services/digital-marketing`
- `/services/it/consultancy-services/digital-delivery`
- `/services/it/consultancy-services/ai-and-automation`

Capability pages include service context, delivery approach, expected result, related capabilities and consultation CTA.

## Products

`Request a Demo` opens a validated modal form and submits to `/api/demo` when the runtime endpoint is configured to accept the request.

## Contact

The Contact page is the single public enquiry/consultation route.

Current fields:

- First Name — required
- Last Name — required
- Company / Organisation — optional
- Job Title — optional
- Email — required
- Phone Number — required
- Consultation topic — required
- How can we help? — required
- Privacy confirmation — required

The message textarea auto-grows and manual browser resize is disabled by the public CSS/interaction layer.

Informational contact blocks explain consultation, business enquiry, phone follow-up and digital message expectations. They do not create competing forms.

The map uses the registered-office address.

## Careers

`/careers` is the single careers landing and job-discovery experience.

### Opening browser

- jobs are grouped by professional discipline
- search supports title, skill, technology, location, industry and related metadata
- category filtering is available
- selecting another role updates the detail panel without scrolling the whole document
- the selected role remains visually identifiable

### Job detail

Canonical pattern:

`/careers/jobs/:slug`

The detail includes:

- role summary
- location
- working style
- employment type
- experience
- technology environment
- industry context
- job description
- responsibilities
- qualifications
- preferred qualifications
- benefits/employment terms
- Apply CTA

### Application

Pattern:

`/careers/jobs/:slug/apply`

The current UI requests role-specific candidate details plus separate resume and cover-letter files, with a product requirement of up to 20 MB each.

Production submission is intentionally not enabled until approved private recruitment document storage is connected. The application must never claim success before persistence succeeds.

## Legal routes

- `/privacy`
- `/cookies`
- `/terms`

Footer legal links must remain functional on desktop and mobile.

## Legacy/deprecated routes

The following paths appeared in earlier builds and must be handled deliberately during the refactor rather than silently returning an unrelated page:

- `/careers/job-opportunities` → target `/careers`
- `/careers/upload-your-resume` → target `/careers`
- `/consult-expert` → target `/contact?intent=consultation#contact-form`

Vercel already contains redirect rules for these legacy paths. Cloudflare redirect parity is a recorded migration item.

## Responsive navigation contract

### Desktop

- mouse hover may reveal a dropdown, but hover is never the only control
- click toggles dropdowns
- active routes are visually indicated
- outside click closes open menus
- Escape closes open menus

### Mobile/tablet

- approximately 46 px navigation control/touch target
- off-canvas sheet
- nested accordions for grouped menu content
- keyboard focus containment
- Escape/outside-click close
- background scroll lock
- route click closes the drawer
- resize to desktop closes stale mobile state

## No-dead-control rule

The project must not contain `href="#"` navigation placeholders.

Controls that depend on an external production system must expose a truthful unavailable/pending boundary rather than simulate successful persistence, authentication, upload or message delivery.

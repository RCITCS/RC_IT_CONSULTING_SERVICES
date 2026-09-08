# Route and Interaction Matrix

## Utility navigation

| UI | Destination | Behaviour |
|---|---|---|
| Blog | `/blog` | Dedicated editorial route |
| FAQs | `/faqs` | Accessible accordion page |
| Login | `/login` | Login UI; backend intentionally blocks authentication until identity integration |

## Main navigation

| Menu | Submenu | Route |
|---|---|---|
| Home | - | `/` |
| About Us | - | `/about-us` |
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
| Careers | Job Opportunities | `/careers/job-opportunities` |
| Careers | Upload your Resume | `/careers/upload-your-resume` |
| Contact | - | `/contact` |

## Homepage actions

| Button / card | Destination / action |
|---|---|
| Our Products | `/products` |
| White Papers | `/white-papers` |
| Consult our Expert | `/consult-expert` |
| Industry cards | Dedicated industry routes |
| Primary consultation CTA | `/consult-expert` |
| Contact CTA | `/contact` |

## Service interactions

Every `HOW WE HELP` item has a `Read More` button. Clicking it opens an accessible modal dialog containing the detailed explanation. The dialog supports:

- `Close` button
- top-right close control
- Escape key
- click-outside close
- focus trapping
- focus restoration

## Products

`Request a Demo` opens a validated modal form. Successful submissions are POSTed to `/api/demo`.

## Contact

The Contact page preserves:

- Write to Us
- Talk to Us
- Email Us
- Chat With Us
- `Chat Now >>>`
- Map
- Submit

Write/Talk/Email actions focus the structured enquiry form with an intent value. Chat opens an on-page message dialog and submits to `/api/chat`. The map uses the registered-office address.

## Careers

`Upload your Resume` accepts PDF, DOC and DOCX up to 5 MB. Client and server both validate the file. Explicit recruitment consent is required before upload.

## Responsive navigation contract

Desktop:

- mouse hover may reveal a dropdown, but hover is never the only control
- click toggles dropdowns
- active routes are visually indicated
- outside click closes open menus
- Escape closes open menus

Mobile/tablet:

- 46px navigation control
- off-canvas sheet
- nested accordions for grouped menu content
- keyboard focus containment
- Escape/outside-click close
- background scroll lock
- route click closes the drawer
- resize to desktop closes stale mobile state

## No-dead-control rule

The project must not contain `href="#"` navigation placeholders. Controls that depend on an external production system must expose the real integration boundary rather than simulate success.

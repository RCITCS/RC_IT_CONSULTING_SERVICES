# Third-party visual assets

## Visual policy

RC IT Services uses real-world photography only for public website imagery. Generated AI artwork, synthetic people and decorative AI illustrations are not permitted for service, industry, careers, contact, education or corporate imagery.

The image registry is centralised in `public/js/site-config.js` so every visual can be audited and replaced without hunting through page markup.

Approved source platforms in the current build:

- Unsplash — real photography; license: https://unsplash.com/license
- Pexels — real photography; license: https://www.pexels.com/license/

No random Google Images, AI-generated stock illustrations or synthetic people are used.

## Image audit — September 2026

The following previously generic or weakly matched images were replaced with more explicit real photographs:

| Website area | Real-photo subject | Source / photo ID |
| --- | --- | --- |
| Contact Us | Professional customer support team working with headsets in a modern office | Pexels 5453808 — Tima Miroshnichenko |
| Cyber Security | Cybersecurity professional inspecting code across multiple monitors | Pexels 6963098 — Mikhail Nilov |
| Artificial Intelligence | Data scientist / technology professional working in a real office | Pexels 19809475 — frank minjarez |
| Cloud Computing | Engineer working directly with enterprise data-centre/server infrastructure | Pexels 19226354 — panumas nikhomkhai |
| Big Data / Data Engineering | Business and technology professionals analysing data on a laptop | Pexels 3183185 — fauxels |
| IT Support Services | IT/customer support team using laptops and headsets | Pexels 7682087 — Mikhail Nilov |
| Strategy & Implementation | Professional presenting business/data analysis to colleagues | Pexels 9301247 — Mikhail Nilov |
| Education Consultancy — hero | Mentor/advisor and student discussing university work together on a laptop | Pexels 4339798 — Edmond Dantès |
| Education Consultancy — editorial | Teacher helping a student use a laptop in a real library/classroom learning environment | Pexels 9159088 — Mikhail Nilov |
| Automotive | Engineers collaborating on an automotive project in a workshop | Pexels 3862627 — ThisIsEngineering |
| Banking & Finance | Business professionals collaborating on financial data analysis | Pexels 7698812 — Yan Krukau |
| Media & Communication | Colleagues working on post-production/video editing in a real studio | Pexels 8102700 — Ron Lach |

## Education photography

- Education industry / homepage: Haseeb Modi, students working in a real school computer lab. Unsplash photo id `1719159381981-1327b22aff9b`. Free under the Unsplash License.
- Education Consultancy hero: Pexels photo `4339798`. The image directly represents mentoring, guidance, discussion and technology-assisted higher education, which is a closer match to consultancy than a generic classroom photograph.
- Education Consultancy body: Pexels photo `9159088`. The second image shows direct learning support around a laptop and is intentionally different from the hero photograph.

## Image-repetition rule

A service or industry detail page should not repeat the same photograph in both the hero and the primary body/editorial section. Each audited page can define a primary image and a separate `secondaryImage` in its page model. Reuse is allowed only when an image is deliberately part of a site-wide brand motif rather than a page-specific subject image.

## Images retained after audit

The following existing images were reviewed and retained where the subject already matches the page context:

- Homepage hero — real software/technology team
- Technology consultancy — real professional collaboration
- Risk — real business/risk analysis
- Sustainability — real energy/infrastructure context
- About Us — real professional team
- Products — real laptop/product workspace
- White Papers — real editorial/research workspace

## Production asset handling

Before final commercial launch, RC should either:

1. keep the approved Unsplash/Pexels assets with this source record; or
2. replace them with RC-owned/licensed commercial photography and self-host optimised WebP/AVIF derivatives.

Where external photography remains, the image must continue to be reviewed for subject relevance, licensing, loading performance and accessibility text before release.

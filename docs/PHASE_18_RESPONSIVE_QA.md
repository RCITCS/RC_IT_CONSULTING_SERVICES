# Phase 18 — Full Responsive / Mobile QA

## Baseline

- Starting branch: `main`
- Starting SHA: `214fafb002f4f33792998e3968aa9884c1949980`
- Phase boundary: responsive layout, mobile/touch usability, browser behavior and responsive functional workflows. Formal SEO, Lighthouse/Core Web Vitals and comprehensive WCAG auditing remain Phase 19.
- Existing approved desktop presentation is preserved. Responsive fixes must address a reproducible defect and must not introduce parallel markup or a second source of truth.

## Viewport classes

| Class | Width |
| --- | ---: |
| Small mobile | 320–374 px |
| Mobile / large mobile | 375–767 px |
| Tablet | 768–1023 px |
| Small desktop / laptop | 1024–1279 px |
| Desktop / wide | 1280+ px |

Boundary widths are explicitly covered on both sides: 374/375, 767/768, 1023/1024 and 1279/1280.

## Browser matrix

Automated representative engines:

- WebKit small-mobile and tablet profiles, covering Safari-class layout behavior.
- Chromium mobile and desktop profiles, covering Android Chrome/desktop Chrome-class layout behavior.
- Firefox desktop regression coverage.
- A dedicated Chromium boundary sweep at 374/375, 767/768, 1023/1024 and 1279/1280.

This is representative browser-engine coverage, not a claim that every physical handset model is tested.

## Module acceptance map

| Module | Acceptance evidence |
| --- | --- |
| 18.1 Baseline & device matrix | This document, exact starting SHA, route inventory assertions, viewport/browser matrix |
| 18.2 Global public shell | Navigation-mode browser assertions, mobile menu interaction, safe-area and overflow contracts |
| 18.3 Public content pages | Representative route families rendered across all projects with document-overflow/runtime-error assertions |
| 18.4 Careers & job discovery | Public Careers route plus isolated runtime vacancy-detail fixture using the real Careers CSS, split-view collapse and extreme-title/content checks |
| 18.5 Candidate application journey | Isolated runtime application fixture using the real application CSS, file-control visibility, form/mobile-overflow contracts; production vacancy state remains server-authoritative |
| 18.6 Contact & public forms | Contact form control-bounds check and 16 px narrow-screen input contract |
| 18.7 Admin authentication | Isolated production-shaped authentication harness across viewport matrix, existing security tests unchanged |
| 18.8 Admin dashboard | Existing admin dashboard regression plus shared admin responsive harness/contracts |
| 18.9 Job management CMS | Jobs register card conversion and 44 px action target checks |
| 18.10 Applications/enquiries/candidates | Existing workflow regression suite plus applications responsive contract in `admin-responsive.js` |
| 18.11 Tables/forms/dialogs | Local table containment, mobile register presentation, real admin-dialog responsive styles and viewport constraints |
| 18.12 Touch/mobile interaction | 44 px coarse-pointer controls, no hover dependency for essential transforms, mobile-menu interaction |
| 18.13 Overflow/orientation/extreme content | Long unbroken value injection, portrait/landscape resize, boundary sweep and document-width assertions |
| 18.14 Cross-browser verification | Chromium + Firefox + WebKit automated matrix |
| 18.15 Automated responsive regression gate | Dedicated GitHub Actions workflow; screenshots/traces retained on failure |
| 18.16 Final production acceptance | Requires green Phase 18 workflow plus existing full CI/build/regression and exact-main-SHA verification on canonical production before closure |

## Responsive defect policy

For every defect: reproduce → isolate root cause → apply the smallest shared architectural fix → test the affected route/workflow at the relevant boundary widths → re-run the complete responsive gate. A screenshot by itself is not acceptance evidence. Document-level horizontal overflow is not globally hidden; the browser gate must be able to detect it.

## Data and security policy

Responsive QA must not weaken authentication, CSRF, session, RBAC, storage, RLS, privacy, caching or domain-separation controls. Automated browser coverage uses public routes and isolated synthetic presentation fixtures for runtime-only/private layouts. It does not create fake production candidates, applications, enquiries or documents, and it does not reintroduce a static vacancy catalog.

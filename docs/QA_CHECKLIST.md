# QA Checklist

## Navigation

- [x] All approved top-level options implemented
- [x] All approved service sub-options implemented
- [x] All approved industry sub-options implemented
- [x] Careers submenu implemented
- [x] Blog / FAQs / Login implemented
- [x] No `href="#"` dead links
- [x] Desktop dropdown click support
- [x] Desktop hover enhancement
- [x] Escape / outside-click closing
- [x] Mobile nested navigation
- [x] Mobile scroll lock and focus containment

## Forms / interactions

- [x] Contact validation and POST endpoint
- [x] Consult our Expert validation and POST endpoint
- [x] Request a Demo dialog and POST endpoint
- [x] Chat Now dialog and POST endpoint
- [x] Resume upload validation and POST endpoint
- [x] Read More / Close accessible dialogs
- [x] FAQ accordions
- [x] Login has an explicit backend integration boundary

## Responsive

CSS targets and should be manually verified at:

- 320 px
- 375 / 390 px
- 640 px
- 768 px
- 900 px
- 1024 / 1100 px
- 1280 px
- 1440+ px

## Accessibility

Implemented foundations:

- semantic navigation landmarks
- skip link
- focus-visible treatment
- ARIA expanded state for dropdowns and accordions
- dialog roles and focus trapping
- form labels and error regions
- reduced-motion support
- minimum touch-target intent around 44-48 px

Production gate still required:

- axe scan
- keyboard-only browser pass
- VoiceOver/NVDA spot checks
- final WCAG 2.2 AA contrast audit after brand colours are frozen

## Security / privacy

- [x] CSP and basic browser security headers
- [x] same-origin form APIs
- [x] request size limit
- [x] server-side field validation
- [x] resume extension/MIME/size validation
- [x] filename sanitisation
- [x] no credential persistence for Login

Production additions:

- malware scanning for resumes
- rate limiting / anti-abuse controls
- persistent data store / CRM / ATS
- retention and deletion rules
- audit logging where appropriate
- email provider authentication if outbound notifications are added

## Automated smoke result

`npm test` passes 28 routes plus static assets and API/form/upload tests.

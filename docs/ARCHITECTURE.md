# RC IT Services - Architecture Decision

## Decision context

RC IT Services needs a dedicated public technology website while preserving the approved IntuitEd page, menu, submenu and interaction structure. The implementation must be responsive, accessible, non-generic, truthful, and must not contain dead controls.

The frontend engineering direction follows the Srihari Claude Engineering Kit principles used for public business websites: business truth first, explicit design direction, shared tokens/components, real imagery, responsive verification, accessibility/performance checks, and no fabricated proof.

## Selected approach

This first implementation is a dependency-free Node.js + modular browser JavaScript application with a small same-origin API server.

Why this foundation was selected for the first working milestone:

1. It can be executed and verified immediately without a package-registry dependency.
2. Every approved route can deep-link correctly through the server fallback.
3. Contact, demo, consultation, chat, resume upload and login-boundary behaviour can be tested end-to-end now.
4. Shared navigation, tokens, components and page data are separated so the UI can later be moved into Next.js/React without changing the information architecture.

This is not a reason to avoid Next.js in production. If RC chooses Next.js for the target repository, the route/data/component boundaries in this project are deliberately migration-friendly.

## Quality attributes driving the design

- Correct navigation and interaction behaviour
- Mobile/tablet/desktop responsiveness
- Accessibility and keyboard operation
- Maintainability through shared tokens/components/data
- Security at form and file-upload boundaries
- Truthful business content without invented clients or metrics
- Performance through low JavaScript/dependency overhead
- Clear migration path to a production framework and persistent backend

## Component boundaries

### Browser

- `site-config.js`: company metadata, route inventory, menus, footer groups, image registry
- `pages.js`: service, industry, capability and FAQ content
- `components.js`: shared structural templates
- `ui.js`: dialog, accordion and toast behaviour
- `forms.js`: client-side validation and submission handling
- `app.js`: route composition and global interaction binding
- CSS is separated into semantic tokens, base rules, components and responsive behaviour

### Server

`server.mjs` owns:

- static asset serving
- clean-route fallback
- security headers
- request size limits
- form validation
- enquiry persistence
- CV file validation and storage
- login integration boundary

### Data / trust boundaries

Public browser input is always treated as untrusted. Server validation is repeated even after client validation. Uploaded filenames are sanitised, file types are restricted, file size is limited to 5 MB, and credentials are never stored by the login route.

## Current persistence model

The local foundation writes form records to JSON files and resumes to an uploads directory. This is suitable for the verified local milestone only.

For production, replace local persistence with:

- approved CRM/contact workflow for enquiries
- approved recruitment/ATS storage for resumes
- retention/deletion policy
- malware scanning for uploaded documents
- durable database/object storage where required
- transactional email/notification provider if required

## Authentication boundary

The Login page exists and is clickable, but `/api/login` intentionally returns `501 AUTH_NOT_CONFIGURED`. This prevents a false login success before RC selects the portal backend and identity provider.

Production authentication should use an approved identity provider/session architecture. Passwords or access tokens must never be persisted in frontend code.

## Failure behaviour

- Invalid form input returns 422 with a user-facing message.
- Oversized CV uploads return 413.
- Unsupported CV types return 415.
- Unknown API routes return 404.
- Login returns 501 until identity integration is configured.
- Navigation routes always return the app shell, including deep links.

## Migration / rollback

The project is self-contained. Migration to Next.js can be staged:

1. move `site-config.js` and page data into typed data modules;
2. convert shared templates to React components;
3. create App Router routes matching the existing URL inventory;
4. move API handlers to route handlers or an approved backend service;
5. retain CSS tokens and responsive rules or translate them into the chosen design-system layer;
6. verify route/interaction parity before switching traffic.

Rollback is simple while the project is standalone because it does not modify the existing RC Overseas repository.

## Verification

`npm test` currently verifies:

- all 28 approved routes return 200
- core static assets return 200
- valid contact submission succeeds
- invalid contact submission is rejected
- demo request succeeds
- consultation request succeeds
- CV upload succeeds with validation
- Login remains intentionally unconfigured

Additional production gates should include browser automation, axe/WCAG checks, Lighthouse, visual regression, security review and real-device mobile QA.

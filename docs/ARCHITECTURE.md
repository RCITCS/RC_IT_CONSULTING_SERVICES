# RC IT Services — Architecture Decision

## Current architecture

RC IT Services is a prerendered public website with a Cloudflare Workers backend boundary. The approved public information architecture, navigation, route structure and Phase 4–6 frontend/performance/SEO contracts remain protected while backend responsibilities are isolated under `src/backend`.

## Frontend ownership

The browser owns presentation and client-side interaction only: explicit page modules, shared components/layouts, route loading/interactions, design tokens and route-specific CSS, client-side form usability validation, and the Phase 6 prerender/SEO model.

The browser is not authoritative for persistence, authentication, provider state or server-side validation.

## Backend ownership — Phase 7

Phase 7 establishes a layered runtime-agnostic backend:

- `src/backend/application.js` — composition root
- `src/backend/api/` — API router and handlers
- `src/backend/validation/` — canonical server validation
- `src/backend/services/` — use-case orchestration
- `src/backend/repositories/` — persistence contracts
- `src/backend/providers/` — database/storage/email provider boundaries
- `src/backend/core/` — errors, standardized responses, request IDs, payload limits and logging hooks
- `src/backend/runtime/worker.js` — Cloudflare transport adapter

`server.mjs` and `api/[action].js` delegate to the same backend application. They no longer maintain separate business rules. Detailed Phase 7 design is recorded in `docs/BACKEND_ARCHITECTURE.md`.

## Production runtime

Cloudflare Workers Builds remains the primary deployment path from `main`. Wrangler runs the worker first for `/api/*` and serves prerendered assets for public routes.

`worker/index.js` is a thin entry facade over `src/backend/runtime/worker.js`, preventing duplicate runtime ownership. Vercel remains a secondary fallback and is globally noindex per Phase 6.

## Trust boundaries

All browser input is untrusted. Server validation is authoritative. API payloads are bounded, API responses are no-store, and request IDs provide traceability without logging normal request-body PII.

Authentication, authorization and session authority are deferred to Phase 9 and are not simulated.

## Persistence truth

The earlier local JSON-file/resume-directory model is no longer the application architecture.

Phase 7 defines persistence/provider contracts but deliberately does not implement the production database/object-storage model assigned to Phase 8. A valid write request cannot report success unless a configured repository confirms persistence. The default production repository returns explicit `503 PERSISTENCE_NOT_CONFIGURED`; no validation-only `202` response is treated as a successful submission.

## Recruitment boundary

Candidate application/document storage remains intentionally disabled until the approved later phases. Resume and application endpoints return explicit `501 RECRUITMENT_STORAGE_NOT_CONFIGURED`; no file is accepted or claimed as stored.

The later approved workflow remains job-specific and will use private storage for supported PDF/DOC/DOCX documents with the Phase 8/12 limits and controls.

## Email boundary

Email delivery is provider-neutral in Phase 7. The interface exists, but outbound delivery is not claimed until Phase 13 and domain/provider configuration. Cloudflare Email Routing may later provide inbound forwarding; outbound transactional delivery will use the approved sending adapter.

## Failure contract

Backend responses use one envelope and predictable statuses: 200 read/health success; 201 confirmed persistence; 400 malformed JSON; 404 unknown API endpoint; 405 unsupported method; 413 bounded payload exceeded; 422 validation failure; 501 feature boundary intentionally not configured; 503 required provider/persistence unavailable; and 500 unexpected backend failure.

## Regression protection

Phase 7 must not regress the approved public UX/navigation, Phase 4 design-system ownership, Phase 5 route splitting/performance budgets, Phase 6 prerendering/SEO/indexing gates, Cloudflare primary deployment, or Vercel fallback reachability.

The default CI suite includes a dedicated backend-foundation test and backend architecture checker in addition to all prior regression gates.

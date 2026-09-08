# RC IT Services — Backend Architecture

## Phase 7 decision

Phase 7 replaces runtime-specific backend logic with one shared backend application that is independent of the public UI and independent of Cloudflare/Vercel/Node transport details.

The architecture is deliberately provider-neutral so Phase 8 can select the approved database/private-object-storage implementation and Phase 13 can select the outbound email provider without rewriting API handlers or frontend pages.

## Layer model

Request flow:

`runtime adapter → request context → API router → handler → validation → service → repository/provider → standardized response`

### Runtime adapters

- `src/backend/runtime/worker.js` — canonical Cloudflare Workers adapter
- `worker/index.js` — thin Wrangler entry facade
- `server.mjs` — local Node/static-development adapter
- `api/[action].js` — Vercel fallback adapter

Adapters may translate transport objects, enforce JSON media type, parse bounded JSON and serialize the shared result. They do not own business validation or persistence semantics.

### Application composition

`src/backend/application.js` creates the backend application and wires environment configuration, provider registry, submission repository, submission service, API handlers, API router, request IDs and logging hooks.

Environment names are never guessed for hosted runtimes. An explicit `RC_ENVIRONMENT` or `NODE_ENV` value is reported when configured. The local Node adapter may truthfully default to `development`; Cloudflare/Vercel/other runtimes without an explicit environment value report `unconfigured` rather than pretending to be production or development.

### API routing and handlers

`src/backend/api/router.js` defines the canonical API action/method contract. Unknown or suffix routes return 404; wrong methods return 405 with `Allow`; body parsing occurs only after the route/method contract is eligible; body-required routes require a JSON media type and reject missing, empty or malformed JSON with `400 BAD_REQUEST` consistently across runtime adapters.

`src/backend/api/handlers.js` maps validated use cases to standardized HTTP outcomes. Authentication and recruitment upload remain explicit later-phase boundaries rather than simulated implementations.

### Validation

`src/backend/validation/` is the single server-side validation authority for public submission fields. Client validation remains UX-only and is never trusted as an authorization or data-integrity boundary.

The Contact contract now matches the actual public form: first name, last name, email, phone, consultation topic, message and privacy confirmation are required; company and job title remain optional. Over-length or invalid-type fields are rejected instead of being silently truncated/coerced.

### Services and repositories

`src/backend/services/submission-service.js` creates canonical immutable submission records and only reports success after the repository confirms the same record ID was persisted.

`src/backend/repositories/submission-repository.js` defines the persistence contract. The default repository is intentionally unavailable and throws `503 PERSISTENCE_NOT_CONFIGURED`. This is the correct Phase 7 production behavior until Phase 8 provides durable storage.

### Provider boundaries

Phase 7 defines neutral boundaries for database, private object/document storage and email. All default providers are explicitly `configured: false`; provider credentials, schemas, buckets and SDKs are not introduced in this phase.

## Standard API response model

Success responses contain `ok: true`, `requestId`, optional `message` and optional `data`. Failures contain `ok: false`, `requestId`, a stable `code` and a user-safe `message`.

Responses are `no-store`, API output is search-noindexed, and `X-Request-ID` mirrors the response request ID.

## Status-code contract

- `200` health/read success
- `201` confirmed persisted submission
- `400` missing, empty, malformed or invalid JSON envelope
- `404` unknown API route
- `405` unsupported method
- `413` API JSON body exceeds configured limit
- `415` body-bearing API route called without a supported JSON media type
- `422` semantic field validation failure
- `501` approved feature boundary not implemented yet, including authentication/recruitment upload
- `503` required persistence/provider is not configured
- `500` unexpected backend/provider failure

## Request IDs and logging

Every API call receives a request ID. A syntactically safe incoming `X-Request-ID` may be propagated; otherwise a new ID is generated.

Structured logging hooks record operational metadata only: request ID, method, path, runtime, status, duration, error code/provider/submission type when applicable. Request payloads and candidate/contact PII are not included in the standard logger metadata contract.

## No-fake-success rule

Phase 7 removes prior Cloudflare/Vercel validation-only `202` responses. Current behavior is truthful: health works; invalid submissions fail validation; valid public submissions fail with `503 PERSISTENCE_NOT_CONFIGURED` until Phase 8 connects durable persistence; Login remains `501 AUTH_NOT_CONFIGURED`; resume/candidate application storage remains `501 RECRUITMENT_STORAGE_NOT_CONFIGURED`.

The existing frontend already renders API error messages visibly, so users are not shown a false success state.

## Future phase boundaries

Phase 8 implements durable database/storage adapters. Phase 9 implements authentication/authorization. Phase 11 provides authoritative job-management persistence. Phase 12 implements job-specific candidate application persistence and private PDF/DOC/DOCX document handling. Phase 13 implements outbound notifications through the approved email provider adapter.

No later-phase implementation is claimed by Phase 7.

# Backend

Phase 7 establishes the backend foundation as a runtime-agnostic application layer. Browser modules do not own server validation, persistence decisions, provider state, API status codes or business success.

## Ownership

- `application.js` wires config, providers, repositories, services, handlers and routing.
- `api/` owns route definitions and handlers.
- `validation/` owns canonical server-side input validation.
- `services/` owns backend use-case orchestration.
- `repositories/` defines persistence contracts.
- `providers/` defines database, private storage and email provider boundaries.
- `core/` owns errors, response envelopes, request IDs, payload limits and logging hooks.
- `runtime/` adapts the shared application to Cloudflare Workers.

`server.mjs` and `api/[action].js` are runtime adapters only. They must not regain duplicated validation or persistence logic.

## Phase boundary

Phase 7 does not create production database schemas, private candidate-document storage, admin authentication, a job CMS or transactional email delivery. Those belong to later phases.

Until persistence is configured, public write endpoints fail explicitly with `503 PERSISTENCE_NOT_CONFIGURED`; they never return a success response for data that was not durably stored.

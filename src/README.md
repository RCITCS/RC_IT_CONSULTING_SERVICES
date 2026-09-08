# Source Architecture

`src/` is the authoritative application source. `public/` contains only browser-delivered static shell/assets; application JavaScript and CSS must not be authored under `public/`.

## Frontend

- `frontend/app/` — current application bootstrap/data/rendering modules during migration. Phase 3 moves page ownership out of this compatibility area.
- `frontend/pages/` — explicit named page modules grouped by business route.
- `frontend/components/` — reusable UI primitives and shared composition.
- `frontend/layouts/` — page and shell layout composition.
- `frontend/router/` — route definitions and route resolution.
- `frontend/config/` — company, navigation and environment-safe public configuration.
- `frontend/utils/` — focused browser utilities with no business ownership.
- `frontend/styles/` — authoritative public CSS source.

## Backend

- `backend/runtime/` — deployable runtime adapters such as the Cloudflare Worker.
- `backend/api/` — request handlers and transport boundary.
- `backend/services/` — business services and provider abstractions.
- `backend/database/` — schema, migrations and repository implementations.
- `backend/security/` — authentication, authorization and security primitives.
- `backend/admin/` — private administration product source.

## Rule

New work goes to the owning directory. Do not recreate a flat `public/js` or `public/css` application tree.

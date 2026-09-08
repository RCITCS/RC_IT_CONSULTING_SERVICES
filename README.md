# RC IT Services

Working frontend + interaction foundation for the dedicated RC IT Services website.

## Run

Requires Node.js 20+.

```bash
npm run dev
```

Open:

```text
http://localhost:4173
```

No package installation is required for this milestone.

## Test

```bash
npm test
```

Current smoke suite verifies 28 routes, static assets, contact validation, demo requests, consultation requests, CV upload and the intentional Login integration boundary.

## Design direction

- clean white / pale-white base
- cobalt blue primary accent replacing the reference site's green
- deep navy text / corporate contrast
- restrained motion
- real photography relevant to the service or industry
- no fabricated client proof, fake metrics or AI-style decorative visual noise

Brand tokens are in `public/css/tokens.css`, so the final approved accent colour can be changed globally without redesigning individual pages.

## Architecture

See:

- `docs/ARCHITECTURE.md`
- `docs/ROUTE_AND_INTERACTION_MATRIX.md`
- `docs/QA_CHECKLIST.md`
- `THIRD_PARTY_ASSETS.md`

## Important production integrations

The local server gives the UI real behaviour for validation, persistence and uploads, but production should connect:

- enquiries to approved CRM/email workflow
- resumes to approved ATS/storage with malware scanning and retention controls
- login to approved identity provider and portal backend
- analytics only after privacy/cookie requirements are agreed

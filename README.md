# RC IT Services

Production-oriented public website and private administration foundation for RC IT Services.

## Run

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:4173
```

## Test

```bash
npm test
```

The verification suite covers the layered backend, Supabase persistence/private storage, Phase-9 administrator authentication/security, 158 prerendered routes, SEO and performance budgets.

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
- `docs/PHASE_9_VERIFICATION.md`
- `THIRD_PARTY_ASSETS.md`

## Important production integrations

The public runtime has server-authoritative validation and Supabase persistence boundaries. The private administrator authentication surface is maintained separately under supabase/functions/admin-auth.

Later phases still need to connect:

- enquiries to approved CRM/email workflow
- resumes to approved ATS/storage with malware scanning and retention controls
- analytics only after privacy/cookie requirements are agreed

# Vercel deployment

This repository is prepared for Git-connected Vercel deployment.

## Static site

`npm run build` copies `public/` to `dist/`. Vercel serves the built assets and falls back to `index.html` for the site's client-side routes, so deep links such as `/services/it/cloud-computing` resolve correctly.

## Preview API behavior

The `api/[action].js` serverless function keeps form interactions testable on Vercel and performs the same basic input validation for contact, demo, consultation, chat, login and resume routes.

The Vercel preview handlers are deliberately **stateless**. They do not claim to persist enquiries or CVs because serverless local storage is not durable. Before production launch, connect the approved CRM/email destination and a durable, privacy-reviewed CV storage workflow.

The local `server.mjs` remains available for local development and smoke tests.

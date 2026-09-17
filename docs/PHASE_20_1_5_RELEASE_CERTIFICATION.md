# Phase 20.1–20.5 — Release Certification

## Scope

Phase 20 is release certification, not a feature phase. Modules 20.1–20.5 prove that the repository baseline is controlled, stale release debris is removed, the full CI/CD surface remains green, the production build is internally coherent, and the canonical public production deployment exposes the exact approved `main` SHA.

No Phase 20 gate may be weakened solely to make CI green. A failing gate must be classified as a product defect, test defect, configuration defect, or infrastructure variance using evidence before it is changed or rerun.

## 20.1 — Release Baseline & Exact-SHA Freeze

The Phase 20 branch starts from the completed Phase 19 production release:

`76f99be9938b0eedce92041be1b265279fe955b2`

The Phase 20 certification branch is:

`phase20-release-certification`

Acceptance rules:

- the Phase 19 release SHA must remain an ancestor of the Phase 20 candidate;
- Phase 20 changes must be limited to release-certification controls or fixes required by those controls;
- `main` must not be reset or rewritten;
- the Phase 20 candidate must be merged only after branch-level certification is green;
- after merge, production must converge to the exact merge SHA before 20.5 is accepted.

## 20.2 — Repository & Release Hygiene Audit

Release hygiene is enforced by `tests/phase20-release-certification.mjs`.

The audit rejects:

- tracked `.env` secret files (documented templates are allowed);
- committed build/test output such as `dist`, `node_modules`, Lighthouse reports, Playwright reports, coverage, or test-results;
- temporary/debug/diagnostic GitHub Actions workflows in the release branch;
- unresolved merge-conflict markers in executable/configuration source;
- tracked private-key material;
- accidental reintroduction of known temporary Phase 17 diagnostic workflow files;
- Cloudflare production configurations that re-enable `workers.dev` or preview URLs.

Two stale draft pull requests identified during this audit were closed without merge:

- PR #87 — Phase 17 live admin diagnostics; explicitly temporary and documented to be closed without merge;
- PR #61 — obsolete Phase 12 draft, superseded by later production-certified work and hundreds of subsequent commits.

Closing those PRs does not remove runtime code from `main`.

## 20.3 — Complete CI/CD Certification

`.github/workflows/phase20-release-certification.yml` runs the inherited production verification suite rather than replacing it.

Required branch-level gates include:

- `npm run verify`;
- all architecture/security/persistence/admin/runtime regression tests inherited by that command;
- production build;
- performance budgets;
- prerendered SEO verification;
- Wrangler 4.131.0 dry-run compilation for the public Worker, admin staging Worker, admin production Worker, and Cloudflare Builds admin root.

The existing independent workflows remain authoritative as additional regression evidence; Phase 20 does not bypass them.

## 20.4 — Production Build & Artifact Integrity

`scripts/check-release-artifacts.mjs` validates the freshly built `dist` output.

It requires:

- prerendered route HTML output and 404 output;
- `sitemap.xml`, `robots.txt`, and `_redirects`;
- content-hashed application JavaScript and CSS;
- route-level and global CSS artifacts;
- no fallback unhashed `app.js`/`app.css` production assets;
- the exact CI commit SHA embedded as `rc-deployment-sha` in generated HTML;
- canonical `rcitcs.com` sitemap ownership with no admin or `workers.dev` indexing leakage;
- non-empty release artifacts.

## 20.5 — Cloudflare Exact-SHA Deployment Verification

The post-merge Phase 20 production gate is intentionally main-only.

It waits for `https://rcitcs.com/` to expose:

`<meta name="rc-deployment-sha" content="<GITHUB_SHA>">`

for the exact merged `main` SHA. It then verifies representative public runtime behavior, API health, immutable hashed-asset caching, production admin privacy/cache/indexing headers, HSTS, and rejection of the legacy `workers.dev` browser identity.

The existing `Cloudflare Exact Deployment Gate`, Phase 18 exact-production responsive acceptance, Phase 19 exact-production quality acceptance, and normal RC IT Services production smoke workflows remain independent corroborating evidence.

## Definition of Done for 20.1–20.5

Modules 20.1–20.5 are complete only when:

1. the branch is descended from the Phase 19 certified release baseline;
2. the hygiene audit is green and stale draft PRs are closed without merge;
3. full inherited verification and Wrangler dry-run certification are green on the Phase 20 candidate SHA;
4. release artifact integrity is green on that exact candidate SHA;
5. the candidate is merged without rewriting `main`;
6. all applicable workflows on the merged SHA are green; and
7. canonical production exposes the exact merged SHA and passes the Phase 20 exact-production gate.

Only after those conditions are proven should work continue to Phase 20.6.
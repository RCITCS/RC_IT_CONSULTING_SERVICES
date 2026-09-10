# Phase 11 — Job Management CMS Verification

## Release state

**Pre-merge acceptance: PASSED.**

Phase 11 may be marked `COMPLETED & VERIFIED` only after PR #28 is merged and the resulting exact `main` SHA passes the post-merge CI/deployment/mirror/live-route gates.

## Authority and scope

- Baseline `main`: `07efc473aa872bf5e2f921b8922fc5a54b6431ff` (Phase 10 closure).
- Working branch: `phase-11-job-management-cms`.
- Pull request: #28.
- Phase 11 owns the server-authoritative Job Management CMS and database-backed public Careers vacancy runtime.
- Phase 12 candidate application persistence/submission is deliberately excluded from Phase 11.

## Product Owner acceptance

The Phase 11 CMS supports create draft, authoritative edit, private preview, publish/unpublish, close, archive/restore, duplicate, guarded permanent deletion of never-published drafts with zero applications, categories, role metadata, publication windows and database-backed public vacancy rendering.

The locked recruitment specification was reconciled before merge:

- job identifiers are generated server-side;
- identifiers are opaque corporate codes, unique, immutable and never reused;
- required programming languages/technologies, required skills, preferred skills, industry context, preferred qualifications, working-style detail, location detail and application response window are persisted;
- admin preview and public vacancy pages consume the same canonical job-content authority;
- the administrator cannot edit the generated job identifier.

## Architecture and data ownership

- PostgreSQL is the production vacancy source of truth.
- Client/UI state does not authorize publication or role access.
- Active `super_admin` authority is required server-side.
- Optimistic concurrency uses record versions and rejects stale mutations visibly.
- Status changes are separate audited transitions.
- Public vacancy eligibility is computed from authoritative status/opening/closing state.
- The legacy static catalogue no longer owns production vacancy state.
- A forward-only idempotent prerequisite migration converges the checked-in Phase 8 schema (`work_model`/`sort_order`/missing `published_at`) before Phase 11 migrations consume `workplace_type`/`display_order`/`published_at`.

## Security verification

Verified in production for:

- `get_admin_job_management_context(uuid,uuid)`
- `admin_save_job(uuid,uuid,integer,jsonb,text,text)`
- `admin_transition_job(uuid,uuid,integer,text,text,text)`
- `admin_duplicate_job(uuid,uuid,integer,text,text)`
- `admin_delete_job(uuid,uuid,integer,text,text)`
- `get_job_content_document(uuid)`
- `get_public_careers_context(text)`

All verified functions are `SECURITY INVOKER`, not executable by `anon` or `authenticated`, and executable by `service_role` at the database API boundary.

Additional verified controls include job-code registry RLS/browser deny, server-backed CSRF, same-origin protection before mutations, route-scoped request ceilings, bounded streamed handling when `Content-Length` is absent, no-cache/no-index private admin responses, and **0 Supabase Security Advisor findings** after Phase 11 DDL changes.

## Job identifier verification

Production after convergence:

- 46 jobs;
- 46 published jobs;
- 18 categories;
- 0 null job codes;
- 0 malformed corporate job codes;
- 0 duplicate job codes;
- 46 active generated identifiers in `job_code_registry`;
- 46 retired legacy identifiers retained permanently;
- server allocation trigger active;
- immutable-code trigger active;
- `jobs.code` remains `NOT NULL` after final convergence.

Deleted never-published draft identifiers are retired in the registry rather than made reusable.

## Production integration verification

A rollback-contained production lifecycle test verified unauthorized fail-closed behavior, server-generated codes, locked-field persistence, stale-save rejection, code immutability, publish/public projection, stale-transition rejection, published-history delete protection, duplicate with a distinct generated code, safe draft deletion with code retirement, close/public removal, archive/restore and audit creation.

The verification transaction was rolled back. A separate residue check confirmed 46 production jobs, 18 categories, zero verification jobs, zero verification audit rows, 46 active registry entries and 46 retired entries.

## Edge Function verification

Production Supabase Edge Function:

- function: `admin-auth`;
- status: `ACTIVE`;
- deployed version: **15**;
- function id: `d3464fc6-eeb5-4f51-b341-f19f9aabb7b8`;
- deployment hash: `f810052a342306b14c05ee488e84c8e19aadc0b25e86e7547d44466390debb99`;
- `verify_jwt=false` retained intentionally because the established application implements its own hardened administrator/session boundary;
- deployment contains the Phase 11 Jobs routes, CMS fields, bounded request handling and updated authenticated navigation.

The v15 deployment source is semantically aligned with the tested Phase 11 admin source but was compacted during deployment; this record does **not** claim byte-for-byte source identity. Later Phase 11 commits after the v15 deployment modify public Careers JavaScript, tests, migrations and this verification document only, not the Supabase Edge Function source files.

## Frontend and end-user verification

- Jobs is discoverable from Overview, Jobs and Security in desktop and mobile administration navigation.
- Overview remains read-only.
- Job editor uses adaptive form grids and existing responsive admin shell behavior.
- Generated job code is displayed read-only.
- Private preview renders the canonical candidate-facing fields.
- Empty/filter/stale/error/delete-blocked states are explicit rather than fake-success states.
- Legacy Careers JavaScript no longer prevents navigation for runtime PostgreSQL vacancy cards: native navigation is suppressed only when the legacy in-page selector actually handled a static role.

## SEO verification

Phase 11 uses a truthful pre-application SEO boundary:

- `/careers` and published canonical vacancy pages remain crawlable (`index,follow`);
- unavailable/error/application-placeholder routes are `noindex,nofollow`;
- job title remains separate from the immutable job identifier;
- Phase 11 does **not** emit Google `JobPosting` structured data and does not claim direct-apply semantics while candidate submission is disabled;
- `JobPosting` eligibility is deferred to Phase 12 and may be enabled only when the real application method is live and verified.

## QA / CI verification

Exact-head PR CI immediately before the first verification-record commit:

- CI run: #227 (`34514712236`);
- head: `5e4d631b7b0a56e88170970a1f79c0ec8993008f`;
- Architecture, test and production build: **SUCCESS**.

That run passed source architecture, backend, persistence, authentication, Phase 10 dashboard, visual delivery, Phase 11 CMS/content/seed/spec/public-Careers, route rendering, design system, performance routing, SEO/SEO-preview, production build, production performance budgets, prerendered SEO checks and Cloudflare configuration.

A new exact-head CI run is required after this final verification-document revision before merge.

## Pull-request review closure

Four P1 review threads were independently re-evaluated and fixed before resolution:

- Phase 8 -> Phase 11 schema convergence: fixed with forward-only prerequisite migration;
- nullable draft constraints: fixed in the same prerequisite/convergence chain;
- runtime-loaded vacancy card navigation: fixed and regression-tested;
- raw-source versus HTML-escaped date-label assertion: fixed.

All four threads were replied to with evidence and resolved only after implementation and re-verification.

## Role sign-off

| Review role | Result | Acceptance basis |
| --- | --- | --- |
| Product Owner | PASS | Locked CMS fields/workflows and truthful Phase 12 boundary satisfied |
| Solution / Software Architect | PASS | PostgreSQL authority, canonical content contract, forward-only migrations, versioned workflows |
| Senior Frontend | PASS | Discoverable admin navigation, adaptive editor, truthful candidate/UI states, runtime-link fix |
| Backend | PASS | Server-owned validation/RBAC/transitions, canonical RPCs, explicit errors and concurrency |
| QA | PASS | Regression suite plus rollback-contained production lifecycle verification |
| Security | PASS | Server authority, CSRF/origin/input limits, RLS/grants, Security Advisor 0 findings |
| SEO | PASS | Crawlable canonical vacancy pages; no premature JobPosting/direct-apply claim |
| Performance | PASS | CI performance budgets and set-based public/admin database reads |
| Accessibility / Responsive | PASS | Existing admin shell accessibility/responsive contracts preserved; Jobs navigation available on mobile |
| Admin end user | PASS | Full CMS workflow reachable from authenticated workspace with explicit states/actions |
| Candidate end user | PASS | Approved vacancy content is database-backed and navigable; application state is explicitly not yet open |

## Remaining closure gate

Do not mark Phase 11 `COMPLETED & VERIFIED` until all of the following pass on the resulting merge SHA:

1. final exact-head PR CI after this verification-document revision;
2. PR #28 merge using an expected-head SHA guard;
3. exact merged `main` SHA CI/deployment verification;
4. live Cloudflare route verification;
5. mirror repository exact-SHA verification;
6. final production Supabase invariant and Edge Function status check.

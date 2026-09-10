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

The Phase 11 CMS supports:

- create draft;
- edit authoritative vacancy content;
- private preview;
- publish and unpublish;
- close;
- archive and restore;
- duplicate into a new draft;
- guarded permanent deletion only for never-published drafts with zero applications;
- categories, employment/location metadata, opening/closing windows and candidate-facing content;
- database-backed public Careers pages instead of source-code vacancy authority.

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

All verified functions are:

- `SECURITY INVOKER`;
- not executable by `anon`;
- not executable by `authenticated`;
- executable by `service_role` only at the database API boundary.

Additional verified controls:

- RLS remains enabled on sensitive job-code registry data;
- browser access to the registry is denied;
- CSRF remains server-backed;
- same-origin protections remain ahead of mutations;
- admin requests use route-scoped size ceilings;
- chunked requests without `Content-Length` are inspected as bounded streams and cancelled when oversized;
- private admin responses remain no-cache/no-index;
- Supabase Security Advisor: **0 findings** after Phase 11 DDL changes.

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

A rollback-contained production lifecycle test verified:

1. unauthorized admin context fails closed;
2. a client-supplied job code cannot control the stored identifier;
3. create assigns a valid registered corporate identifier;
4. required/preferred skills and application response window persist;
5. stale save is rejected;
6. attempted identifier modification is ignored/preserved;
7. publish succeeds;
8. public context exposes the published canonical content;
9. stale status transition is rejected;
10. permanent deletion of a published/history-bearing vacancy is rejected;
11. duplicate receives a distinct generated identifier and preserves approved content;
12. a never-published duplicate can be permanently deleted and its code is retired;
13. close removes public eligibility;
14. archive and restore transitions succeed;
15. audit history is written for the lifecycle.

The verification transaction was rolled back. A separate residue check confirmed:

- production jobs: 46;
- production categories: 18;
- verification jobs: 0;
- verification audit rows: 0;
- active code-registry entries: 46;
- retired code-registry entries: 46.

## Edge Function verification

Production Supabase Edge Function:

- function: `admin-auth`;
- status: `ACTIVE`;
- deployed version: **15**;
- function id: `d3464fc6-eeb5-4f51-b341-f19f9aabb7b8`;
- `verify_jwt=false` retained intentionally because the established application implements its own hardened administrator/session boundary;
- deployment contains the Phase 11 Jobs routes, CMS fields, bounded request handling and updated authenticated navigation.

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
- `JobPosting` eligibility is intentionally deferred to Phase 12 and may be enabled only when the real application method is live and verified.

This avoids claiming a working application workflow before it exists.

## QA / CI verification

Exact-head PR CI immediately before this verification record:

- CI run: #227 (`34514712236`);
- head: `5e4d631b7b0a56e88170970a1f79c0ec8993008f`;
- Architecture, test and production build: **SUCCESS**.

The run passed:

- source architecture checks;
- backend regression tests;
- persistence regression tests;
- admin authentication regression tests;
- Phase 10 dashboard regression tests;
- admin visual-delivery regression tests;
- Phase 11 CMS/content/seed/spec-convergence/public-Careers contracts;
- route-rendering tests;
- design-system tests;
- performance-routing tests;
- SEO and SEO-preview tests;
- optimized production build;
- production performance budgets;
- prerendered SEO production checks;
- Cloudflare configuration verification.

A new exact-head CI run is still required after this documentation commit before merge.

## Pull-request review closure

Four P1 review threads were independently re-evaluated rather than dismissed:

- Phase 8 -> Phase 11 schema convergence: fixed with forward-only prerequisite migration;
- nullable draft constraints: fixed in the same prerequisite/convergence chain;
- runtime-loaded vacancy card navigation: fixed and regression-tested;
- raw-source versus HTML-escaped date-label assertion: fixed.

All four threads were replied to with evidence and resolved only after the fixes were implemented and reverified.

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

1. final exact-head PR CI after this verification record;
2. PR #28 merge using an expected-head SHA guard;
3. exact merged `main` SHA CI/deployment verification;
4. live Cloudflare route verification;
5. mirror repository exact-SHA verification;
6. final production Supabase invariant and Edge Function status check.

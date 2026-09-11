import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const [migration, hardening, db, index, routes, ui, publicRepository, publicRuntime, worker, catalog] = await Promise.all([
  read('supabase/migrations/20260910152000_phase_11_job_management_cms.sql'),
  read('supabase/migrations/20260910161000_phase_11_job_management_hardening.sql'),
  read('supabase/functions/admin-auth/db.ts'),
  read('supabase/functions/admin-auth/index.ts'),
  read('supabase/functions/admin-auth/job-routes.ts'),
  read('supabase/functions/admin-auth/jobs.ts'),
  read('src/backend/repositories/public-jobs-repository.js'),
  read('src/backend/runtime/public-careers.js'),
  read('src/backend/runtime/worker.js'),
  read('src/frontend/content/career-jobs-catalog.js')
]);

for (const field of [
  'code', 'slug', 'title', 'summary', 'description', 'location', 'workplace_type',
  'employment_type', 'experience', 'technologies', 'industries', 'responsibilities',
  'qualifications', 'preferred_qualifications', 'benefits', 'working_style_details',
  'location_details', 'opens_at', 'closes_at', 'status', 'version'
]) assert.ok(migration.includes(field), `Phase 11 jobs schema missing ${field}`);

for (const status of ['draft','published','closed','archived']) assert.ok(migration.includes(`'${status}'`));
for (const action of ['publish','unpublish','close','archive','restore']) assert.ok(migration.includes(`'${action}'`) || hardening.includes(`'${action}'`));
for (const auditAction of ['job_created','job_updated','job_published','job_unpublished','job_closed','job_archived','job_restored','job_duplicated','job_deleted']) assert.ok(migration.includes(auditAction) || hardening.includes(auditAction), `Missing audit action ${auditAction}`);

assert.ok(migration.includes('unique (slug)'));
assert.ok(migration.includes('unique (code)'));
assert.ok(migration.includes('version integer not null default 1'));
assert.ok(migration.includes('application_count'));
assert.ok(migration.includes('on delete restrict'));
assert.ok(migration.includes('jobs_publication_window_check'));
assert.ok(migration.includes('admin_save_job'));
assert.ok(migration.includes('admin_transition_job'));
assert.ok(migration.includes('admin_duplicate_job'));
assert.ok(migration.includes('admin_delete_job'));
assert.ok(migration.includes('get_admin_job_management_context'));
assert.ok(migration.includes('get_public_careers_context'));
assert.ok(migration.includes('security invoker'));
assert.ok(migration.includes('revoke all on function'));
assert.ok(migration.includes('grant execute on function'));
assert.ok(hardening.includes('jobs_preserve_immutable_fields'));
assert.ok(hardening.includes('stale version'));

for (const fn of ['jobManagementContext','saveJob','transitionJob','duplicateJob','deleteJob']) assert.ok(db.includes(`function ${fn}`), `DB adapter missing ${fn}`);
assert.ok(index.includes('handleJobRoute'));
assert.ok(routes.includes('authState.admin.role !== "super_admin"'));
assert.ok(routes.includes('csrfOk'));
assert.ok(index.includes('request.clone().body'));
assert.ok(index.includes('reader.cancel()'));
assert.ok(!index.includes('request.clone().arrayBuffer()'));
assert.ok(routes.includes('expected_version'));
assert.ok(routes.includes('STALE_VERSION'));
assert.ok(routes.includes('DELETE_POLICY'));

assert.ok(ui.includes('aria-label="Administration"'));
assert.ok(ui.includes('aria-current="page"'));
assert.ok(ui.includes('No jobs match this view.'));
assert.ok(ui.includes('stale versions are rejected'));
assert.ok(ui.includes('Generated automatically'));
assert.ok(!ui.includes('name="code"'), 'Job code must not be editable in the admin form.');

assert.ok(worker.includes('isPublicCareersRuntimePath'));
assert.ok(worker.includes('handlePublicCareersRequest'));
assert.ok(!catalog.includes('career-jobs.js'));
assert.ok(!catalog.includes('career-jobs-data-expansion.js'));
assert.ok(!catalog.includes('career-jobs-services-expansion.js'));
assert.ok(catalog.includes('server-authoritative in PostgreSQL'));
assert.ok(publicRepository.includes('rpc/get_public_careers_context'));
assert.ok(publicRepository.includes('getCareersContext'));
assert.ok(!publicRepository.includes('rpc/get_public_jobs'), 'Public runtime should not download full content for every list item.');
assert.ok(publicRepository.includes('requiredSkills'));
assert.ok(publicRepository.includes('preferredSkills'));
assert.ok(publicRepository.includes('applicationResponseWindow'));
assert.ok(publicRuntime.includes('siteOriginFromHtml'));
assert.ok(!publicRuntime.includes("const SITE_ORIGIN = 'https://rcitcs.com'"), 'Runtime SEO must not diverge from the build-approved canonical origin.');
assert.ok(publicRuntime.includes('getCareersContext(slug)'));
assert.ok(publicRuntime.includes("robots = 'index,follow'"));
assert.ok(publicRuntime.includes('Apply for this role'), 'Phase 12 must advance the Phase 11 vacancy surface to the real application journey without changing job-content authority.');
assert.ok(publicRuntime.includes('/apply'));
assert.ok(publicRuntime.includes("robots: 'noindex,nofollow'"), 'Application/error surfaces must remain noindex after Phase 12 enables submission.');

for (const secretPattern of ['SUPABASE_SERVICE_ROLE_KEY=', 'ADMIN_BOOTSTRAP_PASSWORD_VERIFIER=', 'sb_secret_']) {
  assert.ok(!ui.includes(secretPattern) && !routes.includes(secretPattern), `Secret-like value leaked into Phase 11 presentation: ${secretPattern}`);
}

console.log('PASS: Phase 11 job CMS authority, locked content contract, generated identifiers, transitions, concurrency, audit/deletion policy, CSRF/RBAC, bounded input, responsive workflow and optimized DB access remain verified while Phase 12 legitimately enables application intake.');

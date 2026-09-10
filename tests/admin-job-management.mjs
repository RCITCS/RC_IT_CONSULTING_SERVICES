import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');

const [migration, hardening, convergence, db, index, routes, ui, worker, catalog, publicRepository, publicRuntime] = await Promise.all([
  read('supabase/migrations/20260910152000_phase_11_job_management_cms.sql'),
  read('supabase/migrations/20260910161000_phase_11_job_management_hardening.sql'),
  read('supabase/migrations/20260910165000_phase_11_cms_spec_convergence.sql'),
  read('supabase/functions/admin-auth/db.ts'),
  read('supabase/functions/admin-auth/index.ts'),
  read('supabase/functions/admin-auth/job-routes.ts'),
  read('supabase/functions/admin-auth/jobs.ts'),
  read('src/backend/runtime/worker.js'),
  read('src/frontend/app/career-job-catalog.js'),
  read('src/backend/repositories/public-jobs-repository.js'),
  read('src/backend/runtime/public-careers.js')
]);

for (const column of [
  'code text', 'experience text', 'technologies jsonb', 'responsibilities jsonb',
  'qualifications jsonb', 'benefits jsonb', 'opens_at timestamptz', 'archived_at timestamptz',
  'version integer'
]) assert.ok(migration.includes(column), `Phase 11 schema field missing: ${column}`);

for (const fn of [
  'get_admin_job_management_context', 'admin_save_job', 'admin_transition_job',
  'admin_duplicate_job', 'admin_delete_job', 'get_public_jobs', 'get_public_job'
]) assert.ok(migration.includes(`function public.${fn}`), `Phase 11 RPC missing: ${fn}`);

assert.ok(migration.includes("a.status = 'active'"));
assert.ok(migration.includes("a.role = 'super_admin'"));
assert.ok(migration.includes("status = 'published'"));
assert.ok(migration.includes("j.opens_at is null or j.opens_at <= now()"));
assert.ok(migration.includes("j.closes_at is null or j.closes_at > now()"));
assert.ok(migration.includes('for update'), 'Job mutations must serialize on the authoritative record.');
assert.ok(migration.includes('STALE_VERSION'), 'Optimistic concurrency must fail visibly.');
assert.ok(migration.includes('version = j.version + 1'), 'Successful mutations must advance the record version.');
assert.ok(migration.includes("v_job.status <> 'draft' or v_job.published_at is not null or v_application_count > 0"), 'Permanent delete policy must protect published/history-bearing jobs.');
assert.ok(migration.includes("'job_created'"));
assert.ok(migration.includes("'job_updated'"));
assert.ok(migration.includes("'job_duplicated'"));
assert.ok(migration.includes("'job_deleted'"));
assert.ok(migration.includes("'job_' || v_action"));
assert.ok(migration.includes('before_data'));
assert.ok(migration.includes('after_data'));
assert.ok(/security invoker/gi.test(migration));
assert.ok(!/security\s+definer/i.test(migration), 'Phase 11 RPCs must not bypass RLS via SECURITY DEFINER.');
assert.ok(!/grant\s+execute[\s\S]{0,180}\bto\s+(?:anon|authenticated)\b/i.test(migration), 'Browser roles must not execute private/public job database RPCs directly.');

assert.ok(hardening.includes('drop constraint if exists jobs_check'), 'Obsolete published_at/close-date constraint must be retired.');
assert.ok(hardening.includes('get_public_careers_context'), 'Public Careers must have a one-round-trip context RPC.');
assert.ok(hardening.includes('select ap.job_id, count(*)::bigint as application_count'), 'Admin job list must aggregate application counts in one set operation.');
assert.ok(!hardening.includes("'application_count', (select count(*)"), 'Admin job list must not reintroduce per-job count subqueries.');

for (const field of ['required_skills', 'preferred_skills', 'application_response_window']) {
  assert.ok(convergence.includes(field), `Locked Phase 11 field missing: ${field}`);
}
assert.ok(convergence.includes('job_code_registry'));
assert.ok(convergence.includes('jobs_assign_job_code'));
assert.ok(convergence.includes('jobs_preserve_job_code'));
assert.ok(convergence.includes('get_job_content_document'));
assert.ok(convergence.includes('alter table public.jobs alter column code set not null'));
assert.ok(!/p_payload\s*->>\s*'code'/.test(convergence), 'Client payload must not control job code after convergence.');
assert.ok(/security invoker/gi.test(convergence));
assert.ok(!/security\s+definer/i.test(convergence));
assert.ok(!/grant\s+execute[\s\S]{0,180}\bto\s+(?:anon|authenticated)\b/i.test(convergence));

for (const adapter of ['jobManagementContext', 'saveJob', 'transitionJob', 'duplicateJob', 'deleteJob']) {
  assert.ok(db.includes(`function ${adapter}`), `Edge database adapter missing: ${adapter}`);
}
for (const rpc of ['rpc/get_admin_job_management_context', 'rpc/admin_save_job', 'rpc/admin_transition_job', 'rpc/admin_duplicate_job', 'rpc/admin_delete_job']) {
  assert.ok(db.includes(rpc), `Edge adapter is not calling canonical RPC: ${rpc}`);
}

assert.ok(index.includes('handleJobRoute'));
assert.ok(index.includes('jobs: true'));
assert.ok(index.includes('phase11-job-management-cms'));
assert.ok(index.includes('path.startsWith("/jobs") ? 131072 : 32768'), 'Admin payload ceilings must remain route scoped.');
assert.ok(index.includes('originOk(request, url)'), 'Phase 9 same-origin protection must remain ahead of Phase 11 mutations.');
assert.ok(index.includes('request.clone().body'), 'Chunked admin requests must be inspected as a bounded stream.');
assert.ok(index.includes('body.getReader()'));
assert.ok(index.includes('total > limit'));
assert.ok(index.includes('reader.cancel()'));
assert.ok(!index.includes('request.clone().arrayBuffer()'), 'Chunked admin request validation must not buffer an unbounded body before rejection.');

for (const route of ['/jobs/create', '"edit"', '"preview"', '"delete"', '"update"', '"transition"', '"duplicate"']) {
  assert.ok(routes.includes(route), `Job route contract missing: ${route}`);
}
assert.ok(routes.includes('shaHex(submitted) === state.csrf_token_hash'), 'Phase 11 mutations must validate server-backed CSRF.');
assert.ok(routes.includes('Europe/London'));
assert.ok(routes.includes('STALE_VERSION'));
assert.ok(routes.includes('confirm_slug'));
assert.ok(routes.includes('303'));
assert.ok(!routes.includes('localStorage') && !routes.includes('sessionStorage'), 'Admin workflow state must not move into browser storage.');

for (const capability of [
  'Create job', 'Edit job', 'Preview', 'Publish', 'Unpublish', 'Close', 'Archive', 'Restore', 'Duplicate',
  'Category', 'Location', 'Work model', 'Employment type', 'Experience required',
  'Required programming languages / technologies', 'Required skills', 'Preferred skills',
  'Job description', 'Responsibilities', 'Qualifications', 'Preferred qualifications',
  'Benefits & employment terms', 'Application response window', 'Industry context',
  'Nature of working style', 'Opening date & time', 'Closing date & time'
]) assert.ok(ui.includes(capability), `Admin UI capability missing: ${capability}`);
assert.ok(ui.includes('repeat(auto-fit,minmax('), 'Phase 11 editor must retain responsive adaptive form grids.');
assert.ok(ui.includes('mobile-nav'));
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
assert.ok(publicRuntime.includes('Applications opening soon'));
assert.ok(!publicRuntime.includes('data-rcitcs-job-posting'), 'Google JobPosting markup must wait until Phase 12 provides a real application method.');
assert.ok(!publicRuntime.includes('directApply:'), 'Direct-apply semantics must not be claimed before Phase 12.');

for (const secretPattern of ['SUPABASE_SERVICE_ROLE_KEY=', 'ADMIN_BOOTSTRAP_PASSWORD_VERIFIER=', 'sb_secret_']) {
  assert.ok(!ui.includes(secretPattern) && !routes.includes(secretPattern), `Secret-like value leaked into Phase 11 presentation: ${secretPattern}`);
}

console.log('PASS: Phase 11 job CMS authority, locked content contract, generated identifiers, transitions, concurrency, audit/deletion policy, CSRF/RBAC, bounded input, responsive workflow, optimized DB access and truthful pre-application Careers SEO contracts verified.');

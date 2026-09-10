import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');

const [migration, adminUi, publicRepository, publicRuntime] = await Promise.all([
  read('supabase/migrations/20260910165000_phase_11_cms_spec_convergence.sql'),
  read('supabase/functions/admin-auth/jobs.ts'),
  read('src/backend/repositories/public-jobs-repository.js'),
  read('src/backend/runtime/public-careers.js')
]);

for (const field of ['required_skills', 'preferred_skills', 'application_response_window']) {
  assert.ok(migration.includes(field), `Locked Phase 11 database field missing: ${field}`);
  assert.ok(adminUi.includes(field), `Locked Phase 11 admin field missing: ${field}`);
}

for (const requirement of [
  'job_code_registry', 'jobs_assign_job_code', 'jobs_preserve_job_code',
  'jobs_corporate_code_format_check', 'alter table public.jobs alter column code set not null',
  'get_job_content_document', 'server_generated', 'draft_deleted'
]) assert.ok(migration.includes(requirement), `Job identifier/content authority missing: ${requirement}`);

assert.ok(migration.includes("code ~ '^RC-[A-Z0-9]{2,5}-[0-9]{2}-[A-Z0-9]{3}-[A-Z0-9]{6}$'"));
assert.ok(migration.includes("metadata = metadata || jsonb_build_object('retired_reason', 'draft_deleted')"), 'Deleted identifiers must remain permanently reserved.');
assert.ok(!/p_payload\s*->>\s*'code'/.test(migration), 'Client payload must not control the immutable job identifier.');
assert.ok(!adminUi.includes('name="code"'), 'Admin form must not expose an editable job-code input.');
assert.ok(!adminUi.includes('form.get("code")'), 'Admin form parser must not accept a client-supplied job code.');
assert.ok(adminUi.includes('Generated automatically'));
assert.ok(adminUi.includes('Server generated · immutable · never reused.'));
assert.ok(adminUi.includes('Canonical candidate-content preview'));

for (const candidateLabel of [
  'Required programming languages / technologies', 'Required skills', 'Preferred skills',
  'Application response window', 'Industry context', 'Preferred qualifications',
  'Nature of working style', 'Location details'
]) assert.ok(adminUi.includes(candidateLabel), `Admin editor/preview omitted locked candidate field: ${candidateLabel}`);

for (const mapping of ['requiredSkills', 'preferredSkills', 'applicationResponseWindow']) {
  assert.ok(publicRepository.includes(mapping), `Public repository omitted canonical mapping: ${mapping}`);
}
for (const label of ['Required skills', 'Preferred skills', 'Application response window', 'Industry context', 'Preferred qualifications', 'Nature of working style']) {
  assert.ok(publicRuntime.includes(label), `Public candidate renderer omitted canonical field: ${label}`);
}

assert.ok(publicRuntime.includes("robots = 'index,follow'"), 'Published public job pages must default to indexable SEO state.');
assert.ok(publicRuntime.includes("robots: 'noindex,nofollow'"), 'Application/error surfaces must remain noindex.');
assert.ok(publicRuntime.includes('data-rcitcs-job-posting'), 'Published eligible jobs must receive JobPosting structured data.');
assert.ok(publicRuntime.includes('directApply: false'), 'Phase 11 must not claim direct apply before Phase 12.');
assert.ok(publicRuntime.includes('identifier:'), 'Structured data must use the immutable hiring identifier.');

for (const source of [migration, adminUi, publicRepository, publicRuntime]) {
  for (const secretPattern of ['ADMIN_BOOTSTRAP_PASSWORD_VERIFIER=', 'SUPABASE_SERVICE_ROLE_KEY=', 'sb_secret_']) {
    assert.ok(!source.includes(secretPattern), `Secret-like value leaked into Phase 11 convergence source: ${secretPattern}`);
  }
}

console.log('PASS: Phase 11 locked CMS spec converges on server-generated immutable job codes, canonical candidate fields, shared content authority and correct public/private SEO boundaries.');

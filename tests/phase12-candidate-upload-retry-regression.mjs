import assert from 'node:assert/strict';
import fs from 'node:fs';

const edge = fs.readFileSync(new URL('../supabase/functions/candidate-applications/index.ts', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../supabase/migrations/20261002173000_phase_12_candidate_upload_retry_resilience.sql', import.meta.url), 'utf8');

assert.ok(
  edge.includes('/storage/v1/upload/resumable/sign'),
  'Candidate signed uploads must use the signed TUS endpoint.'
);
assert.ok(
  !edge.includes('endpoint: \`${storageOrigin(supabaseUrl)}/storage/v1/upload/resumable\`,'),
  'Candidate signed uploads must not use the ordinary RLS-governed TUS endpoint.'
);

for (const fragment of [
  "s.ip_hash = p_ip_hash",
  "s.created_at > now() - interval '15 minutes'",
  ">= 8"
]) {
  assert.ok(migration.includes(fragment), `raw network abuse limit must remain intact: ${fragment}`);
}

for (const fragment of [
  "s.job_id = v_job.id",
  "s.email_hash = p_email_hash",
  "s.cancelled_at is null",
  "s.consumed_at is null",
  "s.expires_at > now()"
]) {
  assert.ok(migration.includes(fragment), `retry-safe per-job/email limit missing: ${fragment}`);
}

console.log('PASS: signed TUS candidate uploads use the correct endpoint and cancelled technical retries no longer consume the per-job/email allowance.');

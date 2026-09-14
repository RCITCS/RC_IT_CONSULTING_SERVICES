import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migration = await readFile(
  path.join(root, 'supabase/migrations/20260914013000_phase_13_email_runtime_retry_hardening.sql'),
  'utf8'
);

assert.match(migration, /create or replace function public\.mark_transactional_email_failed/i);
assert.match(migration, /when p_retry_at is not null then p_retry_at/i);
assert.match(migration, /template_key <> 'admin_password_reset'/i);
assert.match(migration, /EMAIL_DISPATCH_FAILED/i);
assert.match(migration, /attempt_count < 5/i);
assert.match(migration, /when 1 then interval '5 minutes'/i);
assert.match(migration, /when 2 then interval '15 minutes'/i);
assert.match(migration, /when 3 then interval '60 minutes'/i);
assert.match(migration, /when 4 then interval '360 minutes'/i);

assert.match(migration, /create or replace function public\.claim_transactional_email/i);
assert.match(migration, /status = 'sending'[\s\S]*template_key <> 'admin_password_reset'[\s\S]*last_attempt_at <= now\(\) - interval '15 minutes'/i);
assert.match(migration, /attempt_count = attempt_count \+ 1/i);
assert.match(migration, /attempt_count < 5/i);

assert.match(migration, /create or replace function public\.list_due_transactional_email_ids/i);
assert.match(migration, /status = 'sending'[\s\S]*last_attempt_at <= now\(\) - interval '15 minutes'/i);
assert.match(migration, /template_key <> 'admin_password_reset'/i);

assert.match(migration, /'stale_sending'/i);
assert.match(migration, /create or replace function public\.transactional_email_health_snapshot/i);
for (const sensitive of ['recipient_email', 'reply_to_email', 'sender_email', 'message', 'metadata']) {
  const snapshotStart = migration.indexOf('create or replace function public.transactional_email_health_snapshot');
  const snapshotEnd = migration.indexOf('revoke execute on function public.mark_transactional_email_failed');
  const snapshot = migration.slice(snapshotStart, snapshotEnd);
  assert.ok(!snapshot.includes(sensitive), `Runtime health snapshot must not expose ${sensitive}.`);
}

assert.match(migration, /revoke execute on function public\.mark_transactional_email_failed[\s\S]*from public, anon, authenticated/i);
assert.match(migration, /revoke execute on function public\.claim_transactional_email[\s\S]*from public, anon, authenticated/i);
assert.match(migration, /grant execute on function public\.mark_transactional_email_failed[\s\S]*to service_role/i);
assert.match(migration, /grant execute on function public\.claim_transactional_email[\s\S]*to service_role/i);
assert.ok(!migration.includes('RESEND_API_KEY'));
assert.ok(!migration.includes('SUPABASE_SERVICE_ROLE_KEY'));

console.log('PASS: Phase 13.7 generic infrastructure retry fallback and stale non-reset claim recovery are locked.');

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EMAIL_TEMPLATE_KEYS } from '../supabase/functions/_shared/email-contract.js';
import {
  MAX_TRANSACTIONAL_EMAIL_ATTEMPTS,
  retryAtForEmailFailure,
  retryDelayMinutesForAttempt
} from '../supabase/functions/_shared/email-retry-policy.js';
import { EmailProviderError } from '../supabase/functions/_shared/resend-email-provider.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nowMs = Date.parse('2026-09-13T21:45:00Z');
const temporary = new EmailProviderError('temporary', {
  code: 'rate_limit_exceeded',
  retryable: true,
  status: 429
});
const permanent = new EmailProviderError('permanent', {
  code: 'validation_error',
  retryable: false,
  status: 422
});

assert.equal(MAX_TRANSACTIONAL_EMAIL_ATTEMPTS, 5);
assert.deepEqual(
  [1, 2, 3, 4, 5].map(retryDelayMinutesForAttempt),
  [5, 15, 60, 360, null]
);
for (const [attempt, minutes] of [[1, 5], [2, 15], [3, 60], [4, 360]]) {
  assert.equal(
    retryAtForEmailFailure({
      templateKey: EMAIL_TEMPLATE_KEYS.APPLICATION_ACKNOWLEDGEMENT,
      attemptCount: attempt,
      error: temporary,
      now: () => nowMs
    }),
    new Date(nowMs + minutes * 60_000).toISOString()
  );
}
assert.equal(
  retryAtForEmailFailure({
    templateKey: EMAIL_TEMPLATE_KEYS.APPLICATION_ACKNOWLEDGEMENT,
    attemptCount: 5,
    error: temporary,
    now: () => nowMs
  }),
  null,
  'Fifth failure must become dead-letter.'
);
assert.equal(
  retryAtForEmailFailure({
    templateKey: EMAIL_TEMPLATE_KEYS.CONTACT_ACKNOWLEDGEMENT,
    attemptCount: 1,
    error: permanent,
    now: () => nowMs
  }),
  null,
  'Permanent provider failures must not retry.'
);
assert.equal(
  retryAtForEmailFailure({
    templateKey: EMAIL_TEMPLATE_KEYS.ADMIN_PASSWORD_RESET,
    attemptCount: 1,
    error: temporary,
    now: () => nowMs
  }),
  null,
  'Password-reset links must never be automatically regenerated/retried.'
);

const migration = await readFile(path.join(root, 'supabase/migrations/20260913214500_phase_13_email_reliability.sql'), 'utf8');
assert.match(migration, /create extension if not exists pg_cron/i);
assert.match(migration, /create extension if not exists pg_net/i);
assert.match(migration, /vault\.create_secret/i);
assert.match(migration, /phase13_email_scheduler_token/i);
assert.match(migration, /verify_transactional_email_scheduler_token/i);
assert.match(migration, /list_due_transactional_email_ids/i);
assert.match(migration, /template_key <> 'admin_password_reset'/i);
assert.match(migration, /attempt_count < 5/i);
assert.match(migration, /transactional_email_health_snapshot/i);
assert.match(migration, /cron\.schedule/i);
assert.match(migration, /rcitcs-transactional-email-sweep/i);
assert.match(migration, /net\.http_post/i);
assert.match(migration, /x-rcitcs-scheduler-token/i);
assert.match(migration, /grant execute[\s\S]*to service_role/i);
assert.match(migration, /revoke execute[\s\S]*from public, anon, authenticated/i);
for (const sensitive of ['recipient_email', 'reply_to_email', 'sender_email', 'message', 'metadata']) {
  const snapshotStart = migration.indexOf('create or replace function public.transactional_email_health_snapshot');
  const snapshotEnd = migration.indexOf('revoke execute on function public.verify_transactional_email_scheduler_token');
  const snapshot = migration.slice(snapshotStart, snapshotEnd);
  assert.ok(!snapshot.includes(sensitive), `Aggregate monitoring must not expose ${sensitive}.`);
}

const dispatcher = await readFile(path.join(root, 'supabase/functions/transactional-email/index.ts'), 'utf8');
assert.match(dispatcher, /path === "\/sweep"/);
assert.match(dispatcher, /schedulerAuthorized/);
assert.match(dispatcher, /verify_transactional_email_scheduler_token/);
assert.match(dispatcher, /list_due_transactional_email_ids/);
assert.match(dispatcher, /path === "\/monitor"/);
assert.match(dispatcher, /transactional_email_health_snapshot/);
assert.match(dispatcher, /if \(!provider\.configured\)[\s\S]*EMAIL_PROVIDER_NOT_CONFIGURED/);
assert.match(dispatcher, /attempted: 0, succeeded: 0, failed: 0, skipped: 0/);
assert.match(dispatcher, /const SWEEP_LIMIT = 10/);
assert.ok(!dispatcher.includes('console.log'));
assert.ok(!dispatcher.includes('recipient_email: result'));
assert.ok(!dispatcher.includes('metadata: result'));

const resetDelivery = await readFile(path.join(root, 'supabase/functions/_shared/admin-password-reset-delivery.js'), 'utf8');
assert.match(resetDelivery, /retryAt: null/);

console.log('Phase 13.6 bounded retries, reset-link exclusion, cron sweep authorization and aggregate monitoring checks passed.');

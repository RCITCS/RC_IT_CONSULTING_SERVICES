import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EMAIL_IDENTITIES, EMAIL_TEMPLATE_KEYS, emailIdempotencyKey } from '../supabase/functions/_shared/email-contract.js';
import { buildApplicationEmailEnvelope, dispatchApplicationEmail } from '../supabase/functions/_shared/application-email-delivery.js';
import { EmailProviderError } from '../supabase/functions/_shared/resend-email-provider.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const applicationId = '11111111-1111-4111-8111-111111111111';
const emailLogId = '22222222-2222-4222-8222-222222222222';
const application = {
  id: applicationId,
  public_reference: 'RC-APP-26-ABCDEF123456',
  first_name: 'Alex',
  last_name: 'Candidate',
  email: 'candidate@example.com',
  job_title: 'Senior Data Engineer',
  job_code: 'RC-DATA-26-HYB-ABC123',
  submitted_at: '2026-09-13T21:20:00Z'
};

const acknowledgementQueue = {
  id: emailLogId,
  application_id: applicationId,
  provider: 'resend',
  template_key: EMAIL_TEMPLATE_KEYS.APPLICATION_ACKNOWLEDGEMENT,
  recipient_email: 'candidate@example.com',
  sender_email: EMAIL_IDENTITIES.career.address,
  reply_to_email: EMAIL_IDENTITIES.career.address,
  status: 'sending',
  idempotency_key: emailIdempotencyKey(
    EMAIL_TEMPLATE_KEYS.APPLICATION_ACKNOWLEDGEMENT,
    'application',
    application.public_reference
  ),
  attempt_count: 1
};

const acknowledgement = buildApplicationEmailEnvelope(acknowledgementQueue, application);
assert.equal(acknowledgement.to, 'candidate@example.com');
assert.equal(acknowledgement.from, EMAIL_IDENTITIES.career.from);
assert.equal(acknowledgement.replyTo, EMAIL_IDENTITIES.career.address);
assert.ok(acknowledgement.subject.includes(application.public_reference));
assert.ok(!acknowledgement.html.includes('candidate-documents'));

const internalQueue = {
  ...acknowledgementQueue,
  template_key: EMAIL_TEMPLATE_KEYS.INTERNAL_APPLICATION_ALERT,
  recipient_email: EMAIL_IDENTITIES.career.address,
  sender_email: EMAIL_IDENTITIES.noreply.address,
  reply_to_email: 'candidate@example.com',
  idempotency_key: emailIdempotencyKey(
    EMAIL_TEMPLATE_KEYS.INTERNAL_APPLICATION_ALERT,
    'application',
    applicationId
  )
};
const internal = buildApplicationEmailEnvelope(internalQueue, application);
assert.equal(internal.to, EMAIL_IDENTITIES.career.address);
assert.equal(internal.from, EMAIL_IDENTITIES.noreply.from);
assert.equal(internal.replyTo, 'candidate@example.com');
assert.ok(internal.text.includes('Candidate documents are intentionally not attached'));
assert.ok(internal.text.includes(`/applications/${applicationId}`));

assert.throws(() => buildApplicationEmailEnvelope({ ...internalQueue, recipient_email: 'attacker@example.com' }, application), /recipient/);
assert.throws(() => buildApplicationEmailEnvelope({ ...internalQueue, sender_email: 'contact@rcitcs.com' }, application), /sender/);
assert.throws(() => buildApplicationEmailEnvelope({ ...internalQueue, application_id: '33333333-3333-4333-8333-333333333333' }, application), /does not match/);
assert.throws(() => buildApplicationEmailEnvelope({ ...internalQueue, status: 'queued' }, application), /claimed/);

let sentEnvelope = null;
let sentState = null;
let failedState = null;
const delivered = await dispatchApplicationEmail({
  queue: acknowledgementQueue,
  application,
  provider: {
    async send(envelope) {
      sentEnvelope = envelope;
      return { provider: 'resend', providerMessageId: 'msg_application_123' };
    }
  },
  async markSent(input) { sentState = input; return true; },
  async markFailed(input) { failedState = input; return true; }
});
assert.equal(delivered.ok, true);
assert.equal(sentEnvelope.idempotencyKey, acknowledgementQueue.idempotency_key);
assert.equal(sentState.emailLogId, emailLogId);
assert.equal(sentState.providerMessageId, 'msg_application_123');
assert.equal(failedState, null);

failedState = null;
await assert.rejects(
  dispatchApplicationEmail({
    queue: acknowledgementQueue,
    application,
    provider: {
      async send() {
        throw new EmailProviderError('temporary provider failure', {
          code: 'rate_limit_exceeded',
          retryable: true,
          status: 429
        });
      }
    },
    async markSent() { return true; },
    async markFailed(input) { failedState = input; return true; }
  }),
  (error) => error instanceof EmailProviderError && error.code === 'rate_limit_exceeded'
);
assert.equal(failedState.errorCode, 'rate_limit_exceeded');
assert.equal(failedState.retryAt, null, 'Retry scheduling belongs to the dedicated Phase 13.6 reliability policy.');
assert.ok(!failedState.errorMessage.includes('temporary provider failure'));

const migration = await readFile(path.join(root, 'supabase/migrations/20260913212500_phase_13_application_email_queue.sql'), 'utf8');
assert.match(migration, /after insert on public\.applications/i);
assert.match(migration, /application_acknowledgement/i);
assert.match(migration, /internal_application_alert/i);
assert.match(migration, /career@rcitcs\.com/i);
assert.match(migration, /noreply@rcitcs\.com/i);
assert.match(migration, /revoke execute[\s\S]*from public, anon, authenticated/i);
assert.ok(!migration.includes('RESEND_API_KEY'));
assert.ok(!migration.includes('http_post'));
assert.ok(!migration.includes('candidate-documents'));

const candidateRuntime = await readFile(path.join(root, 'supabase/functions/candidate-applications/index.ts'), 'utf8');
assert.ok(!candidateRuntime.includes('RESEND_API_KEY'), 'Candidate intake must remain provider-independent.');
assert.ok(!candidateRuntime.includes('resend.com'), 'Candidate intake must not call the email provider directly.');

const dispatcher = await readFile(path.join(root, 'supabase/functions/transactional-email/index.ts'), 'utf8');
assert.match(dispatcher, /APPLICATION_ACKNOWLEDGEMENT/);
assert.match(dispatcher, /INTERNAL_APPLICATION_ALERT/);
assert.match(dispatcher, /dispatchApplicationEmail/);
assert.match(dispatcher, /applications\?id=eq\./);

console.log('Phase 13.4 application acknowledgement/internal alert queueing, template authority and provider isolation checks passed.');

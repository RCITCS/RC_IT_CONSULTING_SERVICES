import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const deliveryPath = path.join(root, 'supabase/functions/_shared/candidate-reply-email-delivery.js');
const retryPath = path.join(root, 'supabase/functions/_shared/email-retry-policy.js');
const providerPath = path.join(root, 'supabase/functions/_shared/resend-email-provider.js');
const [phase13Retry, core, idempotency, convergence, dispatcher, deliverySource, providerSource] = await Promise.all([
  read('supabase/migrations/20260914013000_phase_13_email_runtime_retry_hardening.sql'),
  read('supabase/migrations/20260915030000_phase_15_candidate_communication_core.sql'),
  read('supabase/migrations/20260915032000_phase_15_candidate_message_idempotency_hardening.sql'),
  read('supabase/migrations/20260915034000_phase_15_candidate_delivery_state_convergence.sql'),
  read('supabase/functions/transactional-email/index.ts'),
  read('supabase/functions/_shared/candidate-reply-email-delivery.js'),
  read('supabase/functions/_shared/resend-email-provider.js')
]);

// Candidate mail inherits the bounded Phase-13 retry queue because only password resets are excluded.
assert.match(phase13Retry, /template_key <> 'admin_password_reset'/);
assert.match(phase13Retry, /attempt_count < 5/);
assert.match(phase13Retry, /status = 'failed' and next_attempt_at is not null and next_attempt_at <= now\(\)/);
assert.match(phase13Retry, /status = 'sending'[\s\S]*last_attempt_at <= now\(\) - interval '15 minutes'/);
assert.match(phase13Retry, /when 1 then interval '5 minutes'/);
assert.match(phase13Retry, /when 2 then interval '15 minutes'/);
assert.match(phase13Retry, /when 3 then interval '60 minutes'/);
assert.match(phase13Retry, /when 4 then interval '360 minutes'/);
assert.match(phase13Retry, /'dead_letter', count\(\*\) filter \(where status = 'failed' and next_attempt_at is null\)/);

// One durable candidate message maps to one durable email log and both identifiers are unique.
assert.match(core, /create unique index if not exists candidate_messages_idempotency_key_uidx/);
assert.match(core, /create unique index if not exists candidate_messages_email_log_id_uidx/);
assert.match(core, /candidate_messages_email_log_id_fkey[\s\S]*references public\.email_logs\(id\)[\s\S]*on delete restrict/);
assert.match(idempotency, /hashtextextended\('rcitcs\/candidate_message\/' \|\| p_request_id::text, 0\)/);
assert.match(idempotency, /'IDEMPOTENCY_CONFLICT'/);
assert.match(idempotency, /'duplicate', true/);

// Candidate delivery-state duplication now mirrors all safe email-log terminal/intermediate states exactly.
for (const state of ['queued', 'sending', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'suppressed']) {
  assert.ok(convergence.includes(`'${state}'`), `Candidate delivery convergence missing ${state}.`);
}
assert.match(convergence, /when new\.status = any\(array\[/);
assert.match(convergence, /then new\.status/);
assert.match(convergence, /where email_log_id = new\.id/);
assert.match(convergence, /after update of status, provider_message_id, sent_at on public\.email_logs/);
assert.doesNotMatch(convergence, /error_message|error_code|recipient_email|body_text/);

// Dispatcher uses the persisted candidate message for every retry and does not reconstruct browser input.
assert.match(dispatcher, /loadCandidateReplyMessage/);
assert.match(dispatcher, /candidate_messages\?email_log_id=eq\./);
assert.match(dispatcher, /dispatchCandidateReplyEmail\(\{ queue, message, provider, markSent, markFailed \}\)/);
assert.match(deliverySource, /retryAtForEmailFailure/);
assert.match(deliverySource, /markFailed/);
assert.match(deliverySource, /markSent/);

const [{ buildCandidateReplyEnvelope, dispatchCandidateReplyEmail }, retry, providerModule] = await Promise.all([
  import(`${pathToFileURL(deliveryPath).href}?phase155delivery=${Date.now()}`),
  import(`${pathToFileURL(retryPath).href}?phase155retry=${Date.now()}`),
  import(`${pathToFileURL(providerPath).href}?phase155provider=${Date.now()}`)
]);
const { EmailProviderError, createResendEmailProvider } = providerModule;

const messageId = '11111111-1111-4111-8111-111111111111';
const applicationId = '22222222-2222-4222-8222-222222222222';
const emailLogId = '33333333-3333-4333-8333-333333333333';
const idempotencyKey = `rcitcs/candidate_admin_reply/candidate_message/${messageId}`;
const queue = {
  id: emailLogId,
  application_id: applicationId,
  provider: 'resend',
  template_key: 'candidate_admin_reply',
  recipient_email: 'candidate@example.com',
  sender_email: 'careers@rcitcs.com',
  reply_to_email: 'careers@rcitcs.com',
  subject: 'Application update',
  status: 'sending',
  idempotency_key: idempotencyKey,
  attempt_count: 1
};
const message = {
  id: messageId,
  application_id: applicationId,
  direction: 'outbound',
  channel: 'email',
  sender_email: 'careers@rcitcs.com',
  recipient_email: 'candidate@example.com',
  reply_to_email: 'careers@rcitcs.com',
  subject: 'Application update',
  body_text: 'Hello candidate',
  template_key: 'candidate_admin_reply',
  idempotency_key: idempotencyKey,
  email_log_id: emailLogId
};
const envelope = buildCandidateReplyEnvelope(queue, message);

// Retryable provider failures receive bounded retry scheduling, preserving the same log/message identity.
let failed = null;
const fixedNow = Date.parse('2026-09-15T03:00:00.000Z');
await assert.rejects(
  dispatchCandidateReplyEmail({
    queue,
    message,
    provider: {
      send: async () => { throw new EmailProviderError('temporary', { code: 'EMAIL_PROVIDER_HTTP_503', retryable: true, status: 503 }); }
    },
    markSent: async () => { throw new Error('markSent must not run on provider failure'); },
    markFailed: async (record) => { failed = record; return true; }
  }),
  /temporary/
);
assert.equal(failed.emailLogId, emailLogId);
assert.equal(failed.errorCode, 'EMAIL_PROVIDER_HTTP_503');
assert.ok(failed.retryAt, 'Retryable provider failure must schedule a retry.');
assert.equal(retry.retryDelayMinutesForAttempt(1), 5);
assert.equal(retry.retryDelayMinutesForAttempt(2), 15);
assert.equal(retry.retryDelayMinutesForAttempt(3), 60);
assert.equal(retry.retryDelayMinutesForAttempt(4), 360);
assert.equal(retry.retryDelayMinutesForAttempt(5), null);
assert.equal(
  retry.retryAtForEmailFailure({
    templateKey: 'candidate_admin_reply',
    attemptCount: 1,
    error: new EmailProviderError('temporary', { retryable: true }),
    now: () => fixedNow
  }),
  '2026-09-15T03:05:00.000Z'
);
assert.equal(
  retry.retryAtForEmailFailure({
    templateKey: 'candidate_admin_reply',
    attemptCount: 5,
    error: new EmailProviderError('temporary', { retryable: true }),
    now: () => fixedNow
  }),
  null
);

// Permanent provider rejection becomes terminal instead of looping forever.
let permanentFailure = null;
await assert.rejects(
  dispatchCandidateReplyEmail({
    queue,
    message,
    provider: {
      send: async () => { throw new EmailProviderError('permanent', { code: 'validation_error', retryable: false, status: 422 }); }
    },
    markSent: async () => false,
    markFailed: async (record) => { permanentFailure = record; return true; }
  }),
  /permanent/
);
assert.equal(permanentFailure.errorCode, 'validation_error');
assert.equal(permanentFailure.retryAt, null);

// Provider-level idempotency uses the same durable key on each attempt, protecting timeout/stale-claim retries.
let providerRequest = null;
const fakeProvider = createResendEmailProvider({
  apiKey: 'test-key-not-secret',
  fetchImpl: async (_url, init) => {
    providerRequest = init;
    return {
      ok: true,
      status: 200,
      async json() { return { id: 'resend-message-id' }; }
    };
  }
});
const providerResult = await fakeProvider.send(envelope);
assert.equal(providerResult.idempotencyKey, idempotencyKey);
assert.equal(providerRequest.headers['idempotency-key'], idempotencyKey);
assert.equal(providerRequest.headers['content-type'], 'application/json');
assert.ok(String(providerRequest.headers.authorization).startsWith('Bearer '));

// Candidate source never gets raw provider errors or secrets persisted/rendered as message content.
assert.doesNotMatch(convergence, /RESEND_API_KEY|api\.resend\.com/);
assert.doesNotMatch(deliverySource, /message\.metadata|queue\.error_message|queue\.error_code/);
assert.match(providerSource, /'idempotency-key': idempotencyKey/);

console.log('Phase 15.5 candidate delivery retry, dead-letter bounds, exact delivery-state convergence and provider idempotency passed.');
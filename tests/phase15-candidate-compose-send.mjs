import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const [applications, composer, dispatcher, adminIndex, migration, delivery] = await Promise.all([
  read('supabase/functions/admin-auth/applications.ts'),
  read('supabase/functions/admin-auth/candidate-communication.ts'),
  read('supabase/functions/transactional-email/index.ts'),
  read('supabase/functions/admin-auth/index.ts'),
  read('supabase/migrations/20260915030000_phase_15_candidate_communication_core.sql'),
  read('supabase/functions/_shared/candidate-reply-email-delivery.js')
]);

// The top-level admin runtime still rejects cross-site/non-navigation POSTs before the application handler runs.
assert.match(adminIndex, /request\.method === "POST" && !originOk\(request, url\)/);
assert.match(adminIndex, /browserNavigationPostOk/);

// Only the exact candidate-message endpoint accepts application mutations.
assert.match(applications, /\^\\\/applications\\\/\(\[0-9a-f-\]\{36\}\)\\\/message\$/);
assert.match(applications, /if \(request\.method === "POST"\)/);
assert.match(applications, /if \(!messageMatch \|\| !UUID\.test\(messageMatch\[1\]\)\)/);
assert.match(applications, /csrfOk\(authState, String\(form\.get\("csrf"\)/);
assert.match(applications, /intent === "preview" \|\| intent === "send"/);
assert.match(applications, /subject\.length <= CANDIDATE_MESSAGE_SUBJECT_MAX/);
assert.match(applications, /body\.length <= CANDIDATE_MESSAGE_BODY_MAX/);
assert.match(applications, /!\/[\\r\\n]\/\.test\(subject\)/);
assert.match(applications, /intent === "preview"/);
assert.match(applications, /preview: true/);

// Preview is read-only: queueing occurs only after the preview branch returns.
const previewBranch = applications.indexOf('if (intent === "preview")');
const queueCall = applications.indexOf('rpc("admin_queue_candidate_message"');
assert.ok(previewBranch >= 0 && queueCall > previewBranch, 'Message queueing must happen after the preview-only branch.');

// The server queue call contains no browser-selected recipient/sender/provider authority.
const queuePayloadStart = applications.indexOf('rpc("admin_queue_candidate_message"');
const queuePayloadEnd = applications.indexOf('});', queuePayloadStart);
const queuePayload = applications.slice(queuePayloadStart, queuePayloadEnd + 3);
for (const forbidden of ['recipient_email', 'sender_email', 'reply_to_email', 'provider', 'email_log_id']) {
  assert.ok(!queuePayload.includes(forbidden), `Admin queue payload must not accept ${forbidden}.`);
}
for (const required of ['p_admin_id', 'p_application_id', 'p_request_id', 'p_subject', 'p_body', 'p_ip_hash', 'p_user_agent']) {
  assert.ok(queuePayload.includes(required), `Admin queue payload missing ${required}.`);
}

// The composer shows recipient/sender but does not expose them as writable form fields.
assert.match(composer, /From<\/span><strong>careers@rcitcs\.com<\/strong>/);
assert.match(composer, /Preview message/);
assert.match(composer, /Send candidate email/);
assert.match(composer, /name="request_id" value="\$\{esc\(requestId\)\}"/);
assert.match(composer, /name="intent" value="preview"/);
assert.match(composer, /name="intent" value="send"/);
assert.doesNotMatch(composer, /name="(?:recipient_email|sender_email|reply_to_email|provider|email_log_id)"/);
assert.match(composer, /maxlength="\$\{CANDIDATE_MESSAGE_SUBJECT_MAX\}"/);
assert.match(composer, /maxlength="\$\{CANDIDATE_MESSAGE_BODY_MAX\}"/);
assert.match(composer, /\$\{esc\(subject\)\}/);
assert.match(composer, /\$\{esc\(body\)\}/);

// Durable persistence/queueing precedes provider dispatch and the same request UUID is the idempotency authority.
assert.match(migration, /p_request_id uuid/);
assert.match(migration, /v_idempotency_key := 'rcitcs\/candidate_admin_reply\/candidate_message\/' \|\| p_request_id::text/);
assert.match(migration, /insert into public\.candidate_messages/);
assert.match(applications, /dispatchQueuedEmail\(emailLogId\)/);
assert.ok(applications.indexOf('rpc("admin_queue_candidate_message"') < applications.indexOf('dispatchQueuedEmail(emailLogId)'), 'Provider dispatch must occur only after durable queueing.');
assert.match(applications, /terminalDelivery = result\.duplicate === true && \["sent", "delivered"\]/);

// Transactional-email reuses the Phase-13 provider/retry runtime for persisted candidate replies.
assert.match(dispatcher, /dispatchCandidateReplyEmail/);
assert.match(dispatcher, /loadCandidateReplyMessage/);
assert.match(dispatcher, /EMAIL_TEMPLATE_KEYS\.CANDIDATE_ADMIN_REPLY/);
assert.match(dispatcher, /candidateAdminReplies: true/);
assert.match(delivery, /retryAtForEmailFailure/);
assert.match(delivery, /createEmailEnvelope/);
assert.match(delivery, /htmlEscape\(body\)\.replace\(\/\\r\?\\n\/g, '<br>'\)/);
assert.doesNotMatch(applications, /api\.resend\.com|RESEND_API_KEY/);

// Exercise the pure delivery adapter with a persisted queue/message pair.
const deliveryUrl = `${pathToFileURL(path.join(root, 'supabase/functions/_shared/candidate-reply-email-delivery.js')).href}?phase15send=${Date.now()}`;
const { buildCandidateReplyEnvelope, dispatchCandidateReplyEmail } = await import(deliveryUrl);
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
  admin_id: '44444444-4444-4444-8444-444444444444',
  direction: 'outbound',
  channel: 'email',
  sender_email: 'careers@rcitcs.com',
  recipient_email: 'candidate@example.com',
  reply_to_email: 'careers@rcitcs.com',
  subject: 'Application update',
  body_text: 'Hello <candidate>\r\nThank you & regards.',
  template_key: 'candidate_admin_reply',
  idempotency_key: idempotencyKey,
  email_log_id: emailLogId,
  status: 'queued'
};
const envelope = buildCandidateReplyEnvelope(queue, message);
assert.equal(envelope.to, 'candidate@example.com');
assert.equal(envelope.senderEmail, 'careers@rcitcs.com');
assert.equal(envelope.replyTo, 'careers@rcitcs.com');
assert.equal(envelope.idempotencyKey, idempotencyKey);
assert.match(envelope.html, /Hello &lt;candidate&gt;<br>Thank you &amp; regards\./);
assert.doesNotMatch(envelope.html, /Hello <candidate>/);

let sentRecord = null;
let failedRecord = null;
const success = await dispatchCandidateReplyEmail({
  queue,
  message,
  provider: { send: async () => ({ provider: 'resend', providerMessageId: 'resend-message-123' }) },
  markSent: async (record) => { sentRecord = record; return true; },
  markFailed: async (record) => { failedRecord = record; return true; }
});
assert.equal(success.ok, true);
assert.deepEqual(sentRecord, { emailLogId, providerMessageId: 'resend-message-123' });
assert.equal(failedRecord, null);

console.log('Phase 15.3 preview-first compose, CSRF/server authority, durable queue-before-dispatch, idempotency and candidate email delivery passed.');

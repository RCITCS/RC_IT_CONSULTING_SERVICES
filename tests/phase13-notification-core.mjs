import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  EMAIL_IDENTITIES,
  EMAIL_TEMPLATE_KEYS,
  createEmailEnvelope,
  emailIdempotencyKey,
  fixedSenderForTemplate
} from '../supabase/functions/_shared/email-contract.js';
import {
  ADMIN_ORIGIN,
  applicationAcknowledgementTemplate,
  internalApplicationAlertTemplate,
  contactAcknowledgementTemplate,
  internalContactAlertTemplate,
  adminPasswordResetTemplate,
  adminPasswordChangedTemplate
} from '../supabase/functions/_shared/email-templates.js';
import {
  EmailProviderError,
  RESEND_EMAIL_ENDPOINT,
  createResendEmailProvider
} from '../supabase/functions/_shared/resend-email-provider.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error instanceof EmailProviderError && error.code === code);
}

const candidateAck = applicationAcknowledgementTemplate({
  applicationReference: 'RCAPP-2026-000001',
  firstName: '<Srihari>',
  jobTitle: 'Senior <Data> Engineer',
  candidateEmail: 'Candidate@Example.com'
});
assert.equal(candidateAck.from, EMAIL_IDENTITIES.career.from);
assert.equal(candidateAck.to, 'candidate@example.com');
assert.equal(candidateAck.replyTo, EMAIL_IDENTITIES.career.address);
assert.equal(candidateAck.templateKey, EMAIL_TEMPLATE_KEYS.APPLICATION_ACKNOWLEDGEMENT);
assert.ok(candidateAck.html.includes('&lt;Srihari&gt;'));
assert.ok(candidateAck.html.includes('Senior &lt;Data&gt; Engineer'));
assert.ok(!candidateAck.html.includes('<Srihari>'));
assert.ok(!candidateAck.html.includes('SUPABASE_SECRET'));
assert.ok(!candidateAck.html.toLowerCase().includes('candidate-documents'));

const internalApplication = internalApplicationAlertTemplate({
  applicationId: '11111111-1111-4111-8111-111111111111',
  applicationReference: 'RCAPP-2026-000001',
  candidateName: 'Candidate <script>alert(1)</script>',
  candidateEmail: 'candidate@example.com',
  jobTitle: 'Senior Data Engineer',
  jobCode: 'RC-DATA-26-HYB-DF2DBE',
  submittedAt: '2026-09-13T20:00:00Z',
  adminUrl: `${ADMIN_ORIGIN}/applications/11111111-1111-4111-8111-111111111111`
});
assert.equal(internalApplication.from, EMAIL_IDENTITIES.noreply.from);
assert.equal(internalApplication.to, EMAIL_IDENTITIES.career.address);
assert.equal(internalApplication.replyTo, 'candidate@example.com');
assert.ok(internalApplication.html.includes('&lt;script&gt;'));
assert.ok(!internalApplication.html.includes('<script>alert(1)</script>'));
assert.ok(internalApplication.text.includes('Candidate documents are intentionally not attached'));

const contactAck = contactAcknowledgementTemplate({
  enquiryId: '22222222-2222-4222-8222-222222222222',
  firstName: 'Alex',
  visitorEmail: 'visitor@example.com',
  topic: 'Cloud & Infrastructure'
});
assert.equal(contactAck.from, EMAIL_IDENTITIES.contact.from);
assert.equal(contactAck.replyTo, EMAIL_IDENTITIES.contact.address);
assert.equal(contactAck.to, 'visitor@example.com');

const contactAlert = internalContactAlertTemplate({
  enquiryId: '22222222-2222-4222-8222-222222222222',
  visitorName: 'Alex Example',
  visitorEmail: 'visitor@example.com',
  company: 'Example Ltd',
  phone: '+44 20 7946 0000',
  topic: 'Security',
  message: '<img src=x onerror=alert(1)>',
  receivedAt: '2026-09-13T20:00:00Z'
});
assert.equal(contactAlert.from, EMAIL_IDENTITIES.noreply.from);
assert.equal(contactAlert.to, EMAIL_IDENTITIES.contact.address);
assert.equal(contactAlert.replyTo, 'visitor@example.com');
assert.ok(contactAlert.html.includes('&lt;img'));
assert.ok(!contactAlert.html.includes('<img src=x'));

const reset = adminPasswordResetTemplate({
  resetRequestId: '33333333-3333-4333-8333-333333333333',
  adminEmail: 'rcitcservices@gmail.com',
  resetUrl: `${ADMIN_ORIGIN}/reset-password?token=opaque-reset-token`,
  expiresMinutes: 10
});
assert.equal(reset.from, EMAIL_IDENTITIES.noreply.from);
assert.equal(reset.replyTo, '');
assert.ok(reset.text.includes('single-use link'));
assert.throws(() => adminPasswordResetTemplate({
  resetRequestId: '33333333-3333-4333-8333-333333333333',
  adminEmail: 'rcitcservices@gmail.com',
  resetUrl: 'https://example.com/reset-password?token=bad'
}), /production admin reset route/);

const changed = adminPasswordChangedTemplate({
  eventId: 'password-change-1',
  adminEmail: 'rcitcservices@gmail.com',
  changedAt: '13 September 2026 20:00 UTC'
});
assert.equal(changed.from, EMAIL_IDENTITIES.noreply.from);
assert.ok(changed.subject.includes('password changed'));

assert.equal(
  emailIdempotencyKey('application_acknowledgement', 'application', 'ABC-123'),
  'rcitcs/application_acknowledgement/application/abc-123'
);
assert.equal(fixedSenderForTemplate(EMAIL_TEMPLATE_KEYS.INTERNAL_CONTACT_ALERT), EMAIL_IDENTITIES.noreply);
assert.throws(() => fixedSenderForTemplate('unknown_template'), /Unsupported email template/);
assert.throws(() => createEmailEnvelope({
  templateKey: EMAIL_TEMPLATE_KEYS.CONTACT_ACKNOWLEDGEMENT,
  entityType: 'contact_enquiry',
  entityId: '1',
  to: 'bad-email',
  subject: 'Hello',
  html: '<p>Hello</p>',
  text: 'Hello'
}), /valid email/);

const unconfigured = createResendEmailProvider({ apiKey: '' });
assert.equal(unconfigured.configured, false);
await rejectsCode(unconfigured.send(candidateAck), 'EMAIL_PROVIDER_NOT_CONFIGURED');

let capturedRequest = null;
const provider = createResendEmailProvider({
  apiKey: 'test-server-only-key',
  fetchImpl: async (url, init) => {
    capturedRequest = { url, init };
    return new Response(JSON.stringify({ id: 'resend-message-123' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
});
assert.equal(provider.configured, true);
const sent = await provider.send(internalApplication);
assert.equal(sent.provider, 'resend');
assert.equal(sent.providerMessageId, 'resend-message-123');
assert.equal(capturedRequest.url, RESEND_EMAIL_ENDPOINT);
assert.equal(capturedRequest.init.method, 'POST');
assert.equal(capturedRequest.init.headers.authorization, 'Bearer test-server-only-key');
assert.equal(capturedRequest.init.headers['idempotency-key'], internalApplication.idempotencyKey);
const providerPayload = JSON.parse(capturedRequest.init.body);
assert.deepEqual(providerPayload.to, [EMAIL_IDENTITIES.career.address]);
assert.equal(providerPayload.reply_to, 'candidate@example.com');
assert.equal(providerPayload.from, EMAIL_IDENTITIES.noreply.from);
assert.equal(Object.hasOwn(providerPayload, 'attachments'), false);

const rateLimited = createResendEmailProvider({
  apiKey: 'test-key',
  fetchImpl: async () => new Response(JSON.stringify({ name: 'rate_limit_exceeded' }), { status: 429 })
});
await assert.rejects(rateLimited.send(candidateAck), (error) =>
  error instanceof EmailProviderError
  && error.code === 'rate_limit_exceeded'
  && error.retryable === true
  && error.status === 429
);

const concurrentConflict = createResendEmailProvider({
  apiKey: 'test-key',
  fetchImpl: async () => new Response(JSON.stringify({ name: 'concurrent_idempotent_requests' }), { status: 409 })
});
await assert.rejects(concurrentConflict.send(candidateAck), (error) =>
  error instanceof EmailProviderError
  && error.code === 'concurrent_idempotent_requests'
  && error.retryable === true
  && error.status === 409
);

const permanentIdempotencyConflict = createResendEmailProvider({
  apiKey: 'test-key',
  fetchImpl: async () => new Response(JSON.stringify({ name: 'invalid_idempotent_request' }), { status: 409 })
});
await assert.rejects(permanentIdempotencyConflict.send(candidateAck), (error) =>
  error instanceof EmailProviderError
  && error.code === 'invalid_idempotent_request'
  && error.retryable === false
  && error.status === 409
);

const invalidRequest = createResendEmailProvider({
  apiKey: 'test-key',
  fetchImpl: async () => new Response(JSON.stringify({ name: 'validation_error' }), { status: 422 })
});
await assert.rejects(invalidRequest.send(candidateAck), (error) =>
  error instanceof EmailProviderError
  && error.code === 'validation_error'
  && error.retryable === false
  && error.status === 422
);

const migration = await readFile(path.join(root, 'supabase/migrations/20260913205000_phase_13_notification_core.sql'), 'utf8');
assert.match(migration, /add column if not exists idempotency_key text/i);
assert.match(migration, /create unique index if not exists email_logs_idempotency_key_uidx/i);
assert.match(migration, /on conflict \(idempotency_key\) do nothing/i);
assert.match(migration, /grant execute on function public\.enqueue_transactional_email[\s\S]*to service_role/i);
assert.match(migration, /revoke execute on function public\.enqueue_transactional_email[\s\S]*from public, anon, authenticated/i);
assert.ok(!migration.includes('RESEND_API_KEY='));
assert.ok(!migration.includes('re_'));

console.log('Phase 13 notification core contract, templates, provider adapter, idempotency and security checks passed.');

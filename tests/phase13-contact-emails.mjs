import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDatabaseSubmissionRepository } from '../src/backend/repositories/submission-repository.js';
import { EMAIL_IDENTITIES, EMAIL_TEMPLATE_KEYS, emailIdempotencyKey } from '../supabase/functions/_shared/email-contract.js';
import { buildContactEmailEnvelope, dispatchContactEmail } from '../supabase/functions/_shared/contact-email-delivery.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const enquiryId = '11111111-1111-4111-8111-111111111111';
const emailLogId = '22222222-2222-4222-8222-222222222222';

let inserted = null;
const repository = createDatabaseSubmissionRepository({
  configured: true,
  async insertRow(table, row) {
    inserted = { table, row };
    return { id: row.id };
  }
});

await repository.create({
  id: enquiryId,
  type: 'contact',
  receivedAt: '2026-09-13T21:30:00.000Z',
  requestId: 'request-contact-1',
  payload: {
    firstName: 'Alex',
    lastName: 'Visitor',
    company: 'Example Ltd',
    jobTitle: 'CTO',
    email: 'VISITOR@EXAMPLE.COM',
    phone: '+44 20 7946 0000',
    consultationTopic: 'Cloud & Infrastructure',
    message: 'Please contact us about a migration project.',
    intent: 'Architecture consultation',
    privacyConsent: true
  }
});
assert.equal(inserted.table, 'contact_enquiries');
assert.deepEqual(inserted.row, {
  id: enquiryId,
  name: 'Alex Visitor',
  email: 'visitor@example.com',
  phone: '+44 20 7946 0000',
  company: 'Example Ltd',
  service: 'Cloud & Infrastructure',
  subject: 'Architecture consultation',
  message: 'Please contact us about a migration project.',
  consent: true,
  consent_at: '2026-09-13T21:30:00.000Z',
  status: 'new',
  source: 'contact',
  metadata: {
    request_id: 'request-contact-1',
    received_at: '2026-09-13T21:30:00.000Z',
    submission_type: 'contact',
    job_title: 'CTO',
    intent: 'Architecture consultation'
  }
});
for (const obsolete of ['first_name', 'last_name', 'job_title', 'topic', 'privacy_consent_at', 'source_type', 'request_id', 'received_at', 'details']) {
  assert.equal(Object.hasOwn(inserted.row, obsolete), false, `Obsolete production column must not be inserted: ${obsolete}`);
}

await repository.create({
  id: '33333333-3333-4333-8333-333333333333',
  type: 'demo',
  receivedAt: '2026-09-13T21:31:00.000Z',
  requestId: 'request-demo-1',
  payload: { name: 'Demo User', company: 'Example', businessEmail: 'demo@example.com', phone: '', product: 'Data Platform', notes: '' }
});
assert.equal(inserted.row.subject, 'Demo request');
assert.equal(inserted.row.message, 'Demo request for Data Platform');
assert.equal(inserted.row.source, 'demo');

await repository.create({
  id: '44444444-4444-4444-8444-444444444444',
  type: 'consultation',
  receivedAt: '2026-09-13T21:32:00.000Z',
  requestId: 'request-consult-1',
  payload: { name: 'Consult User', company: 'Example', businessEmail: 'consult@example.com', phone: '', topic: 'Cybersecurity', brief: '' }
});
assert.equal(inserted.row.message, 'Consultation request about Cybersecurity');
assert.equal(inserted.row.source, 'consultation');

const enquiry = {
  id: enquiryId,
  name: 'Alex Visitor',
  email: 'visitor@example.com',
  phone: '+44 20 7946 0000',
  company: 'Example Ltd',
  service: 'Cloud & Infrastructure',
  subject: 'Architecture consultation',
  message: '<script>alert(1)</script> Need help.',
  created_at: '2026-09-13T21:30:00Z'
};
const acknowledgementQueue = {
  id: emailLogId,
  contact_enquiry_id: enquiryId,
  provider: 'resend',
  template_key: EMAIL_TEMPLATE_KEYS.CONTACT_ACKNOWLEDGEMENT,
  recipient_email: 'visitor@example.com',
  sender_email: EMAIL_IDENTITIES.contact.address,
  reply_to_email: EMAIL_IDENTITIES.contact.address,
  status: 'sending',
  idempotency_key: emailIdempotencyKey(EMAIL_TEMPLATE_KEYS.CONTACT_ACKNOWLEDGEMENT, 'contact_enquiry', enquiryId),
  attempt_count: 1
};
const ack = buildContactEmailEnvelope(acknowledgementQueue, enquiry);
assert.equal(ack.to, 'visitor@example.com');
assert.equal(ack.from, EMAIL_IDENTITIES.contact.from);
assert.equal(ack.replyTo, EMAIL_IDENTITIES.contact.address);

const internalQueue = {
  ...acknowledgementQueue,
  template_key: EMAIL_TEMPLATE_KEYS.INTERNAL_CONTACT_ALERT,
  recipient_email: EMAIL_IDENTITIES.contact.address,
  sender_email: EMAIL_IDENTITIES.noreply.address,
  reply_to_email: 'visitor@example.com',
  idempotency_key: emailIdempotencyKey(EMAIL_TEMPLATE_KEYS.INTERNAL_CONTACT_ALERT, 'contact_enquiry', enquiryId)
};
const internal = buildContactEmailEnvelope(internalQueue, enquiry);
assert.equal(internal.to, EMAIL_IDENTITIES.contact.address);
assert.equal(internal.replyTo, 'visitor@example.com');
assert.ok(internal.html.includes('&lt;script&gt;'));
assert.ok(!internal.html.includes('<script>alert(1)</script>'));

assert.throws(() => buildContactEmailEnvelope({ ...internalQueue, recipient_email: 'attacker@example.com' }, enquiry), /recipient/);
assert.throws(() => buildContactEmailEnvelope({ ...internalQueue, sender_email: 'career@rcitcs.com' }, enquiry), /sender/);
assert.throws(() => buildContactEmailEnvelope({ ...internalQueue, status: 'queued' }, enquiry), /claimed/);

let sentState = null;
const result = await dispatchContactEmail({
  queue: acknowledgementQueue,
  enquiry,
  provider: { async send() { return { provider: 'resend', providerMessageId: 'msg_contact_123' }; } },
  async markSent(input) { sentState = input; return true; },
  async markFailed() { return true; }
});
assert.equal(result.ok, true);
assert.equal(sentState.providerMessageId, 'msg_contact_123');

const migration = await readFile(path.join(root, 'supabase/migrations/20260913213500_phase_13_contact_email_queue.sql'), 'utf8');
assert.match(migration, /after insert on public\.contact_enquiries/i);
assert.match(migration, /contact_acknowledgement/i);
assert.match(migration, /internal_contact_alert/i);
assert.match(migration, /contact@rcitcs\.com/i);
assert.match(migration, /noreply@rcitcs\.com/i);
assert.ok(!migration.includes('RESEND_API_KEY'));
assert.ok(!migration.includes('http_post'));

const dispatcher = await readFile(path.join(root, 'supabase/functions/transactional-email/index.ts'), 'utf8');
assert.match(dispatcher, /CONTACT_ACKNOWLEDGEMENT/);
assert.match(dispatcher, /INTERNAL_CONTACT_ALERT/);
assert.match(dispatcher, /dispatchContactEmail/);
assert.match(dispatcher, /contact_enquiries\?id=eq\./);

console.log('Phase 13.5 production-schema persistence, contact acknowledgement/internal alert, escaping and provider-isolation checks passed.');

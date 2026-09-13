import {
  EMAIL_TEMPLATE_KEYS,
  normalizeEmail
} from './email-contract.js';
import {
  ADMIN_ORIGIN,
  contactAcknowledgementTemplate,
  internalContactAlertTemplate
} from './email-templates.js';
import { EmailProviderError } from './resend-email-provider.js';

const CONTACT_TEMPLATES = new Set([
  EMAIL_TEMPLATE_KEYS.CONTACT_ACKNOWLEDGEMENT,
  EMAIL_TEMPLATE_KEYS.INTERNAL_CONTACT_ALERT
]);

function text(value) {
  return String(value ?? '').trim();
}

function uuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value));
}

function firstName(value) {
  return text(value).split(/\s+/).filter(Boolean)[0] || 'there';
}

export function buildContactEmailEnvelope(queue, enquiry) {
  if (!queue || typeof queue !== 'object') throw new TypeError('Contact email queue row is required.');
  if (!enquiry || typeof enquiry !== 'object') throw new TypeError('Persisted contact enquiry is required.');
  const enquiryId = text(enquiry.id);
  if (!uuid(enquiryId)) throw new TypeError('Persisted contact enquiry id is invalid.');
  if (text(queue.status) !== 'sending') throw new TypeError('Contact email must be atomically claimed before dispatch.');
  if (text(queue.provider) !== 'resend') throw new TypeError('Contact email provider is not approved.');
  if (!CONTACT_TEMPLATES.has(text(queue.template_key))) throw new TypeError('Contact email template is not supported.');
  if (text(queue.contact_enquiry_id) !== enquiryId) throw new TypeError('Contact email queue does not match the persisted enquiry.');

  const visitorEmail = normalizeEmail(enquiry.email);
  const visitorName = text(enquiry.name);
  const topic = text(enquiry.service) || text(enquiry.subject) || 'General enquiry';
  if (!visitorEmail || !visitorName || !text(enquiry.message)) throw new TypeError('Persisted contact enquiry email data is incomplete.');

  const envelope = text(queue.template_key) === EMAIL_TEMPLATE_KEYS.CONTACT_ACKNOWLEDGEMENT
    ? contactAcknowledgementTemplate({
        enquiryId,
        firstName: firstName(visitorName),
        visitorEmail,
        topic
      })
    : internalContactAlertTemplate({
        enquiryId,
        visitorName,
        visitorEmail,
        company: text(enquiry.company),
        phone: text(enquiry.phone),
        topic,
        message: text(enquiry.message),
        receivedAt: text(enquiry.created_at),
        adminUrl: `${ADMIN_ORIGIN}/`
      });

  if (normalizeEmail(queue.recipient_email) !== envelope.to) throw new TypeError('Contact email recipient does not match the approved template.');
  if (normalizeEmail(queue.sender_email) !== envelope.senderEmail) throw new TypeError('Contact email sender does not match the approved template.');
  if (normalizeEmail(queue.reply_to_email || '') !== normalizeEmail(envelope.replyTo || '')) throw new TypeError('Contact email reply-to does not match the approved template.');
  if (text(queue.idempotency_key) !== envelope.idempotencyKey) throw new TypeError('Contact email idempotency key does not match the approved template.');
  return envelope;
}

export async function dispatchContactEmail({ queue, enquiry, provider, markSent, markFailed } = {}) {
  if (!provider || typeof provider.send !== 'function') throw new TypeError('Email provider is required.');
  if (typeof markSent !== 'function' || typeof markFailed !== 'function') throw new TypeError('Email persistence callbacks are required.');
  const envelope = buildContactEmailEnvelope(queue, enquiry);
  const emailLogId = text(queue.id);
  if (!uuid(emailLogId)) throw new TypeError('Contact email log id is invalid.');

  try {
    const delivered = await provider.send(envelope);
    const providerMessageId = text(delivered?.providerMessageId);
    if (!providerMessageId) throw new EmailProviderError('Email provider returned no message identifier.', {
      code: 'EMAIL_PROVIDER_INVALID_RESPONSE',
      retryable: true
    });
    if (!(await markSent({ emailLogId, providerMessageId }))) throw new Error('Email sent-state persistence failed.');
    return Object.freeze({
      ok: true,
      emailLogId,
      provider: text(delivered?.provider) || 'resend',
      providerMessageId
    });
  } catch (error) {
    const code = error instanceof EmailProviderError ? text(error.code) || 'EMAIL_DELIVERY_FAILED' : 'EMAIL_DELIVERY_FAILED';
    await markFailed({
      emailLogId,
      errorCode: code,
      errorMessage: 'Transactional contact email delivery failed.',
      retryAt: null
    });
    throw error;
  }
}

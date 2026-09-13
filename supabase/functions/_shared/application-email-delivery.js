import {
  EMAIL_TEMPLATE_KEYS,
  normalizeEmail
} from './email-contract.js';
import {
  ADMIN_ORIGIN,
  applicationAcknowledgementTemplate,
  internalApplicationAlertTemplate
} from './email-templates.js';
import { EmailProviderError } from './resend-email-provider.js';

const APPLICATION_TEMPLATES = new Set([
  EMAIL_TEMPLATE_KEYS.APPLICATION_ACKNOWLEDGEMENT,
  EMAIL_TEMPLATE_KEYS.INTERNAL_APPLICATION_ALERT
]);

function text(value) {
  return String(value ?? '').trim();
}

function uuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value));
}

export function buildApplicationEmailEnvelope(queue, application) {
  if (!queue || typeof queue !== 'object') throw new TypeError('Application email queue row is required.');
  if (!application || typeof application !== 'object') throw new TypeError('Persisted application is required.');
  const applicationId = text(application.id);
  if (!uuid(applicationId)) throw new TypeError('Persisted application id is invalid.');
  if (text(queue.status) !== 'sending') throw new TypeError('Application email must be atomically claimed before dispatch.');
  if (text(queue.provider) !== 'resend') throw new TypeError('Application email provider is not approved.');
  if (!APPLICATION_TEMPLATES.has(text(queue.template_key))) throw new TypeError('Application email template is not supported.');
  if (text(queue.application_id) !== applicationId) throw new TypeError('Application email queue does not match the persisted application.');

  const reference = text(application.public_reference);
  const firstName = text(application.first_name);
  const lastName = text(application.last_name);
  const candidateEmail = normalizeEmail(application.email);
  const jobTitle = text(application.job_title);
  const jobCode = text(application.job_code);
  const submittedAt = text(application.submitted_at);
  if (!reference || !firstName || !candidateEmail || !jobTitle) throw new TypeError('Persisted application email data is incomplete.');

  const envelope = text(queue.template_key) === EMAIL_TEMPLATE_KEYS.APPLICATION_ACKNOWLEDGEMENT
    ? applicationAcknowledgementTemplate({
        applicationReference: reference,
        firstName,
        jobTitle,
        candidateEmail
      })
    : internalApplicationAlertTemplate({
        applicationId,
        applicationReference: reference,
        candidateName: `${firstName} ${lastName}`.trim(),
        candidateEmail,
        jobTitle,
        jobCode,
        submittedAt,
        adminUrl: `${ADMIN_ORIGIN}/applications/${encodeURIComponent(applicationId)}`
      });

  if (normalizeEmail(queue.recipient_email) !== envelope.to) throw new TypeError('Application email recipient does not match the approved template.');
  if (normalizeEmail(queue.sender_email) !== envelope.senderEmail) throw new TypeError('Application email sender does not match the approved template.');
  if (normalizeEmail(queue.reply_to_email || '') !== normalizeEmail(envelope.replyTo || '')) throw new TypeError('Application email reply-to does not match the approved template.');
  if (text(queue.idempotency_key) !== envelope.idempotencyKey) throw new TypeError('Application email idempotency key does not match the approved template.');
  return envelope;
}

export async function dispatchApplicationEmail({ queue, application, provider, markSent, markFailed } = {}) {
  if (!provider || typeof provider.send !== 'function') throw new TypeError('Email provider is required.');
  if (typeof markSent !== 'function' || typeof markFailed !== 'function') throw new TypeError('Email persistence callbacks are required.');
  const envelope = buildApplicationEmailEnvelope(queue, application);
  const emailLogId = text(queue.id);
  if (!uuid(emailLogId)) throw new TypeError('Application email log id is invalid.');

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
      errorMessage: 'Transactional application email delivery failed.',
      retryAt: null
    });
    throw error;
  }
}

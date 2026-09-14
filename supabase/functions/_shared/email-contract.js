export const EMAIL_TEMPLATE_KEYS = Object.freeze({
  CONTACT_ACKNOWLEDGEMENT: 'contact_acknowledgement',
  INTERNAL_CONTACT_ALERT: 'internal_contact_alert',
  CONTACT_ADMIN_REPLY: 'contact_admin_reply',
  APPLICATION_ACKNOWLEDGEMENT: 'application_acknowledgement',
  INTERNAL_APPLICATION_ALERT: 'internal_application_alert',
  ADMIN_PASSWORD_RESET: 'admin_password_reset',
  ADMIN_PASSWORD_CHANGED: 'admin_password_changed'
});

export const EMAIL_IDENTITIES = Object.freeze({
  contact: Object.freeze({
    address: 'contact@rcitcs.com',
    from: 'RC IT Services <contact@rcitcs.com>'
  }),
  career: Object.freeze({
    address: 'career@rcitcs.com',
    from: 'RC IT Services Careers <career@rcitcs.com>'
  }),
  noreply: Object.freeze({
    address: 'noreply@rcitcs.com',
    from: 'RC IT Services <noreply@rcitcs.com>'
  })
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function validEmail(value) {
  const normalized = normalizeEmail(value);
  return normalized.length > 2 && normalized.length <= 254 && EMAIL.test(normalized);
}

export function requireEmail(value, field = 'email') {
  const normalized = normalizeEmail(value);
  if (!validEmail(normalized)) throw new TypeError(`${field} must be a valid email address.`);
  return normalized;
}

export function requireIdempotencyKey(value) {
  const normalized = String(value ?? '').trim();
  if (!IDEMPOTENCY_KEY.test(normalized)) throw new TypeError('idempotencyKey must be 1-256 safe characters.');
  return normalized;
}

export function emailIdempotencyKey(templateKey, entityType, entityId) {
  const template = String(templateKey ?? '').trim();
  const type = String(entityType ?? '').trim().toLowerCase();
  const id = String(entityId ?? '').trim().toLowerCase();
  return requireIdempotencyKey(`rcitcs/${template}/${type}/${id}`);
}

export function fixedSenderForTemplate(templateKey) {
  switch (templateKey) {
    case EMAIL_TEMPLATE_KEYS.CONTACT_ACKNOWLEDGEMENT:
    case EMAIL_TEMPLATE_KEYS.CONTACT_ADMIN_REPLY:
      return EMAIL_IDENTITIES.contact;
    case EMAIL_TEMPLATE_KEYS.APPLICATION_ACKNOWLEDGEMENT:
      return EMAIL_IDENTITIES.career;
    case EMAIL_TEMPLATE_KEYS.INTERNAL_CONTACT_ALERT:
    case EMAIL_TEMPLATE_KEYS.INTERNAL_APPLICATION_ALERT:
    case EMAIL_TEMPLATE_KEYS.ADMIN_PASSWORD_RESET:
    case EMAIL_TEMPLATE_KEYS.ADMIN_PASSWORD_CHANGED:
      return EMAIL_IDENTITIES.noreply;
    default:
      throw new TypeError(`Unsupported email template: ${String(templateKey ?? '')}`);
  }
}

export function createEmailEnvelope({
  templateKey,
  entityType,
  entityId,
  to,
  replyTo = '',
  subject,
  html,
  text
} = {}) {
  const sender = fixedSenderForTemplate(templateKey);
  const recipient = requireEmail(to, 'to');
  const normalizedReplyTo = replyTo ? requireEmail(replyTo, 'replyTo') : '';
  const cleanSubject = String(subject ?? '').replace(/[\r\n]+/g, ' ').trim();
  const cleanHtml = String(html ?? '').trim();
  const cleanText = String(text ?? '').trim();
  if (!cleanSubject || cleanSubject.length > 998) throw new TypeError('subject is required and must be within email header limits.');
  if (!cleanHtml || !cleanText) throw new TypeError('Both HTML and text email bodies are required.');

  return Object.freeze({
    templateKey,
    entityType: String(entityType ?? '').trim(),
    entityId: String(entityId ?? '').trim(),
    idempotencyKey: emailIdempotencyKey(templateKey, entityType, entityId),
    from: sender.from,
    senderEmail: sender.address,
    to: recipient,
    replyTo: normalizedReplyTo,
    subject: cleanSubject,
    html: cleanHtml,
    text: cleanText
  });
}

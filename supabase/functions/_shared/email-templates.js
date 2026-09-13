import {
  EMAIL_IDENTITIES,
  EMAIL_TEMPLATE_KEYS,
  createEmailEnvelope,
  requireEmail
} from './email-contract.js';

const PUBLIC_ORIGIN = 'https://rcitcs.com';
const ADMIN_ORIGIN = 'https://admin.rcitcs.com';

function text(value) {
  return String(value ?? '').trim();
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function subjectText(value) {
  return text(value).replace(/[\r\n]+/g, ' ');
}

function brandedHtml({ preheader, heading, bodyHtml, action = null, footer = '' }) {
  const actionHtml = action
    ? `<p style="margin:28px 0"><a href="${htmlEscape(action.href)}" style="display:inline-block;background:#172554;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600">${htmlEscape(action.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#172033"><div style="display:none;max-height:0;overflow:hidden">${htmlEscape(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fa"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #e4e7ec;border-radius:10px"><tr><td style="padding:28px 32px 16px;border-bottom:1px solid #eef0f3"><div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#667085;font-weight:700">RC IT Services</div><h1 style="font-size:24px;line-height:1.25;margin:10px 0 0;color:#101828">${htmlEscape(heading)}</h1></td></tr><tr><td style="padding:28px 32px;font-size:15px;line-height:1.65">${bodyHtml}${actionHtml}</td></tr><tr><td style="padding:18px 32px;border-top:1px solid #eef0f3;color:#667085;font-size:12px;line-height:1.5">${footer || `RC IT Services · <a href="${PUBLIC_ORIGIN}" style="color:#475467">rcitcs.com</a>`}</td></tr></table></td></tr></table></body></html>`;
}

function labelledRows(rows = []) {
  return rows
    .filter(([, value]) => text(value))
    .map(([label, value]) => `<tr><td style="padding:5px 14px 5px 0;color:#667085;vertical-align:top;white-space:nowrap">${htmlEscape(label)}</td><td style="padding:5px 0;color:#101828;vertical-align:top">${htmlEscape(value)}</td></tr>`)
    .join('');
}

export function applicationAcknowledgementTemplate({ applicationReference, firstName, jobTitle, candidateEmail } = {}) {
  const reference = text(applicationReference);
  const name = text(firstName) || 'Candidate';
  const role = text(jobTitle) || 'the advertised role';
  if (!reference) throw new TypeError('applicationReference is required.');
  const to = requireEmail(candidateEmail, 'candidateEmail');
  const subject = `Application received — ${subjectText(role)} — ${subjectText(reference)}`;
  const body = `Hi ${htmlEscape(name)},<br><br>Thank you for applying for <strong>${htmlEscape(role)}</strong> at RC IT Services. Your application has been received successfully.<br><br>Your application reference is <strong>${htmlEscape(reference)}</strong>. Please keep this reference for your records.<br><br>Our recruitment team will review the information you submitted. If the application progresses, the team will contact you using the details supplied in your application.`;
  const plain = `Hi ${name},\n\nThank you for applying for ${role} at RC IT Services. Your application has been received successfully.\n\nApplication reference: ${reference}\n\nOur recruitment team will review your application. If it progresses, the team will contact you using the details supplied in your application.\n\nRC IT Services`;
  return createEmailEnvelope({
    templateKey: EMAIL_TEMPLATE_KEYS.APPLICATION_ACKNOWLEDGEMENT,
    entityType: 'application',
    entityId: reference,
    to,
    replyTo: EMAIL_IDENTITIES.career.address,
    subject,
    html: brandedHtml({ preheader: `Application ${reference} received`, heading: 'We received your application', bodyHtml: `<p style="margin:0">${body}</p>` }),
    text: plain
  });
}

export function internalApplicationAlertTemplate({ applicationId, applicationReference, candidateName, candidateEmail, jobTitle, jobCode, submittedAt, adminUrl } = {}) {
  const id = text(applicationId);
  const reference = text(applicationReference);
  if (!id || !reference) throw new TypeError('applicationId and applicationReference are required.');
  const candidate = text(candidateName) || 'Candidate';
  const email = requireEmail(candidateEmail, 'candidateEmail');
  const role = text(jobTitle) || 'Published vacancy';
  const safeAdminUrl = text(adminUrl) || `${ADMIN_ORIGIN}/applications`;
  const subject = `New application — ${subjectText(role)} — ${subjectText(reference)}`;
  const rows = labelledRows([
    ['Reference', reference],
    ['Candidate', candidate],
    ['Email', email],
    ['Role', role],
    ['Job ID', text(jobCode)],
    ['Submitted', text(submittedAt)]
  ]);
  const plain = `New candidate application\n\nReference: ${reference}\nCandidate: ${candidate}\nEmail: ${email}\nRole: ${role}${jobCode ? `\nJob ID: ${text(jobCode)}` : ''}${submittedAt ? `\nSubmitted: ${text(submittedAt)}` : ''}\n\nReview the application in the private administration portal: ${safeAdminUrl}\n\nCandidate documents are intentionally not attached to this email.`;
  return createEmailEnvelope({
    templateKey: EMAIL_TEMPLATE_KEYS.INTERNAL_APPLICATION_ALERT,
    entityType: 'application',
    entityId: id,
    to: EMAIL_IDENTITIES.career.address,
    replyTo: email,
    subject,
    html: brandedHtml({
      preheader: `New application ${reference}`,
      heading: 'New candidate application',
      bodyHtml: `<p style="margin-top:0">A candidate application has been persisted successfully.</p><table role="presentation" cellspacing="0" cellpadding="0">${rows}</table><p style="color:#667085;font-size:13px">Candidate documents are intentionally not attached to email. Open the authenticated administration portal to review private documents.</p>`,
      action: { href: safeAdminUrl, label: 'Review application' }
    }),
    text: plain
  });
}

export function contactAcknowledgementTemplate({ enquiryId, firstName, visitorEmail, topic } = {}) {
  const id = text(enquiryId);
  if (!id) throw new TypeError('enquiryId is required.');
  const name = text(firstName) || 'there';
  const to = requireEmail(visitorEmail, 'visitorEmail');
  const enquiryTopic = text(topic) || 'your enquiry';
  const subject = `We received your enquiry — ${subjectText(enquiryTopic)}`;
  const plain = `Hi ${name},\n\nThank you for contacting RC IT Services. We have received your enquiry about ${enquiryTopic}.\n\nOur team will review the information you provided and will contact you if follow-up is required.\n\nRC IT Services`;
  return createEmailEnvelope({
    templateKey: EMAIL_TEMPLATE_KEYS.CONTACT_ACKNOWLEDGEMENT,
    entityType: 'contact_enquiry',
    entityId: id,
    to,
    replyTo: EMAIL_IDENTITIES.contact.address,
    subject,
    html: brandedHtml({
      preheader: 'Your RC IT Services enquiry was received',
      heading: 'Thank you for contacting us',
      bodyHtml: `<p style="margin:0">Hi ${htmlEscape(name)},<br><br>Thank you for contacting RC IT Services. We have received your enquiry about <strong>${htmlEscape(enquiryTopic)}</strong>.<br><br>Our team will review the information you provided and will contact you if follow-up is required.</p>`
    }),
    text: plain
  });
}

export function internalContactAlertTemplate({ enquiryId, visitorName, visitorEmail, company, phone, topic, message, receivedAt, adminUrl } = {}) {
  const id = text(enquiryId);
  if (!id) throw new TypeError('enquiryId is required.');
  const email = requireEmail(visitorEmail, 'visitorEmail');
  const name = text(visitorName) || 'Website visitor';
  const enquiryTopic = text(topic) || 'General enquiry';
  const bodyText = text(message);
  const safeAdminUrl = text(adminUrl) || `${ADMIN_ORIGIN}/`;
  const subject = `New website enquiry — ${subjectText(enquiryTopic)}`;
  const rows = labelledRows([
    ['Name', name],
    ['Email', email],
    ['Company', text(company)],
    ['Phone', text(phone)],
    ['Topic', enquiryTopic],
    ['Received', text(receivedAt)]
  ]);
  const plain = `New website enquiry\n\nName: ${name}\nEmail: ${email}${company ? `\nCompany: ${text(company)}` : ''}${phone ? `\nPhone: ${text(phone)}` : ''}\nTopic: ${enquiryTopic}\n\nMessage:\n${bodyText}\n\nEnquiry ID: ${id}`;
  return createEmailEnvelope({
    templateKey: EMAIL_TEMPLATE_KEYS.INTERNAL_CONTACT_ALERT,
    entityType: 'contact_enquiry',
    entityId: id,
    to: EMAIL_IDENTITIES.contact.address,
    replyTo: email,
    subject,
    html: brandedHtml({
      preheader: `New website enquiry from ${name}`,
      heading: 'New website enquiry',
      bodyHtml: `<table role="presentation" cellspacing="0" cellpadding="0">${rows}</table><div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:6px;white-space:pre-wrap">${htmlEscape(bodyText)}</div>`,
      action: { href: safeAdminUrl, label: 'Open administration' }
    }),
    text: plain
  });
}

export function adminPasswordResetTemplate({ resetRequestId, adminEmail, resetUrl, expiresMinutes = 10 } = {}) {
  const id = text(resetRequestId);
  if (!id) throw new TypeError('resetRequestId is required.');
  const to = requireEmail(adminEmail, 'adminEmail');
  const url = text(resetUrl);
  if (!url.startsWith(`${ADMIN_ORIGIN}/reset-password?token=`)) throw new TypeError('resetUrl must use the production admin reset route.');
  const subject = 'Reset your RC IT Services administrator password';
  const plain = `A password reset was requested for the RC IT Services administrator account.\n\nOpen this single-use link to choose a new password:\n${url}\n\nThis link expires in ${Number(expiresMinutes)} minutes. If you did not request this reset, do not use the link.`;
  return createEmailEnvelope({
    templateKey: EMAIL_TEMPLATE_KEYS.ADMIN_PASSWORD_RESET,
    entityType: 'password_reset_request',
    entityId: id,
    to,
    subject,
    html: brandedHtml({
      preheader: 'RC IT Services administrator password reset',
      heading: 'Reset administrator password',
      bodyHtml: `<p style="margin-top:0">A password reset was requested for the RC IT Services administrator account.</p><p>This is a single-use link and expires in <strong>${htmlEscape(Number(expiresMinutes))} minutes</strong>. If you did not request this reset, do not use the link.</p>`,
      action: { href: url, label: 'Reset password' },
      footer: 'RC IT Services security notification. This mailbox is not monitored for replies.'
    }),
    text: plain
  });
}

export function adminPasswordChangedTemplate({ eventId, adminEmail, changedAt } = {}) {
  const id = text(eventId);
  if (!id) throw new TypeError('eventId is required.');
  const to = requireEmail(adminEmail, 'adminEmail');
  const when = text(changedAt) || 'recently';
  const subject = 'RC IT Services administrator password changed';
  const plain = `The RC IT Services administrator password was changed ${when}.\n\nIf you made this change, no action is required. If you did not make this change, contact the company security owner immediately.`;
  return createEmailEnvelope({
    templateKey: EMAIL_TEMPLATE_KEYS.ADMIN_PASSWORD_CHANGED,
    entityType: 'admin_security_event',
    entityId: id,
    to,
    subject,
    html: brandedHtml({
      preheader: 'Administrator password changed',
      heading: 'Administrator password changed',
      bodyHtml: `<p style="margin-top:0">The RC IT Services administrator password was changed <strong>${htmlEscape(when)}</strong>.</p><p>If you made this change, no action is required. If you did not make this change, contact the company security owner immediately.</p>`,
      footer: 'RC IT Services security notification. This mailbox is not monitored for replies.'
    }),
    text: plain
  });
}

export { PUBLIC_ORIGIN, ADMIN_ORIGIN, htmlEscape };

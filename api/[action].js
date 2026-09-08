import crypto from 'node:crypto';

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const allowedResumeExt = new Set(['pdf', 'doc', 'docx']);
const allowedResumeMime = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

function clean(value, max = 4000) {
  return String(value ?? '').replace(/\0/g, '').trim().slice(0, max);
}

function email(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value, 254));
}

function phone(value) {
  return /^[+()\d\s.-]{7,30}$/.test(clean(value, 30));
}

function respond(res, status, payload) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(payload);
}

function recordId() {
  return crypto.randomUUID();
}

export default async function handler(req, res) {
  const action = clean(req.query?.action, 80).toLowerCase();

  if (req.method === 'GET' && action === 'health') {
    return respond(res, 200, { ok: true, service: 'rc-it-services', runtime: 'vercel', now: new Date().toISOString() });
  }

  if (action === 'login') {
    return respond(res, 501, {
      ok: false,
      code: 'AUTH_NOT_CONFIGURED',
      message: 'Portal authentication is intentionally not enabled in this build. Connect the approved identity provider before production.'
    });
  }

  if (req.method !== 'POST') return respond(res, 405, { ok: false, message: 'Method not allowed.' });
  const payload = typeof req.body === 'object' && req.body ? req.body : {};

  if (action === 'contact') {
    const required = ['firstName', 'lastName', 'phone', 'email', 'consultationTopic', 'message'];
    const missing = required.filter((key) => !clean(payload[key], key === 'message' ? 4000 : 254));
    if (missing.length) return respond(res, 422, { ok: false, message: `Missing required fields: ${missing.join(', ')}` });
    if (payload.privacyConsent !== true) return respond(res, 422, { ok: false, message: 'Privacy confirmation is required.' });
    if (!email(payload.email)) return respond(res, 422, { ok: false, message: 'Enter a valid email address.' });
    if (!phone(payload.phone)) return respond(res, 422, { ok: false, message: 'Enter a valid phone number.' });
    return respond(res, 202, { ok: true, id: recordId(), message: 'Enquiry validated. Production email or CRM delivery will be connected before public launch.' });
  }

  if (action === 'demo') {
    if (!clean(payload.name, 120) || !clean(payload.company, 140) || !clean(payload.businessEmail, 254) || !clean(payload.product, 120)) {
      return respond(res, 422, { ok: false, message: 'Name, company, business email and product are required.' });
    }
    if (!email(payload.businessEmail)) return respond(res, 422, { ok: false, message: 'Enter a valid business email.' });
    if (payload.phone && !phone(payload.phone)) return respond(res, 422, { ok: false, message: 'Enter a valid phone number.' });
    return respond(res, 202, { ok: true, id: recordId(), message: 'Preview demo request validated successfully. Production delivery will be connected before launch.' });
  }

  if (action === 'consultation') {
    if (!clean(payload.name, 120) || !clean(payload.company, 140) || !clean(payload.businessEmail, 254) || !clean(payload.topic, 140)) {
      return respond(res, 422, { ok: false, message: 'Name, company, business email and consultation topic are required.' });
    }
    if (!email(payload.businessEmail)) return respond(res, 422, { ok: false, message: 'Enter a valid business email.' });
    if (payload.phone && !phone(payload.phone)) return respond(res, 422, { ok: false, message: 'Enter a valid phone number.' });
    return respond(res, 202, { ok: true, id: recordId(), message: 'Preview consultation request validated successfully. Production delivery will be connected before launch.' });
  }

  if (action === 'chat') {
    if (!clean(payload.name, 120) || !clean(payload.businessEmail, 254) || !clean(payload.message, 3000)) {
      return respond(res, 422, { ok: false, message: 'Name, business email and message are required.' });
    }
    if (!email(payload.businessEmail)) return respond(res, 422, { ok: false, message: 'Enter a valid business email.' });
    return respond(res, 202, { ok: true, id: recordId(), message: 'Preview message validated successfully. Production delivery will be connected before launch.' });
  }

  if (action === 'resume') {
    if (!clean(payload.name, 120) || !clean(payload.email, 254) || !clean(payload.primarySkill, 160) || payload.consent !== true || !clean(payload.fileName, 180) || !payload.fileBase64) {
      return respond(res, 422, { ok: false, message: 'Name, email, primary skill, consent and CV are required.' });
    }
    if (!email(payload.email)) return respond(res, 422, { ok: false, message: 'Enter a valid email address.' });
    if (payload.phone && !phone(payload.phone)) return respond(res, 422, { ok: false, message: 'Enter a valid phone number.' });

    const fileName = clean(payload.fileName, 180);
    const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
    const mime = clean(payload.mimeType, 120);
    if (!allowedResumeExt.has(ext) || (mime && !allowedResumeMime.has(mime))) {
      return respond(res, 415, { ok: false, message: 'CV must be a PDF, DOC or DOCX file.' });
    }

    let bytes;
    try {
      bytes = Buffer.from(String(payload.fileBase64), 'base64');
    } catch {
      return respond(res, 422, { ok: false, message: 'The CV file could not be read.' });
    }
    if (!bytes.length || bytes.length > MAX_RESUME_BYTES) return respond(res, 413, { ok: false, message: 'CV file must be 5 MB or smaller.' });

    return respond(res, 202, {
      ok: true,
      id: recordId(),
      message: 'Preview CV validation succeeded. Durable CV storage is intentionally not enabled until the production storage/privacy flow is approved.'
    });
  }

  return respond(res, 404, { ok: false, message: 'API endpoint not found.' });
}

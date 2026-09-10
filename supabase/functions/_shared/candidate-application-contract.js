import {
  CANDIDATE_DOCUMENT_TYPES,
  MAX_CANDIDATE_DOCUMENT_BYTES,
  candidateDocumentExtension
} from './candidate-document-contract.js';

export const CANDIDATE_CONSENT_VERSION = 'rcitcs-candidate-privacy-v1';
export const MAX_CANDIDATE_JSON_BYTES = 32 * 1024;
export const MAX_CANDIDATE_COVER_LETTER_TEXT = 10_000;
export const CANDIDATE_DOCUMENT_BUCKET = 'candidate-documents';
export const TUS_CHUNK_BYTES = 6 * 1024 * 1024;

const JOB_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()0-9.\-\s]{7,30}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value) {
  return String(value ?? '').trim();
}

function httpsUrl(value, { linkedIn = false } = {}) {
  const raw = text(value);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (linkedIn && !/(^|\.)linkedin\.com$/i.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeCandidateEmail(value) {
  return text(value).toLowerCase();
}

export function validateCandidateIdentity(input = {}) {
  const firstName = text(input.firstName ?? input.first_name);
  const lastName = text(input.lastName ?? input.last_name);
  const email = normalizeCandidateEmail(input.email);
  const phone = text(input.phone);
  const location = text(input.location);
  const linkedinRaw = input.linkedinUrl ?? input.linkedin_url;
  const portfolioRaw = input.portfolioUrl ?? input.portfolio_url;
  const linkedinUrl = httpsUrl(linkedinRaw, { linkedIn: true });
  const portfolioUrl = httpsUrl(portfolioRaw);
  const coverLetterText = text(input.coverLetterText ?? input.cover_letter_text);
  const consent = input.consent === true;
  const consentVersion = text(input.consentVersion ?? input.consent_version);
  const honeypot = text(input.website);
  const errors = [];

  if (firstName.length < 1 || firstName.length > 80) errors.push({ field: 'firstName', code: 'INVALID_FIRST_NAME' });
  if (lastName.length < 1 || lastName.length > 80) errors.push({ field: 'lastName', code: 'INVALID_LAST_NAME' });
  if (email.length < 3 || email.length > 254 || !EMAIL.test(email)) errors.push({ field: 'email', code: 'INVALID_EMAIL' });
  if (!PHONE.test(phone)) errors.push({ field: 'phone', code: 'INVALID_PHONE' });
  if (location.length > 200) errors.push({ field: 'location', code: 'INVALID_LOCATION' });
  if (linkedinUrl === null) errors.push({ field: 'linkedinUrl', code: 'INVALID_LINKEDIN' });
  if (portfolioUrl === null) errors.push({ field: 'portfolioUrl', code: 'INVALID_PORTFOLIO' });
  if (coverLetterText.length > MAX_CANDIDATE_COVER_LETTER_TEXT) errors.push({ field: 'coverLetterText', code: 'COVER_LETTER_TOO_LONG' });
  if (!consent || consentVersion !== CANDIDATE_CONSENT_VERSION) errors.push({ field: 'consent', code: 'CONSENT_REQUIRED' });
  if (honeypot) errors.push({ field: 'website', code: 'BOT_DETECTED' });

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    value: Object.freeze({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      location,
      linkedin_url: linkedinUrl || '',
      portfolio_url: portfolioUrl || '',
      cover_letter_text: coverLetterText,
      consent,
      consent_version: consentVersion
    })
  });
}

export function validateCandidateDocumentDescriptors(input = []) {
  const documents = Array.isArray(input) ? input : [];
  const errors = [];
  const normalized = [];
  const seenKinds = new Set();

  if (documents.length < 1 || documents.length > 2) {
    errors.push({ field: 'documents', code: 'INVALID_DOCUMENT_COUNT' });
  }

  for (const item of documents) {
    const kind = text(item?.kind);
    const fileName = text(item?.fileName ?? item?.original_filename);
    const mimeType = text(item?.mimeType ?? item?.mime_type);
    const sizeBytes = Number(item?.sizeBytes ?? item?.size_bytes);
    const extension = candidateDocumentExtension(fileName);
    const expectedMime = CANDIDATE_DOCUMENT_TYPES[extension];

    if (!['resume', 'cover_letter'].includes(kind) || seenKinds.has(kind)) {
      errors.push({ field: kind || 'documents', code: 'INVALID_DOCUMENT_KIND' });
      continue;
    }
    seenKinds.add(kind);

    if (!fileName || fileName.length > 255) errors.push({ field: kind, code: 'INVALID_FILE_NAME' });
    if (!expectedMime || expectedMime !== mimeType) errors.push({ field: kind, code: 'INVALID_FILE_TYPE' });
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_CANDIDATE_DOCUMENT_BYTES) {
      errors.push({ field: kind, code: 'INVALID_FILE_SIZE', maxBytes: MAX_CANDIDATE_DOCUMENT_BYTES });
    }

    normalized.push(Object.freeze({ kind, original_filename: fileName, mime_type: mimeType, size_bytes: sizeBytes, extension }));
  }

  if (!seenKinds.has('resume')) errors.push({ field: 'resume', code: 'RESUME_REQUIRED' });

  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors), documents: Object.freeze(normalized) });
}

export function validateCandidateStartRequest(input = {}) {
  const jobSlug = text(input.jobSlug ?? input.job_slug).toLowerCase();
  const identity = validateCandidateIdentity(input);
  const documents = validateCandidateDocumentDescriptors(input.documents);
  const errors = [...identity.errors, ...documents.errors];
  if (!jobSlug || jobSlug.length > 160 || !JOB_SLUG.test(jobSlug)) errors.push({ field: 'jobSlug', code: 'INVALID_JOB' });

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    jobSlug,
    candidate: identity.value,
    documents: documents.documents
  });
}

export function validateIntakeToken(value) {
  const token = text(value);
  return /^[A-Za-z0-9_-]{40,128}$/.test(token) ? token : '';
}

export function validateApplicationReference(value) {
  const reference = text(value);
  return /^RC-APP-[0-9]{2}-[A-F0-9]{12}$/.test(reference) ? reference : '';
}

export function validateUuid(value) {
  const current = text(value);
  return UUID.test(current) ? current.toLowerCase() : '';
}

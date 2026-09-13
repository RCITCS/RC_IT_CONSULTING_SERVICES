import { providerUnavailable } from '../core/errors.js';

export function createUnavailableSubmissionRepository() {
  return Object.freeze({
    configured: false,
    name: 'unconfigured-submission-repository',
    async create() {
      throw providerUnavailable(
        'persistence',
        'Submission persistence is not configured. Your information was not stored. Please try again after the production data service is connected.'
      );
    }
  });
}

function text(value) {
  return String(value ?? '').trim();
}

function metadataFor(record, extra = {}) {
  return {
    request_id: record.requestId,
    received_at: record.receivedAt,
    submission_type: record.type,
    ...extra
  };
}

function rowFor(record) {
  const payload = record.payload;

  if (record.type === 'contact') {
    return {
      id: record.id,
      name: `${text(payload.firstName)} ${text(payload.lastName)}`.trim(),
      email: text(payload.email).toLowerCase(),
      phone: text(payload.phone) || null,
      company: text(payload.company) || null,
      service: text(payload.consultationTopic) || null,
      subject: text(payload.intent) || 'General enquiry',
      message: text(payload.message),
      consent: payload.privacyConsent === true,
      consent_at: payload.privacyConsent === true ? record.receivedAt : null,
      status: 'new',
      source: 'contact',
      metadata: metadataFor(record, {
        job_title: text(payload.jobTitle) || null,
        intent: text(payload.intent) || 'General enquiry'
      })
    };
  }

  if (record.type === 'demo') {
    return {
      id: record.id,
      name: text(payload.name),
      email: text(payload.businessEmail).toLowerCase(),
      phone: text(payload.phone) || null,
      company: text(payload.company) || null,
      service: text(payload.product) || null,
      subject: 'Demo request',
      message: text(payload.notes) || `Demo request for ${text(payload.product)}`,
      consent: false,
      consent_at: null,
      status: 'new',
      source: 'demo',
      metadata: metadataFor(record)
    };
  }

  if (record.type === 'consultation') {
    return {
      id: record.id,
      name: text(payload.name),
      email: text(payload.businessEmail).toLowerCase(),
      phone: text(payload.phone) || null,
      company: text(payload.company) || null,
      service: text(payload.topic) || null,
      subject: 'Consultation request',
      message: text(payload.brief) || `Consultation request about ${text(payload.topic)}`,
      consent: false,
      consent_at: null,
      status: 'new',
      source: 'consultation',
      metadata: metadataFor(record)
    };
  }

  if (record.type === 'chat') {
    return {
      id: record.id,
      name: text(payload.name),
      email: text(payload.businessEmail).toLowerCase(),
      phone: null,
      company: text(payload.company) || null,
      service: null,
      subject: 'Website chat',
      message: text(payload.message),
      consent: false,
      consent_at: null,
      status: 'new',
      source: 'chat',
      metadata: metadataFor(record)
    };
  }

  throw new TypeError(`Unsupported submission record type: ${String(record.type ?? '')}`);
}

export function createDatabaseSubmissionRepository(database) {
  if (!database?.configured) return createUnavailableSubmissionRepository();
  if (typeof database.insertRow !== 'function') throw new TypeError('Configured database provider requires insertRow(table, record).');
  return Object.freeze({
    configured: true,
    name: 'database-submission-repository',
    async create(record) {
      const persisted = await database.insertRow('contact_enquiries', rowFor(record));
      return { id: persisted.id };
    }
  });
}

export function assertSubmissionRepository(repository) {
  if (!repository || typeof repository.create !== 'function') {
    throw new TypeError('A submission repository with create(record) is required.');
  }
  return repository;
}

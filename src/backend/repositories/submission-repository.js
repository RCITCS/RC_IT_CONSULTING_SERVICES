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

function rowFor(record) {
  const payload = record.payload;
  const common = {
    id: record.id,
    source_type: record.type,
    request_id: record.requestId,
    received_at: record.receivedAt,
    status: 'new'
  };
  if (record.type === 'contact') return {
    ...common,
    first_name: payload.firstName,
    last_name: payload.lastName,
    company: payload.company || null,
    job_title: payload.jobTitle || null,
    email: payload.email,
    phone: payload.phone,
    topic: payload.consultationTopic,
    message: payload.message,
    details: { intent: payload.intent }
  };
  if (record.type === 'demo') return {
    ...common,
    name: payload.name,
    company: payload.company,
    email: payload.businessEmail,
    phone: payload.phone || null,
    topic: payload.product,
    message: payload.notes || null,
    details: {}
  };
  if (record.type === 'consultation') return {
    ...common,
    name: payload.name,
    company: payload.company,
    email: payload.businessEmail,
    phone: payload.phone || null,
    topic: payload.topic,
    message: payload.brief || null,
    details: {}
  };
  return {
    ...common,
    name: payload.name,
    company: payload.company || null,
    email: payload.businessEmail,
    message: payload.message,
    details: {}
  };
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

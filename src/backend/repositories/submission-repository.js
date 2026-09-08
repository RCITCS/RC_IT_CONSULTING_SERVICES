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

export function assertSubmissionRepository(repository) {
  if (!repository || typeof repository.create !== 'function') {
    throw new TypeError('A submission repository with create(record) is required.');
  }
  return repository;
}

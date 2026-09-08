import { assertSubmissionRepository } from '../repositories/submission-repository.js';
import { validateSubmission } from '../validation/submissions.js';

export function createSubmissionService({ repository, idFactory = () => globalThis.crypto.randomUUID(), now = () => new Date() } = {}) {
  const submissions = assertSubmissionRepository(repository);

  return Object.freeze({
    async submit(type, payload, context) {
      const validated = validateSubmission(type, payload);
      const record = Object.freeze({
        id: idFactory(),
        type,
        receivedAt: now().toISOString(),
        requestId: context.requestId,
        payload: validated
      });

      const persisted = await submissions.create(record);
      if (!persisted || persisted.id !== record.id) {
        throw new Error('Submission repository did not confirm the persisted record.');
      }

      return { id: record.id, type: record.type };
    }
  });
}

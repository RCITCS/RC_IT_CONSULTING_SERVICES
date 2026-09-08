import { featureNotConfigured } from '../core/errors.js';
import { successResponse } from '../core/response.js';

const messages = Object.freeze({
  contact: 'Your enquiry has been recorded.',
  demo: 'Your demo request has been recorded.',
  consultation: 'Your consultation request has been recorded.',
  chat: 'Your message has been recorded.'
});

export function createApiHandlers({ config, submissionService } = {}) {
  return Object.freeze({
    health({ context }) {
      return successResponse({
        requestId: context.requestId,
        data: {
          service: config.serviceName,
          runtime: context.runtime,
          environment: config.environment,
          now: new Date().toISOString()
        }
      });
    },

    async submission({ context, body, submissionType }) {
      const result = await submissionService.submit(submissionType, body, context);
      return successResponse({
        status: 201,
        requestId: context.requestId,
        message: messages[submissionType],
        data: result
      });
    },

    login() {
      throw featureNotConfigured(
        'AUTH_NOT_CONFIGURED',
        'Portal authentication is intentionally not enabled in this build. Authentication will be connected in the approved security phase.'
      );
    },

    recruitment() {
      throw featureNotConfigured(
        'RECRUITMENT_STORAGE_NOT_CONFIGURED',
        'Recruitment document submission is not enabled yet. No candidate document or application has been stored.'
      );
    }
  });
}

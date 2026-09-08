import { createApiHandlers } from './api/handlers.js';
import { createApiRouter } from './api/router.js';
import { createBackendConfig } from './config/environment.js';
import { normalizeBackendError } from './core/errors.js';
import { createLogger } from './core/logger.js';
import { createRequestContext } from './core/request-context.js';
import { errorResponse } from './core/response.js';
import { createProviderRegistry } from './providers/provider-registry.js';
import { createUnavailableSubmissionRepository } from './repositories/submission-repository.js';
import { createSubmissionService } from './services/submission-service.js';

export function createBackendApplication({ runtime = 'unknown', env = {}, providers, submissionRepository, logger } = {}) {
  const config = createBackendConfig(env);
  const providerRegistry = createProviderRegistry(providers);
  const applicationLogger = logger || createLogger();
  const repository = submissionRepository || createUnavailableSubmissionRepository();
  const submissionService = createSubmissionService({ repository });
  const handlers = createApiHandlers({ config, providers: providerRegistry, submissionService });
  const router = createApiRouter({ handlers, logger: applicationLogger });

  function contextFor({ method, pathname, headers }) {
    return createRequestContext({ method, pathname, headers, runtime });
  }

  return Object.freeze({
    config,
    providers: providerRegistry,
    async handle({ method, pathname, headers, body }) {
      const context = contextFor({ method, pathname, headers });
      return router({ method, pathname, headers, body, context });
    },
    failure({ method, pathname, headers, error }) {
      const context = contextFor({ method, pathname, headers });
      const normalized = normalizeBackendError(error);
      applicationLogger.warn('api.request.rejected', { ...context, status: normalized.status, code: normalized.code });
      return errorResponse(normalized, context.requestId);
    }
  });
}

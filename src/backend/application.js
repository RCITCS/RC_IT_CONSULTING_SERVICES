import { createApiHandlers } from './api/handlers.js';
import { createApiRouter } from './api/router.js';
import { createBackendConfig } from './config/environment.js';
import { normalizeBackendError } from './core/errors.js';
import { createLogger } from './core/logger.js';
import { createRequestContext } from './core/request-context.js';
import { errorResponse } from './core/response.js';
import { createProviderRegistry } from './providers/provider-registry.js';
import { createCandidateApplicationGateway } from './providers/candidate-application-gateway.js';
import { createDatabaseSubmissionRepository } from './repositories/submission-repository.js';
import { createSubmissionService } from './services/submission-service.js';

export function createBackendApplication({ runtime = 'unknown', env = {}, providers, submissionRepository, logger, fetchImpl = globalThis.fetch } = {}) {
  const config = createBackendConfig(env, { runtime });
  const providerRegistry = createProviderRegistry(providers, { env, fetchImpl });
  const candidateApplicationGateway = providers?.candidateApplication
    || createCandidateApplicationGateway({ env, runtime, fetchImpl });
  const applicationLogger = logger || createLogger();
  const repository = submissionRepository || createDatabaseSubmissionRepository(providerRegistry.database);
  const submissionService = createSubmissionService({ repository });
  const handlers = createApiHandlers({ config, submissionService, candidateApplicationGateway });
  const router = createApiRouter({ handlers, logger: applicationLogger });

  function contextFor({ method, pathname, headers }) {
    return createRequestContext({ method, pathname, headers, runtime });
  }

  function logFailure(context, normalized) {
    const meta = { ...context, status: normalized.status, code: normalized.code };
    if (normalized.status >= 500) applicationLogger.error('api.request.failed', meta);
    else applicationLogger.warn('api.request.rejected', meta);
  }

  return Object.freeze({
    config,
    providers: Object.freeze({ ...providerRegistry, candidateApplication: candidateApplicationGateway }),
    async handle({ method, pathname, headers, body }) {
      const context = contextFor({ method, pathname, headers });
      return router({ method, pathname, headers, body, context });
    },
    failure({ method, pathname, headers, error }) {
      const context = contextFor({ method, pathname, headers });
      const normalized = normalizeBackendError(error);
      logFailure(context, normalized);
      return errorResponse(normalized, context.requestId);
    }
  });
}

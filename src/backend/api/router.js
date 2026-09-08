import { badRequest, methodNotAllowed, notFound, normalizeBackendError } from '../core/errors.js';
import { errorResponse } from '../core/response.js';

const routes = Object.freeze({
  health: { methods: ['GET'], handler: 'health' },
  contact: { methods: ['POST'], handler: 'submission', submissionType: 'contact', body: true },
  demo: { methods: ['POST'], handler: 'submission', submissionType: 'demo', body: true },
  consultation: { methods: ['POST'], handler: 'submission', submissionType: 'consultation', body: true },
  chat: { methods: ['POST'], handler: 'submission', submissionType: 'chat', body: true },
  login: { methods: ['POST'], handler: 'login' },
  resume: { methods: ['POST'], handler: 'recruitment' },
  'career-application': { methods: ['POST'], handler: 'recruitment' }
});

export function routeNeedsJsonBody(pathname) {
  const action = String(pathname || '').replace(/^\/api\//, '').split('/')[0].toLowerCase();
  return Boolean(routes[action]?.body);
}

export function createApiRouter({ handlers, logger, now = () => Date.now() } = {}) {
  return async function handleApi({ method, pathname, body, context }) {
    const started = now();
    let response;
    try {
      const action = String(pathname || '').replace(/^\/api\//, '').split('/')[0].toLowerCase();
      const route = routes[action];
      if (!route) throw notFound();
      if (!route.methods.includes(context.method)) throw methodNotAllowed(route.methods);
      if (route.body && (!body || typeof body !== 'object' || Array.isArray(body))) throw badRequest();
      const handler = handlers[route.handler];
      response = await handler({ context, body, submissionType: route.submissionType });
    } catch (error) {
      const normalized = normalizeBackendError(error);
      if (normalized.status >= 500) {
        logger.error('api.request.failed', { ...context, status: normalized.status, code: normalized.code });
      } else {
        logger.warn('api.request.rejected', { ...context, status: normalized.status, code: normalized.code });
      }
      response = errorResponse(normalized, context.requestId);
    }

    logger.info('api.request.completed', {
      ...context,
      status: response.status,
      durationMs: Math.max(0, now() - started)
    });
    return response;
  };
}

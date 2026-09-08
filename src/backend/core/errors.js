export class BackendError extends Error {
  constructor({ code, message, status = 500, details = null, expose = true, cause } = {}) {
    super(message || 'Unexpected server error.', cause ? { cause } : undefined);
    this.name = 'BackendError';
    this.code = code || 'INTERNAL_ERROR';
    this.status = Number.isInteger(status) ? status : 500;
    this.details = details;
    this.expose = expose;
  }
}

export function validationError(message, details = null) {
  return new BackendError({ code: 'VALIDATION_ERROR', message, status: 422, details });
}

export function badRequest(message = 'A valid JSON request body is required.') {
  return new BackendError({ code: 'BAD_REQUEST', message, status: 400 });
}

export function methodNotAllowed(allowed = []) {
  return new BackendError({
    code: 'METHOD_NOT_ALLOWED',
    message: 'Method not allowed.',
    status: 405,
    details: allowed.length ? { allowed } : null
  });
}

export function notFound(message = 'API endpoint not found.') {
  return new BackendError({ code: 'NOT_FOUND', message, status: 404 });
}

export function providerUnavailable(provider, message) {
  return new BackendError({
    code: `${String(provider || 'provider').toUpperCase()}_NOT_CONFIGURED`,
    message: message || `${provider} is not configured.`,
    status: 503
  });
}

export function featureNotConfigured(code, message) {
  return new BackendError({ code, message, status: 501 });
}

export function normalizeBackendError(error) {
  if (error instanceof BackendError) return error;
  return new BackendError({
    code: 'INTERNAL_ERROR',
    message: 'Unexpected server error.',
    status: 500,
    expose: false,
    cause: error
  });
}

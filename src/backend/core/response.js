import { normalizeBackendError } from './errors.js';

const BASE_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-robots-tag': 'noindex, nofollow'
});

export function successResponse({ status = 200, requestId, message, data = null, headers = {} } = {}) {
  return {
    status,
    headers: { ...BASE_HEADERS, 'x-request-id': requestId, ...headers },
    body: { ok: true, requestId, ...(message ? { message } : {}), ...(data !== null ? { data } : {}) }
  };
}

export function errorResponse(error, requestId, headers = {}) {
  const normalized = normalizeBackendError(error);
  const message = normalized.expose ? normalized.message : 'Unexpected server error.';
  return {
    status: normalized.status,
    headers: {
      ...BASE_HEADERS,
      'x-request-id': requestId,
      ...(normalized.status === 405 && normalized.details?.allowed?.length ? { allow: normalized.details.allowed.join(', ') } : {}),
      ...headers
    },
    body: {
      ok: false,
      requestId,
      code: normalized.code,
      message,
      ...(normalized.expose && normalized.details ? { details: normalized.details } : {})
    }
  };
}

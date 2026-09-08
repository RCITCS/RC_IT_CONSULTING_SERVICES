const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function headerValue(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  const value = entry?.[1];
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function randomRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createRequestContext({ method, pathname, headers, runtime = 'unknown', idFactory = randomRequestId, now = () => new Date() } = {}) {
  const incoming = headerValue(headers, 'x-request-id').trim();
  const requestId = REQUEST_ID_PATTERN.test(incoming) ? incoming : idFactory();
  return Object.freeze({
    requestId,
    method: String(method || 'GET').toUpperCase(),
    pathname: String(pathname || '/'),
    runtime,
    startedAt: now().toISOString()
  });
}

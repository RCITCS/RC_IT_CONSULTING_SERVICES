import { BackendError, badRequest } from './errors.js';

export function parseJsonText(text, maxBytes) {
  const raw = String(text ?? '');
  const size = new TextEncoder().encode(raw).byteLength;
  if (size > maxBytes) {
    throw new BackendError({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body is too large.',
      status: 413
    });
  }
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not-object');
    return parsed;
  } catch {
    throw badRequest();
  }
}

export function validateParsedJsonBody(body, maxBytes) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest();
  const serialized = JSON.stringify(body);
  if (new TextEncoder().encode(serialized).byteLength > maxBytes) {
    throw new BackendError({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.', status: 413 });
  }
  return body;
}

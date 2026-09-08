import { BackendError, badRequest, unsupportedMediaType } from './errors.js';

function payloadTooLarge() {
  return new BackendError({
    code: 'PAYLOAD_TOO_LARGE',
    message: 'Request body is too large.',
    status: 413
  });
}

function byteLength(text) {
  return new TextEncoder().encode(String(text ?? '')).byteLength;
}

function assertWithinLimit(size, maxBytes) {
  if (size > maxBytes) throw payloadTooLarge();
}

function headerValue(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return headers.get(name) || '';
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  const value = entry?.[1];
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

export function assertJsonContentType(headers) {
  const mediaType = headerValue(headers, 'content-type').split(';', 1)[0].trim().toLowerCase();
  const isJson = mediaType === 'application/json' || (mediaType.startsWith('application/') && mediaType.endsWith('+json'));
  if (!isJson) throw unsupportedMediaType();
}

export async function readBoundedRequestText(request, maxBytes) {
  const declaredLength = Number(request.headers?.get?.('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > 0) assertWithinLimit(declaredLength, maxBytes);

  if (!request.body) return '';
  if (typeof request.body.getReader !== 'function') {
    const text = await request.text();
    assertWithinLimit(byteLength(text), maxBytes);
    return text;
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value?.byteLength || 0;
      assertWithinLimit(size, maxBytes);
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } catch (error) {
    try { await reader.cancel(); } catch {}
    throw error;
  }
}

export function parseJsonText(text, maxBytes) {
  const raw = String(text ?? '');
  assertWithinLimit(byteLength(raw), maxBytes);
  if (!raw.trim()) throw badRequest();
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
  assertWithinLimit(byteLength(serialized), maxBytes);
  return body;
}

export function parseRuntimeJsonBody(body, maxBytes) {
  if (typeof body === 'string') return parseJsonText(body, maxBytes);
  if (body instanceof Uint8Array) return parseJsonText(new TextDecoder().decode(body), maxBytes);
  return validateParsedJsonBody(body, maxBytes);
}

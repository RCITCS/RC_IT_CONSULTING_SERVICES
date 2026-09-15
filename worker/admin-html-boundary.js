import adminWorker, { enhanceAdminResponse } from './admin-only.js';

const BODYLESS_STATUSES = new Set([204, 205, 304]);

function canInspectAsText(contentType = '') {
  const normalized = String(contentType).toLowerCase().trim();
  return normalized === '' || normalized.startsWith('text/plain');
}

function looksLikeHtmlDocument(body = '') {
  const prefix = String(body).trimStart().slice(0, 128).toLowerCase();
  return prefix.startsWith('<!doctype html') || prefix.startsWith('<html');
}

function rebuildTextResponse(response, body, headers) {
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export async function enforceAdminHtmlBoundary(response, requestMethod) {
  if (requestMethod === 'HEAD' || BODYLESS_STATUSES.has(response.status)) return response;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('text/html')) return response;
  if (!canInspectAsText(contentType)) return response;

  const body = await response.text();
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');

  if (!looksLikeHtmlDocument(body)) {
    return rebuildTextResponse(response, body, headers);
  }

  headers.set('content-type', 'text/html; charset=utf-8');
  const normalizedHtml = rebuildTextResponse(response, body, headers);

  // The inner edge deliberately skips HTML rewriting when an upstream response
  // is mislabeled as text/plain. Once the document is positively identified as
  // HTML, run it through the same hardened enhancer used for correctly labeled
  // responses so host-local links, CSP, responsive UI and release markers remain
  // one authoritative implementation.
  return enhanceAdminResponse(normalizedHtml, requestMethod);
}

export default {
  async fetch(request, env, ctx) {
    const response = await adminWorker.fetch(request, env, ctx);
    return enforceAdminHtmlBoundary(response, request.method);
  }
};

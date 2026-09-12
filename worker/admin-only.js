import runtime from '../src/backend/runtime/worker.js';
import { injectAdminResponsiveHtml } from './admin-responsive.js';

const ADMIN_HOSTS = new Set(['admin.rcitcs.com', 'admin-staging.rcitcs.com']);
const BODYLESS_STATUSES = new Set([204, 205, 304]);
const UNAUTHENTICATED_FORM_PATHS = new Set(['/login', '/forgot-password']);

function copyResponseHeaders(source) {
  const headers = new Headers(source);
  if (typeof source.getSetCookie === 'function') {
    const cookies = source.getSetCookie();
    if (cookies.length) {
      headers.delete('set-cookie');
      for (const cookie of cookies) headers.append('set-cookie', cookie);
    }
  }
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');
  return headers;
}

function headerMatchesOrigin(value, url) {
  if (!value || value === 'null') return false;
  try {
    return new URL(value).origin === url.origin;
  } catch {
    return false;
  }
}

function hasExplicitCrossOriginEvidence(request, url) {
  const origin = request.headers.get('origin');
  if (origin && origin !== 'null') return !headerMatchesOrigin(origin, url);

  const referer = request.headers.get('referer');
  if (referer) return !headerMatchesOrigin(referer, url);

  const site = request.headers.get('sec-fetch-site');
  return site === 'cross-site' || site === 'same-site';
}

function parseCookieHeader(request) {
  const cookies = new Map();
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    const raw = part.slice(separator + 1).trim();
    try {
      cookies.set(name, decodeURIComponent(raw));
    } catch {
      cookies.set(name, raw);
    }
  }
  return cookies;
}

function isFormPost(request) {
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  return contentType.startsWith('application/x-www-form-urlencoded') || contentType.startsWith('multipart/form-data');
}

async function hasMatchingAdminCsrf(request) {
  if (!isFormPost(request)) return false;
  let form;
  try {
    form = await request.clone().formData();
  } catch {
    return false;
  }
  const submitted = String(form.get('csrf') || '');
  if (!submitted) return false;
  const cookies = parseCookieHeader(request);
  return submitted === cookies.get('rcitcs_admin_csrf') || submitted === cookies.get('rcitcs_admin_recovery_csrf');
}

function withSameOriginEvidence(request, url) {
  const headers = new Headers(request.headers);
  headers.set('origin', url.origin);
  return new Request(request, { headers });
}

export async function normalizeAdminBrowserPost(request) {
  if (request.method !== 'POST') return request;
  const url = new URL(request.url);
  if (!ADMIN_HOSTS.has(url.hostname.toLowerCase())) return request;

  if (hasExplicitCrossOriginEvidence(request, url)) return request;

  const origin = request.headers.get('origin');
  if (origin && origin !== 'null') return request;
  const referer = request.headers.get('referer');
  if (referer) return request;

  if (request.headers.get('sec-fetch-site') === 'same-origin') {
    return withSameOriginEvidence(request, url);
  }

  if (UNAUTHENTICATED_FORM_PATHS.has(url.pathname) && isFormPost(request)) {
    return withSameOriginEvidence(request, url);
  }

  if (await hasMatchingAdminCsrf(request)) {
    return withSameOriginEvidence(request, url);
  }

  return request;
}

async function enhanceAdminResponse(response, requestMethod) {
  const contentType = response.headers.get('content-type') || '';
  if (requestMethod === 'HEAD' || BODYLESS_STATUSES.has(response.status) || !contentType.toLowerCase().includes('text/html')) {
    return response;
  }

  const body = await response.text();
  const enhanced = injectAdminResponsiveHtml(body);
  const headers = copyResponseHeaders(response.headers);
  return new Response(enhanced, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const host = new URL(request.url).hostname.toLowerCase();
    if (!ADMIN_HOSTS.has(host)) {
      return new Response('Not Found', {
        status: 404,
        headers: {
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex, nofollow',
          'x-content-type-options': 'nosniff'
        }
      });
    }
    request = await normalizeAdminBrowserPost(request);
    const response = await runtime.fetch(request, env, ctx);
    return enhanceAdminResponse(response, request.method);
  }
};

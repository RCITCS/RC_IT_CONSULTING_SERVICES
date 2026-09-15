import runtime from '../src/backend/runtime/worker.js';
import { injectAdminResponsiveHtml } from './admin-responsive.js';
import {
  ADMIN_INTERACTION_PATH,
  ADMIN_INTERACTION_SCRIPT,
  ADMIN_SOFT_SUBMIT_HEADER,
  injectAdminInteractionHtml
} from './admin-interactions.js';

const ADMIN_HOSTS = new Set(['admin.rcitcs.com', 'admin-staging.rcitcs.com']);
const ADMIN_STAGING_HOST = 'admin-staging.rcitcs.com';
const ADMIN_STAGING_MODE_UNAVAILABLE = 'unavailable';
const BODYLESS_STATUSES = new Set([204, 205, 304]);
const UNAUTHENTICATED_FORM_PATHS = new Set(['/login', '/forgot-password']);
const ADMIN_UPSTREAM_ORIGIN = 'https://chsizmffzpxcqhaptjeu.supabase.co';
const ADMIN_UPSTREAM_BASE = '/functions/v1/admin-auth';
export const ADMIN_EDGE_RELEASE = 'phase12-job-authoring-v1';
export const ADMIN_BUILD_SURFACE = 'phase16-security-closure-v1';
export const ADMIN_HTML_MEDIA_FIX = 'phase16-html-content-type-v1';

export function rewriteAdminEdgeReference(value = '') {
  let rewritten = String(value).replaceAll(`${ADMIN_UPSTREAM_ORIGIN}${ADMIN_UPSTREAM_BASE}`, '');
  rewritten = rewritten.replaceAll(`${ADMIN_UPSTREAM_BASE}/`, '/');
  rewritten = rewritten.replaceAll(ADMIN_UPSTREAM_BASE, '/');
  return rewritten || '/';
}

function cookieValues(source) {
  if (typeof source.getSetCookie === 'function') return source.getSetCookie();
  const combined = source.get('set-cookie');
  return combined ? combined.split(/,(?=[^;,]+=)/g).map((value) => value.trim()) : [];
}

function copyResponseHeaders(source) {
  const headers = new Headers(source);
  const cookies = cookieValues(source);
  if (cookies.length) {
    headers.delete('set-cookie');
    for (const cookie of cookies) headers.append('set-cookie', rewriteAdminEdgeReference(cookie));
  }
  const location = headers.get('location');
  if (location) headers.set('location', rewriteAdminEdgeReference(location));
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');
  return headers;
}

function setBuildMarkers(headers) {
  headers.set('x-rc-admin-build-surface', ADMIN_BUILD_SURFACE);
  headers.set('x-rc-admin-html-media-fix', ADMIN_HTML_MEDIA_FIX);
}

function markAdminBuildSurface(response) {
  const headers = copyResponseHeaders(response.headers);
  setBuildMarkers(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
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

function withTrustedNavigationEvidence(request, url) {
  const headers = new Headers(request.headers);
  headers.set('origin', url.origin);
  headers.set('sec-fetch-site', 'same-origin');
  headers.set('sec-fetch-mode', 'navigate');
  headers.set('sec-fetch-dest', 'document');
  headers.set('sec-fetch-user', '?1');
  headers.delete(ADMIN_SOFT_SUBMIT_HEADER);
  return new Request(request, { headers });
}

export async function normalizeAdminBrowserPost(request) {
  if (request.method !== 'POST') return request;
  const url = new URL(request.url);
  if (!ADMIN_HOSTS.has(url.hostname.toLowerCase())) return request;

  if (hasExplicitCrossOriginEvidence(request, url)) return request;

  // The client interaction layer may submit authenticated admin forms with fetch
  // so the surrounding register or modal does not tear down. Treat that request
  // as browser-navigation evidence only after the edge independently proves the
  // server-issued HttpOnly CSRF cookie matches the submitted form token.
  if (request.headers.get(ADMIN_SOFT_SUBMIT_HEADER) === '1') {
    if (!(await hasMatchingAdminCsrf(request))) return request;
    return withTrustedNavigationEvidence(request, url);
  }

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

function adminInteractionResponse() {
  return new Response(ADMIN_INTERACTION_SCRIPT, {
    status: 200,
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'no-store, max-age=0, must-revalidate',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow, noarchive',
      'cross-origin-resource-policy': 'same-origin',
      'x-rc-admin-build-surface': ADMIN_BUILD_SURFACE,
      'x-rc-admin-html-media-fix': ADMIN_HTML_MEDIA_FIX
    }
  });
}

function allowAdminInteractions(csp = '') {
  const directives = csp.split(';').map((item) => item.trim()).filter(Boolean);
  if (!directives.some((item) => item.startsWith('script-src '))) directives.push("script-src 'self'");
  if (!directives.some((item) => item.startsWith('connect-src '))) directives.push("connect-src 'self'");
  return directives.join('; ');
}

function looksLikeHtml(value = '') {
  return /^\s*(?:<!doctype\s+html\b|<html\b)/i.test(String(value));
}

function textualCandidate(contentType = '') {
  const normalized = contentType.toLowerCase();
  return normalized === '' || normalized.startsWith('text/') || normalized.includes('application/xhtml+xml');
}

function enhancedHtmlResponse(response, body) {
  const rewritten = rewriteAdminEdgeReference(body);
  const enhanced = injectAdminInteractionHtml(injectAdminResponsiveHtml(rewritten));
  const headers = copyResponseHeaders(response.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('content-security-policy', allowAdminInteractions(headers.get('content-security-policy') || ''));
  headers.set('x-rc-admin-edge-release', ADMIN_EDGE_RELEASE);
  setBuildMarkers(headers);
  return new Response(enhanced, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export async function enhanceAdminResponse(response, requestMethod) {
  if (requestMethod === 'HEAD' || BODYLESS_STATUSES.has(response.status)) {
    return markAdminBuildSurface(response);
  }

  const contentType = response.headers.get('content-type') || '';
  const declaredHtml = contentType.toLowerCase().includes('text/html');
  if (declaredHtml) {
    return enhancedHtmlResponse(response, await response.text());
  }

  // Some upstream/edge combinations can strip or downgrade the media type while
  // leaving an HTML document body intact. Only sniff responses that are already
  // textual (or have no media type); binary/private documents remain streamed.
  if (!textualCandidate(contentType)) return markAdminBuildSurface(response);

  const body = await response.text();
  if (looksLikeHtml(body)) return enhancedHtmlResponse(response, body);

  const headers = copyResponseHeaders(response.headers);
  setBuildMarkers(headers);
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function isAdminStagingUnavailable(hostname = '', env = {}) {
  return String(hostname).toLowerCase() === ADMIN_STAGING_HOST
    && String(env?.RC_ADMIN_STAGING_MODE || '').trim().toLowerCase() === ADMIN_STAGING_MODE_UNAVAILABLE;
}

export function adminStagingUnavailableResponse(requestMethod = 'GET') {
  const headers = new Headers({
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store, no-transform, max-age=0, must-revalidate',
    pragma: 'no-cache',
    expires: '0',
    'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'x-permitted-cross-domain-policies': 'none',
    'x-rc-admin-environment': 'staging',
    'x-rc-admin-staging-state': 'intentionally-unavailable',
    'retry-after': '3600'
  });
  setBuildMarkers(headers);
  const body = requestMethod === 'HEAD' ? null : 'Staging administration is intentionally unavailable.';
  return new Response(body, { status: 503, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
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
    if (isAdminStagingUnavailable(host, env)) {
      return adminStagingUnavailableResponse(request.method);
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === ADMIN_INTERACTION_PATH) {
      if (request.method === 'HEAD') {
        const response = adminInteractionResponse();
        return new Response(null, { status: response.status, headers: response.headers });
      }
      return adminInteractionResponse();
    }
    request = await normalizeAdminBrowserPost(request);
    const response = await runtime.fetch(request, env, ctx);
    return enhanceAdminResponse(response, request.method);
  }
};

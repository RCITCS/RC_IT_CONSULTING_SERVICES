import { routeNeedsJsonBody } from '../api/router.js';
import { createBackendApplication } from '../application.js';
import { assertJsonContentType, parseJsonText, readBoundedRequestText } from '../core/payload.js';

const ADMIN_PUBLIC_BASE = '/admin';
const ADMIN_UPSTREAM_ORIGIN = 'https://chsizmffzpxcqhaptjeu.supabase.co';
const ADMIN_UPSTREAM_BASE = '/functions/v1/admin-auth';

function toResponse(result) {
  return new Response(JSON.stringify(result.body), { status: result.status, headers: result.headers });
}

async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const app = createBackendApplication({ runtime: 'cloudflare-workers', env });
  let body;
  try {
    if (routeNeedsJsonBody(url.pathname, request.method)) {
      assertJsonContentType(request.headers);
      const text = await readBoundedRequestText(request, app.config.maxJsonBodyBytes);
      body = parseJsonText(text, app.config.maxJsonBodyBytes);
    }
  } catch (error) {
    return toResponse(app.failure({ method: request.method, pathname: url.pathname, headers: request.headers, error }));
  }

  const result = await app.handle({ method: request.method, pathname: url.pathname, headers: request.headers, body });
  return toResponse(result);
}

function adminGatewayHeaders(contentType = 'text/plain; charset=utf-8') {
  return new Headers({
    'content-type': contentType,
    'cache-control': 'no-store, max-age=0, must-revalidate',
    pragma: 'no-cache',
    expires: '0',
    'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload'
  });
}

function isAdminPath(pathname) {
  return pathname === ADMIN_PUBLIC_BASE || pathname.startsWith(`${ADMIN_PUBLIC_BASE}/`);
}

function adminUpstreamUrl(incomingUrl) {
  const suffix = incomingUrl.pathname === ADMIN_PUBLIC_BASE
    ? '/'
    : incomingUrl.pathname.slice(ADMIN_PUBLIC_BASE.length) || '/';
  return new URL(`${ADMIN_UPSTREAM_ORIGIN}${ADMIN_UPSTREAM_BASE}${suffix}${incomingUrl.search}`);
}

function adminCookieValues(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const combined = headers.get('set-cookie');
  return combined ? combined.split(/,(?=[^;,]+=)/g).map((value) => value.trim()) : [];
}

function rewriteAdminReference(value) {
  return value
    .replaceAll(`${ADMIN_UPSTREAM_ORIGIN}${ADMIN_UPSTREAM_BASE}`, ADMIN_PUBLIC_BASE)
    .replaceAll(ADMIN_UPSTREAM_BASE, ADMIN_PUBLIC_BASE);
}

function proxyAdminResponse(upstream, bodyText, requestMethod) {
  const headers = new Headers(upstream.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');

  const location = headers.get('location');
  if (location) headers.set('location', rewriteAdminReference(location));

  const cookies = adminCookieValues(upstream.headers);
  headers.delete('set-cookie');
  for (const cookie of cookies) {
    headers.append('set-cookie', rewriteAdminReference(cookie));
  }

  let body = bodyText;
  if (body.trimStart().toLowerCase().startsWith('<!doctype html>')) {
    body = rewriteAdminReference(body);
    headers.set('content-type', 'text/html; charset=utf-8');
  }

  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store, max-age=0, must-revalidate');
  if (!headers.has('x-robots-tag')) headers.set('x-robots-tag', 'noindex, nofollow, noarchive');

  const bodyForbidden = requestMethod === 'HEAD' || [204, 205, 304].includes(upstream.status);
  return new Response(bodyForbidden ? null : body, { status: upstream.status, headers });
}

async function handleAdminRequest(request) {
  const incomingUrl = new URL(request.url);

  if (request.method === 'POST') {
    const origin = request.headers.get('origin');
    if (!origin || origin !== incomingUrl.origin) {
      return new Response('Request rejected', { status: 403, headers: adminGatewayHeaders() });
    }
  }

  const upstreamUrl = adminUpstreamUrl(incomingUrl);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.set('x-rcitcs-admin-proxy', 'cloudflare');
  if (request.method === 'POST') headers.set('origin', ADMIN_UPSTREAM_ORIGIN);

  try {
    const upstream = await fetch(new Request(upstreamUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual'
    }));
    const bodyText = ['HEAD'].includes(request.method) ? '' : await upstream.text();
    return proxyAdminResponse(upstream, bodyText, request.method);
  } catch {
    return new Response('Administration service unavailable', {
      status: 503,
      headers: adminGatewayHeaders()
    });
  }
}

async function serveApplication(request, env) {
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApiRequest(request, env);
    if (isAdminPath(url.pathname)) return handleAdminRequest(request);
    return serveApplication(request, env);
  }
};

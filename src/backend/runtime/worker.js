import { routeNeedsJsonBody } from '../api/router.js';
import { createBackendApplication } from '../application.js';
import { assertJsonContentType, parseJsonText, readBoundedRequestText } from '../core/payload.js';
import { handlePublicCareersRequest, isPublicCareersRuntimePath } from './public-careers.js';

const ADMIN_PUBLIC_BASE = '/admin';
const ADMIN_UPSTREAM_ORIGIN = 'https://chsizmffzpxcqhaptjeu.supabase.co';
const ADMIN_UPSTREAM_BASE = '/functions/v1/admin-auth';
const ADMIN_HTML_CSP = "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
const ADMIN_UI_SCRIPT = `(() => {
  const eye = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.75"/></svg>';
  const eyeOff = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.2A10.2 10.2 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.5 3.1"/><path d="M6.1 6.2C3.7 8 2.5 12 2.5 12s3.5 6 9.5 6c1.5 0 2.8-.4 4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  for (const input of document.querySelectorAll('input[type="password"]')) {
    if (input.dataset.revealReady === 'true') continue;
    input.dataset.revealReady = 'true';
    const wrapper = document.createElement('div');
    wrapper.className = 'password-control';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'password-reveal';
    button.setAttribute('aria-label', 'Show password');
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Show password';
    button.innerHTML = eye;
    button.addEventListener('click', () => {
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
      button.setAttribute('aria-pressed', reveal ? 'true' : 'false');
      button.title = reveal ? 'Hide password' : 'Show password';
      button.innerHTML = reveal ? eyeOff : eye;
      input.focus({ preventScroll: true });
    });
    wrapper.appendChild(button);
  }
})();`;
const ADMIN_UI_STYLE = `<style>
.password-control{position:relative}.password-control input{padding-right:48px}.password-reveal{position:absolute;top:50%;right:7px;transform:translateY(-50%);width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:3px;background:transparent;color:#667085;cursor:pointer}.password-reveal:hover{background:#f4f6f8;color:#263244}.password-reveal:focus-visible{outline:3px solid rgba(47,91,211,.22);outline-offset:1px}.password-reveal svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
</style>`;
const ADMIN_UI_SCRIPT_TAG = `<script src="${ADMIN_PUBLIC_BASE}/ui.js" defer></script>`;

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
    'cache-control': 'no-store, no-transform, max-age=0, must-revalidate',
    pragma: 'no-cache',
    expires: '0',
    'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'content-security-policy': ADMIN_HTML_CSP,
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'x-permitted-cross-domain-policies': 'none'
  });
}

function isAdminPath(pathname) {
  return pathname === ADMIN_PUBLIC_BASE || pathname.startsWith(`${ADMIN_PUBLIC_BASE}/`);
}

function adminFetchMetadataAllowsNavigationPost(request) {
  return request.headers.get('sec-fetch-site') === 'same-origin'
    && request.headers.get('sec-fetch-mode') === 'navigate'
    && request.headers.get('sec-fetch-dest') === 'document'
    && request.headers.get('sec-fetch-user') === '?1';
}

export function adminOriginAllowed(request, incomingUrl) {
  const origin = request.headers.get('origin');

  if (origin && origin !== 'null') {
    try {
      return new URL(origin).origin === incomingUrl.origin;
    } catch {
      return false;
    }
  }

  return adminFetchMetadataAllowsNavigationPost(request);
}

function adminUiScriptResponse(requestMethod) {
  const headers = adminGatewayHeaders('application/javascript; charset=utf-8');
  headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  return new Response(requestMethod === 'HEAD' ? null : ADMIN_UI_SCRIPT, { status: 200, headers });
}

function adminUpstreamUrl(incomingUrl) {
  const suffix = incomingUrl.pathname === ADMIN_PUBLIC_BASE
    ? '/'
    : incomingUrl.pathname.slice(ADMIN_PUBLIC_BASE.length) || '/';
  return new URL(`${ADMIN_UPSTREAM_ORIGIN}${ADMIN_UPSTREAM_BASE}${suffix}${incomingUrl.search}`);
}

export function buildAdminUpstreamRequest(request, upstreamUrl) {
  const upstreamRequest = new Request(upstreamUrl, request);
  upstreamRequest.headers.delete('host');
  upstreamRequest.headers.delete('content-length');
  upstreamRequest.headers.set('x-rcitcs-admin-proxy', 'cloudflare');
  return upstreamRequest;
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

function enhanceAdminHtml(body) {
  let enhanced = rewriteAdminReference(body);
  if (enhanced.includes('</head>')) enhanced = enhanced.replace('</head>', `${ADMIN_UI_STYLE}</head>`);
  if (enhanced.includes('</body>')) enhanced = enhanced.replace('</body>', `${ADMIN_UI_SCRIPT_TAG}</body>`);
  return enhanced;
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
    body = enhanceAdminHtml(body);
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.set('content-security-policy', ADMIN_HTML_CSP);
    headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    headers.set('x-content-type-options', 'nosniff');
    headers.set('x-frame-options', 'DENY');
    headers.set('referrer-policy', 'no-referrer');
    headers.set('cross-origin-opener-policy', 'same-origin');
    headers.set('cross-origin-resource-policy', 'same-origin');
  }

  headers.set('cache-control', 'no-store, no-transform, max-age=0, must-revalidate');
  if (!headers.has('x-robots-tag')) headers.set('x-robots-tag', 'noindex, nofollow, noarchive');

  const bodyForbidden = requestMethod === 'HEAD' || [204, 205, 304].includes(upstream.status);
  return new Response(bodyForbidden ? null : body, { status: upstream.status, headers });
}

async function handleAdminRequest(request) {
  const incomingUrl = new URL(request.url);

  if (incomingUrl.pathname === `${ADMIN_PUBLIC_BASE}/ui.js` && ['GET', 'HEAD'].includes(request.method)) {
    return adminUiScriptResponse(request.method);
  }

  if (request.method === 'POST' && !adminOriginAllowed(request, incomingUrl)) {
    return new Response('Request rejected', { status: 403, headers: adminGatewayHeaders() });
  }

  const upstreamUrl = adminUpstreamUrl(incomingUrl);
  const upstreamRequest = buildAdminUpstreamRequest(request, upstreamUrl);

  try {
    const upstream = await fetch(upstreamRequest, { redirect: 'manual' });
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
    if (isPublicCareersRuntimePath(url.pathname)) return handlePublicCareersRequest(request, env);
    return serveApplication(request, env);
  }
};

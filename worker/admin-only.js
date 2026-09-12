import runtime from '../src/backend/runtime/worker.js';
import { injectAdminResponsiveHtml } from './admin-responsive.js';

const ADMIN_HOSTS = new Set(['admin.rcitcs.com', 'admin-staging.rcitcs.com']);
const BODYLESS_STATUSES = new Set([204, 205, 304]);

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
    const response = await runtime.fetch(request, env, ctx);
    return enhanceAdminResponse(response, request.method);
  }
};

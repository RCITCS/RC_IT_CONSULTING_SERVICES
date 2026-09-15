import runtime from '../src/backend/runtime/worker.js';
import { createCandidateApplicationGateway } from '../src/backend/providers/candidate-application-gateway.js';
import adminWorker from './admin-only.js';

const PUBLIC_PRODUCTION_ORIGIN = 'https://rcitcs.com';
const PUBLIC_PRODUCTION_HOST = 'rcitcs.com';
const WWW_PUBLIC_HOST = 'www.rcitcs.com';
const PUBLIC_ADMIN_BASE = '/admin';
const ADMIN_PRODUCTION_ORIGIN = 'https://admin.rcitcs.com';
const DEDICATED_ADMIN_HOSTS = new Set(['admin.rcitcs.com', 'admin-staging.rcitcs.com']);

export function canonicalPublicRedirect(request) {
  const incoming = new URL(request.url);
  if (incoming.hostname.toLowerCase() !== WWW_PUBLIC_HOST) return null;

  // Assign path/query onto a trusted origin instead of resolving an untrusted
  // path as a URL reference. This preserves encoded paths and query strings
  // while preventing a leading // path from becoming an open redirect.
  const target = new URL(PUBLIC_PRODUCTION_ORIGIN);
  target.pathname = incoming.pathname;
  target.search = incoming.search;

  return new Response(null, {
    status: 308,
    headers: {
      location: target.toString(),
      'x-content-type-options': 'nosniff'
    }
  });
}

function publicAdminAliasHeaders() {
  return new Headers({
    'cache-control': 'no-store, no-transform, max-age=0, must-revalidate',
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

export function publicAdminAliasRedirect(request) {
  const incoming = new URL(request.url);
  if (incoming.hostname.toLowerCase() !== PUBLIC_PRODUCTION_HOST) return null;
  if (incoming.pathname !== PUBLIC_ADMIN_BASE && !incoming.pathname.startsWith(`${PUBLIC_ADMIN_BASE}/`)) return null;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Not Found', {
      status: 404,
      headers: publicAdminAliasHeaders()
    });
  }

  const suffix = incoming.pathname === PUBLIC_ADMIN_BASE
    ? '/'
    : incoming.pathname.slice(PUBLIC_ADMIN_BASE.length) || '/';

  // Never resolve the untrusted suffix as a URL reference. Assign it as a path
  // on the pinned production-admin origin so /admin//example.invalid cannot
  // become a protocol-relative open redirect.
  const target = new URL(ADMIN_PRODUCTION_ORIGIN);
  target.pathname = suffix;
  target.search = incoming.search;

  const headers = publicAdminAliasHeaders();
  headers.set('location', target.toString());
  return new Response(null, { status: 308, headers });
}

export function legacyAdminRedirect(request) {
  const url = new URL(request.url);
  if (!DEDICATED_ADMIN_HOSTS.has(url.hostname.toLowerCase())) return null;
  if (url.pathname !== '/admin' && !url.pathname.startsWith('/admin/')) return null;

  const suffix = url.pathname === '/admin' ? '/' : url.pathname.slice('/admin'.length) || '/';
  url.pathname = suffix;

  const headers = new Headers({
    location: url.toString(),
    'cache-control': 'no-store, max-age=0, must-revalidate',
    'x-robots-tag': 'noindex, nofollow, noarchive',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer'
  });

  // Existing Phase 11 bookmarks/sessions may still live under /admin. Move only
  // safe navigation requests to the canonical dedicated-host route. Mutating
  // legacy requests must be reloaded from the canonical portal so CSRF/session
  // authority is re-established at Path=/ rather than silently replayed.
  if (request.method === 'GET' || request.method === 'HEAD') {
    return new Response(null, { status: 308, headers });
  }

  return new Response('Reload the administration portal and try again.', {
    status: 409,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const canonical = canonicalPublicRedirect(request);
    if (canonical) return canonical;

    const publicAdmin = publicAdminAliasRedirect(request);
    if (publicAdmin) return publicAdmin;

    const legacy = legacyAdminRedirect(request);
    if (legacy) return legacy;

    const host = new URL(request.url).hostname.toLowerCase();
    if (DEDICATED_ADMIN_HOSTS.has(host)) {
      return adminWorker.fetch(request, env, ctx);
    }

    return runtime.fetch(request, env, ctx);
  },
  scheduled(_controller, env, ctx) {
    const gateway = createCandidateApplicationGateway({ env, runtime: 'cloudflare-workers' });
    ctx.waitUntil(gateway.cleanupExpired({ limit: 25 }));
  }
};

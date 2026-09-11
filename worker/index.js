import runtime from '../src/backend/runtime/worker.js';
import { createCandidateApplicationGateway } from '../src/backend/providers/candidate-application-gateway.js';

const DEDICATED_ADMIN_HOSTS = new Set(['admin.rcitcs.com', 'admin-staging.rcitcs.com']);

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
    const legacy = legacyAdminRedirect(request);
    if (legacy) return legacy;
    return runtime.fetch(request, env, ctx);
  },
  scheduled(_controller, env, ctx) {
    const gateway = createCandidateApplicationGateway({ env, runtime: 'cloudflare-workers' });
    ctx.waitUntil(gateway.cleanupExpired({ limit: 25 }));
  }
};

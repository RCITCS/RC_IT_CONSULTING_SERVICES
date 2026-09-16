import adminWorker, {
  ADMIN_BUILD_SURFACE,
  ADMIN_HTML_MEDIA_FIX,
  ADMIN_TRANSPORT_SECURITY_POLICY
} from './admin-only.js';

const ADMIN_PRODUCTION_HOST = 'admin.rcitcs.com';
const LEGACY_ADMIN_BASE = '/admin';

function legacyRedirectHeaders(location) {
  return new Headers({
    location,
    'cache-control': 'no-store, no-transform, max-age=0, must-revalidate',
    pragma: 'no-cache',
    expires: '0',
    'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    'strict-transport-security': ADMIN_TRANSPORT_SECURITY_POLICY,
    'x-rc-admin-environment': 'production',
    'x-rc-admin-build-surface': ADMIN_BUILD_SURFACE,
    'x-rc-admin-html-media-fix': ADMIN_HTML_MEDIA_FIX
  });
}

export function productionAdminLegacyRedirect(request) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:') return null;
  if (url.hostname.toLowerCase() !== ADMIN_PRODUCTION_HOST) return null;
  if (url.pathname !== LEGACY_ADMIN_BASE && !url.pathname.startsWith(`${LEGACY_ADMIN_BASE}/`)) return null;

  const suffix = url.pathname === LEGACY_ADMIN_BASE
    ? '/'
    : url.pathname.slice(LEGACY_ADMIN_BASE.length) || '/';
  url.pathname = suffix;

  const headers = legacyRedirectHeaders(url.toString());
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
    // Staging never uses this entrypoint. HTTP requests are deliberately passed
    // through so admin-only.js remains the single authority for HTTPS upgrade.
    const legacyRedirect = productionAdminLegacyRedirect(request);
    if (legacyRedirect) return legacyRedirect;
    return adminWorker.fetch(request, env, ctx);
  }
};

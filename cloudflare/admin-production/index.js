// Keep this entrypoint inside the dedicated Cloudflare Builds root so changes to
// the production-admin deployment surface trigger its monorepo watch path.
// Runtime authority remains in worker/admin-only.js and is imported from the
// exact mirrored main commit that Cloudflare builds.
import adminWorker from '../../worker/admin-only.js';

const ADMIN_BUILD_SURFACE = 'phase16-security-closure-v1';
const RECOVERY_COOKIE_NAMES = [
  'rcitcs_admin_recovery=',
  'rcitcs_admin_recovery_csrf='
];

function setCookieValues(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const combined = headers.get('set-cookie');
  return combined ? combined.split(/,(?=[^;,]+=)/g).map((value) => value.trim()) : [];
}

function isRecoveryCookie(cookie) {
  return RECOVERY_COOKIE_NAMES.some((name) => cookie.startsWith(name));
}

function rewriteRecoveryCookie(cookie) {
  if (!isRecoveryCookie(cookie)) return cookie;
  return cookie
    .replace(/SameSite=Strict/gi, 'SameSite=Lax')
    .replace(/Max-Age=600(?=;|$)/gi, 'Max-Age=1800');
}

function adaptProductionAdminResponse(response) {
  const cookies = setCookieValues(response.headers);
  const headers = new Headers(response.headers);

  if (cookies.length) {
    headers.delete('set-cookie');
    for (const cookie of cookies.map(rewriteRecoveryCookie)) headers.append('set-cookie', cookie);
  }

  // This marker is emitted only by the dedicated Cloudflare production-admin
  // build root. It lets production acceptance distinguish the intended edge
  // proxy from a direct/raw Supabase admin-auth response.
  headers.set('x-rc-admin-build-surface', ADMIN_BUILD_SURFACE);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const response = await adminWorker.fetch(request, env, ctx);
    return adaptProductionAdminResponse(response);
  }
};

// Keep this entrypoint inside the dedicated Cloudflare Builds root so changes to
// the production-admin deployment surface trigger its monorepo watch path.
// Runtime authority remains in worker/admin-only.js and is imported from the
// exact mirrored main commit that Cloudflare builds.
import adminWorker from '../../worker/admin-only.js';

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

function adaptRecoveryCookieHandoff(response) {
  const cookies = setCookieValues(response.headers);
  if (!cookies.length) return response;

  const rewritten = cookies.map(rewriteRecoveryCookie);
  if (rewritten.every((cookie, index) => cookie === cookies[index])) return response;

  const headers = new Headers(response.headers);
  headers.delete('set-cookie');
  for (const cookie of rewritten) headers.append('set-cookie', cookie);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const response = await adminWorker.fetch(request, env, ctx);
    return adaptRecoveryCookieHandoff(response);
  }
};

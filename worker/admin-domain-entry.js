import applicationWorker from './index.js';

const ADMIN_HOSTS = new Set([
  'admin.rcitcs.com',
  'admin-staging.rcitcs.com'
]);

export function isDedicatedAdminHost(hostname = '') {
  return ADMIN_HOSTS.has(String(hostname).toLowerCase());
}

export function mapDedicatedAdminUrl(input) {
  const url = input instanceof URL ? new URL(input.href) : new URL(String(input));
  if (!isDedicatedAdminHost(url.hostname)) return null;

  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return url;
  url.pathname = url.pathname === '/' ? '/admin' : `/admin${url.pathname}`;
  return url;
}

export default {
  async fetch(request, env, ctx) {
    const mappedUrl = mapDedicatedAdminUrl(request.url);
    if (!mappedUrl) return applicationWorker.fetch(request, env, ctx);

    const mappedRequest = new Request(mappedUrl, request);
    return applicationWorker.fetch(mappedRequest, env, ctx);
  }
};

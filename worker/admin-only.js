import runtime from '../src/backend/runtime/worker.js';

const ADMIN_HOSTS = new Set(['admin.rcitcs.com', 'admin-staging.rcitcs.com']);

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
    return runtime.fetch(request, env, ctx);
  }
};

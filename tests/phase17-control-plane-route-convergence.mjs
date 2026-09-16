import assert from 'node:assert/strict';
import {
  LEGACY_ADMIN_WORKER_ROUTES,
  RCITCS_ADMIN_ROUTE_CONVERGENCE_TARGET,
  RCITCS_CLOUDFLARE_ZONE_ID,
  convergeLegacyAdminWorkerRoutes,
  shouldConvergeLegacyAdminRoutes
} from '../scripts/converge-cloudflare-worker-routes.mjs';

function apiResponse(result, status = 200) {
  return new Response(JSON.stringify({ success: status >= 200 && status < 300, result, errors: [] }), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

const targetEnv = {
  WORKERS_CI: '1',
  WORKERS_CI_BRANCH: 'main',
  WRANGLER_CI_OVERRIDE_NAME: RCITCS_ADMIN_ROUTE_CONVERGENCE_TARGET,
  CLOUDFLARE_API_TOKEN: 'test-token'
};

assert.equal(RCITCS_CLOUDFLARE_ZONE_ID, 'cf815244b9dbd51a490747f597867c68');
assert.deepEqual(LEGACY_ADMIN_WORKER_ROUTES, [
  { pattern: 'admin.rcitcs.com/*', expectedScript: 'rc-it-consulting-services' },
  { pattern: 'admin-staging.rcitcs.com/*', expectedScript: 'rcitcs-admin-staging' }
]);
assert.equal(shouldConvergeLegacyAdminRoutes(targetEnv), true);
assert.equal(shouldConvergeLegacyAdminRoutes({ ...targetEnv, WORKERS_CI_BRANCH: 'feature/test' }), false);
assert.equal(shouldConvergeLegacyAdminRoutes({ ...targetEnv, WRANGLER_CI_OVERRIDE_NAME: 'rc-it-consulting-services' }), false);
assert.equal(shouldConvergeLegacyAdminRoutes({ ...targetEnv, WRANGLER_CI: '0' }), false);

{
  let called = false;
  const result = await convergeLegacyAdminWorkerRoutes({
    env: { ...targetEnv, WORKERS_CI_BRANCH: 'feature/test' },
    fetchImpl: async () => {
      called = true;
      throw new Error('Preview builds must not call Cloudflare route APIs.');
    }
  });
  assert.deepEqual(result, { skipped: true, deleted: [] });
  assert.equal(called, false);
}

{
  const calls = [];
  let listCount = 0;
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: options.method });
    if (options.method === 'GET') {
      listCount += 1;
      if (listCount === 1) {
        return apiResponse([
          { id: 'route-admin', pattern: 'admin.rcitcs.com/*', script: 'rc-it-consulting-services' },
          { id: 'route-staging', pattern: 'admin-staging.rcitcs.com/*', script: 'rcitcs-admin-staging' },
          { id: 'unrelated', pattern: 'api.example.com/*', script: 'unrelated-worker' }
        ]);
      }
      return apiResponse([{ id: 'unrelated', pattern: 'api.example.com/*', script: 'unrelated-worker' }]);
    }
    if (options.method === 'DELETE' && url.endsWith('/route-admin')) return apiResponse({ id: 'route-admin' });
    if (options.method === 'DELETE' && url.endsWith('/route-staging')) return apiResponse({ id: 'route-staging' });
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const result = await convergeLegacyAdminWorkerRoutes({ env: targetEnv, fetchImpl });
  assert.equal(result.skipped, false);
  assert.deepEqual(result.deleted, ['admin.rcitcs.com/*', 'admin-staging.rcitcs.com/*']);
  assert.equal(calls.filter((call) => call.method === 'DELETE').length, 2);
  assert.equal(calls.some((call) => call.url.endsWith('/unrelated')), false);
}

{
  let deletes = 0;
  const fetchImpl = async (_url, options = {}) => {
    if (options.method === 'DELETE') deletes += 1;
    return apiResponse([]);
  };
  const result = await convergeLegacyAdminWorkerRoutes({ env: targetEnv, fetchImpl });
  assert.deepEqual(result, { skipped: false, deleted: [] });
  assert.equal(deletes, 0);
}

{
  let deletes = 0;
  const fetchImpl = async (_url, options = {}) => {
    if (options.method === 'DELETE') deletes += 1;
    return apiResponse([
      { id: 'unexpected-owner', pattern: 'admin.rcitcs.com/*', script: 'unexpected-worker' }
    ]);
  };
  await assert.rejects(
    convergeLegacyAdminWorkerRoutes({ env: targetEnv, fetchImpl }),
    /Refusing route convergence: admin\.rcitcs\.com\/\* is owned by unexpected-worker/
  );
  assert.equal(deletes, 0);
}

{
  const fetchImpl = async () => apiResponse([
    { id: 'a', pattern: 'admin.rcitcs.com/*', script: 'rc-it-consulting-services' },
    { id: 'b', pattern: 'admin.rcitcs.com/*', script: 'rc-it-consulting-services' }
  ]);
  await assert.rejects(
    convergeLegacyAdminWorkerRoutes({ env: targetEnv, fetchImpl }),
    /duplicate Worker Routes exist for admin\.rcitcs\.com\/\*/
  );
}

await assert.rejects(
  convergeLegacyAdminWorkerRoutes({ env: { ...targetEnv, CLOUDFLARE_API_TOKEN: '' }, fetchImpl: async () => apiResponse([]) }),
  /requires CLOUDFLARE_API_TOKEN/
);

console.log('PASS: Phase 17 control-plane route convergence is targeted, idempotent and fail-closed.');

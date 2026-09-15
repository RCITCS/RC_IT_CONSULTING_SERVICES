import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adminWorker, {
  adminStagingUnavailableResponse,
  isAdminStagingUnavailable
} from '../worker/admin-only.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const staging = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.admin-staging.jsonc'), 'utf8'));
const production = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.admin-production.jsonc'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'worker/admin-only.js'), 'utf8');

assert.equal(staging.name, 'rcitcs-admin-staging');
assert.equal(staging.main, './worker/admin-only.js');
assert.equal(staging.workers_dev, false, 'Staging admin must not expose workers.dev.');
assert.equal(staging.keep_vars, true);
assert.equal(staging.vars?.RC_ADMIN_ENVIRONMENT, 'staging');
assert.equal(staging.vars?.RC_ADMIN_STAGING_MODE, 'unavailable');

assert.equal(production.name, 'rcitcs-admin-production');
assert.equal(Object.hasOwn(production.vars || {}, 'RC_ADMIN_STAGING_MODE'), false, 'Production config must not inherit staging-unavailable mode.');

assert.equal(isAdminStagingUnavailable('admin-staging.rcitcs.com', staging.vars), true);
assert.equal(isAdminStagingUnavailable('ADMIN-STAGING.RCITCS.COM', staging.vars), true);
assert.equal(isAdminStagingUnavailable('admin.rcitcs.com', staging.vars), false, 'Shared connected Worker must not block the production hostname before 17.7 cutover.');
assert.equal(isAdminStagingUnavailable('admin-staging.rcitcs.com', {}), false, 'Unavailable behavior must be an explicit staging deployment policy.');

for (const method of ['GET', 'HEAD', 'POST']) {
  const response = adminStagingUnavailableResponse(method);
  assert.equal(response.status, 503, `${method} staging response must be intentionally unavailable.`);
  assert.match(response.headers.get('cache-control') || '', /no-store/i);
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/i);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy') || '', /default-src 'none'/);
  assert.match(response.headers.get('strict-transport-security') || '', /max-age=31536000/);
  assert.equal(response.headers.get('x-rc-admin-environment'), 'staging');
  assert.equal(response.headers.get('x-rc-admin-staging-state'), 'intentionally-unavailable');
  assert.equal(response.headers.has('set-cookie'), false, 'Unavailable staging must not create or refresh an admin session.');
  assert.equal(response.headers.has('location'), false, 'Unavailable staging must not redirect into production.');
  const body = await response.text();
  if (method === 'HEAD') assert.equal(body, '');
  else assert.equal(body, 'Staging administration is intentionally unavailable.');
}

const livePolicyResponse = await adminWorker.fetch(
  new Request('https://admin-staging.rcitcs.com/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'email=x&password=x'
  }),
  staging.vars,
  { waitUntil() {} }
);
assert.equal(livePolicyResponse.status, 503, 'Staging policy must intercept mutations before auth/runtime processing.');
assert.equal(livePolicyResponse.headers.get('x-rc-admin-staging-state'), 'intentionally-unavailable');
assert.equal(livePolicyResponse.headers.has('set-cookie'), false);

assert.ok(source.indexOf('isAdminStagingUnavailable(host, env)') < source.indexOf('normalizeAdminBrowserPost(request)'), 'Staging isolation must run before admin auth/runtime processing.');

console.log('Phase 17.5 admin staging isolation contract: PASS');
console.log('admin-staging.rcitcs.com is intentionally unavailable until an independently isolated staging data/runtime plane is approved.');
console.log('admin.rcitcs.com remains unaffected by the host-specific staging policy pending 17.7 ownership convergence.');

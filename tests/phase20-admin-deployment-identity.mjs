import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeWorkersCommitSha,
  withAdminDeploymentIdentity
} from '../scripts/configure-cloudflare-workers-build.mjs';
import adminWorker, {
  ADMIN_DEPLOYMENT_SHA_HEADER,
  adminStagingUnavailableResponse,
  enhanceAdminResponse,
  normalizeAdminDeploymentSha
} from '../worker/admin-only.js';
import { productionAdminLegacyRedirect } from '../worker/admin-production.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const productionConfig = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.admin-production.jsonc'), 'utf8'));
const stagingConfig = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.admin-staging.jsonc'), 'utf8'));
const publicConfig = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8'));
const SHA = '0123456789abcdef0123456789abcdef01234567';
const FORGED_UPSTREAM_SHA = 'f'.repeat(40);

assert.equal(normalizeWorkersCommitSha(SHA.toUpperCase()), SHA);
assert.equal(normalizeWorkersCommitSha('not-a-sha'), null);
assert.equal(normalizeAdminDeploymentSha(SHA.toUpperCase()), SHA);
assert.equal(normalizeAdminDeploymentSha('short'), null);

const productionDeployment = withAdminDeploymentIdentity('rcitcs-admin-production', productionConfig, SHA.toUpperCase());
assert.equal(productionDeployment.vars.RC_ADMIN_DEPLOYMENT_SHA, SHA);
assert.equal(productionDeployment.vars.RC_ADMIN_ENVIRONMENT, 'production');
assert.equal(Object.hasOwn(productionConfig.vars, 'RC_ADMIN_DEPLOYMENT_SHA'), false, 'Static production config must not hard-code a release SHA.');

const stagingDeployment = withAdminDeploymentIdentity('rcitcs-admin-staging', stagingConfig, SHA);
assert.equal(stagingDeployment.vars.RC_ADMIN_DEPLOYMENT_SHA, SHA);
assert.equal(stagingDeployment.vars.RC_ADMIN_ENVIRONMENT, 'staging');
assert.equal(stagingDeployment.vars.RC_ADMIN_STAGING_MODE, 'unavailable');
assert.equal(Object.hasOwn(stagingConfig.vars, 'RC_ADMIN_DEPLOYMENT_SHA'), false, 'Static staging config must not hard-code a release SHA.');

const publicDeployment = withAdminDeploymentIdentity('rc-it-consulting-services', publicConfig, SHA);
assert.equal(Object.hasOwn(publicDeployment.vars || {}, 'RC_ADMIN_DEPLOYMENT_SHA'), false, 'Public Worker must not receive the admin deployment identity variable.');
assert.throws(
  () => withAdminDeploymentIdentity('rcitcs-admin-production', productionConfig, ''),
  /missing a valid 40-character WORKERS_CI_COMMIT_SHA/,
  'An admin Workers Build without exact commit identity must fail closed.'
);

const enhanced = await enhanceAdminResponse(
  new Response('{"authenticated":false}', { status: 401, headers: { 'content-type': 'application/json' } }),
  'GET',
  { RC_ADMIN_ENVIRONMENT: 'production', RC_ADMIN_DEPLOYMENT_SHA: SHA }
);
assert.equal(enhanced.headers.get(ADMIN_DEPLOYMENT_SHA_HEADER), SHA);
assert.equal(enhanced.headers.get('x-rc-admin-environment'), 'production');

const forgedEnhanced = await enhanceAdminResponse(
  new Response('ok', {
    status: 200,
    headers: {
      'content-type': 'text/plain',
      [ADMIN_DEPLOYMENT_SHA_HEADER]: FORGED_UPSTREAM_SHA
    }
  }),
  'GET',
  { RC_ADMIN_ENVIRONMENT: 'production', RC_ADMIN_DEPLOYMENT_SHA: SHA }
);
assert.equal(
  forgedEnhanced.headers.get(ADMIN_DEPLOYMENT_SHA_HEADER),
  SHA,
  'A valid local build identity must replace any upstream deployment marker.'
);

const invalidEnhanced = await enhanceAdminResponse(
  new Response('ok', {
    status: 200,
    headers: {
      'content-type': 'text/plain',
      [ADMIN_DEPLOYMENT_SHA_HEADER]: FORGED_UPSTREAM_SHA
    }
  }),
  'GET',
  { RC_ADMIN_ENVIRONMENT: 'production', RC_ADMIN_DEPLOYMENT_SHA: 'invalid' }
);
assert.equal(
  invalidEnhanced.headers.has(ADMIN_DEPLOYMENT_SHA_HEADER),
  false,
  'Invalid local identity must fail closed and must not preserve an upstream deployment marker.'
);

for (const method of ['GET', 'HEAD', 'POST']) {
  const response = adminStagingUnavailableResponse(method, {
    RC_ADMIN_ENVIRONMENT: 'staging',
    RC_ADMIN_STAGING_MODE: 'unavailable',
    RC_ADMIN_DEPLOYMENT_SHA: SHA
  });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get(ADMIN_DEPLOYMENT_SHA_HEADER), SHA);
  assert.equal(response.headers.get('x-rc-admin-environment'), 'staging');
}

const stagingRuntime = await adminWorker.fetch(
  new Request('https://admin-staging.rcitcs.com/'),
  {
    RC_ADMIN_ENVIRONMENT: 'staging',
    RC_ADMIN_STAGING_MODE: 'unavailable',
    RC_ADMIN_DEPLOYMENT_SHA: SHA
  },
  { waitUntil() {} }
);
assert.equal(stagingRuntime.status, 503);
assert.equal(stagingRuntime.headers.get(ADMIN_DEPLOYMENT_SHA_HEADER), SHA);

const legacy = productionAdminLegacyRedirect(
  new Request('https://admin.rcitcs.com/admin/applications'),
  { RC_ADMIN_DEPLOYMENT_SHA: SHA }
);
assert.equal(legacy.status, 308);
assert.equal(legacy.headers.get(ADMIN_DEPLOYMENT_SHA_HEADER), SHA);
assert.equal(legacy.headers.get('x-rc-admin-environment'), 'production');

console.log('Phase 20 admin exact-deployment identity contract passed.');

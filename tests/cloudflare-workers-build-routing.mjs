import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORKERS_BUILD_CONFIG, resolveWorkersBuildConfig } from '../scripts/configure-cloudflare-workers-build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.deepEqual(WORKERS_BUILD_CONFIG, {
  'rc-it-consulting-services': 'wrangler.jsonc',
  'rcitcs-admin-staging': 'wrangler.admin-staging.jsonc',
  'rcitcs-admin-production': 'wrangler.admin-production.jsonc',
  rcitcservices: 'cloudflare/legacy-rcitcservices/wrangler.jsonc'
});

assert.equal(resolveWorkersBuildConfig('rc-it-consulting-services'), 'wrangler.jsonc');
assert.equal(resolveWorkersBuildConfig('rcitcs-admin-staging'), 'wrangler.admin-staging.jsonc');
assert.equal(resolveWorkersBuildConfig('rcitcs-admin-production'), 'wrangler.admin-production.jsonc');
assert.equal(resolveWorkersBuildConfig('rcitcservices'), 'cloudflare/legacy-rcitcservices/wrangler.jsonc');
assert.equal(resolveWorkersBuildConfig(''), null);
assert.throws(() => resolveWorkersBuildConfig('unexpected-worker'), /Refusing to deploy with the wrong Wrangler configuration/);

const [buildSource, publicConfigRaw, stagingRaw, productionRaw, legacyRaw] = await Promise.all([
  readFile(path.join(root, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(root, 'wrangler.jsonc'), 'utf8'),
  readFile(path.join(root, 'wrangler.admin-staging.jsonc'), 'utf8'),
  readFile(path.join(root, 'wrangler.admin-production.jsonc'), 'utf8'),
  readFile(path.join(root, 'cloudflare/legacy-rcitcservices/wrangler.jsonc'), 'utf8')
]);

assert.ok(buildSource.includes("import { configureWorkersBuild } from './configure-cloudflare-workers-build.mjs';"));
assert.ok(buildSource.includes('await configureWorkersBuild();'));

const publicConfig = JSON.parse(publicConfigRaw);
const stagingConfig = JSON.parse(stagingRaw);
const productionConfig = JSON.parse(productionRaw);
const legacyConfig = JSON.parse(legacyRaw);

assert.equal(publicConfig.name, 'rc-it-consulting-services');
assert.deepEqual(publicConfig.secrets?.required, ['SUPABASE_SECRET_KEY']);
assert.deepEqual(
  publicConfig.routes?.map((route) => [route.pattern, route.custom_domain]),
  [['rcitcs.com', true], ['www.rcitcs.com', true]],
  'Public Worker must own only the apex and www public Custom Domains.'
);
assert.equal(
  publicConfig.routes?.some((route) => /^admin(?:-staging)?\.rcitcs\.com/.test(String(route.pattern || ''))),
  false,
  'Public Worker must never claim an admin hostname.'
);

assert.equal(stagingConfig.name, 'rcitcs-admin-staging');
assert.equal(stagingConfig.main, './worker/admin-only.js');
assert.equal(stagingConfig.workers_dev, false);
assert.equal(stagingConfig.keep_vars, true);
assert.equal(stagingConfig.vars?.RC_ADMIN_ENVIRONMENT, 'staging');
assert.equal(stagingConfig.vars?.RC_ADMIN_STAGING_MODE, 'unavailable');
assert.equal(Object.hasOwn(stagingConfig, 'secrets'), false, 'Staging admin edge must not inherit the public Worker secret requirement.');
assert.deepEqual(
  stagingConfig.routes?.map((route) => [route.pattern, route.custom_domain]),
  [['admin-staging.rcitcs.com', true]],
  'Staging Worker must own only admin-staging.rcitcs.com after Phase 17.7 convergence.'
);

assert.equal(productionConfig.name, 'rcitcs-admin-production');
assert.equal(productionConfig.main, './worker/admin-only.js');
assert.equal(productionConfig.workers_dev, false);
assert.equal(productionConfig.keep_vars, true);
assert.equal(productionConfig.vars?.RC_ADMIN_ENVIRONMENT, 'production');
assert.equal(Object.hasOwn(productionConfig.vars || {}, 'RC_ADMIN_STAGING_MODE'), false);
assert.equal(Object.hasOwn(productionConfig, 'secrets'), false, 'Production admin edge must not inherit the public Worker secret requirement.');
assert.deepEqual(
  productionConfig.routes?.map((route) => [route.pattern, route.custom_domain]),
  [['admin.rcitcs.com', true]],
  'Production admin Worker must own only admin.rcitcs.com.'
);

assert.equal(legacyConfig.name, 'rcitcservices');
assert.equal(legacyConfig.workers_dev, false);
assert.equal(legacyConfig.keep_vars, true);
assert.equal(Object.hasOwn(legacyConfig, 'routes'), false, 'Worker in the old Cloudflare account must not claim company production domains.');
assert.equal(Object.hasOwn(legacyConfig, 'secrets'), false, 'Legacy Worker must not require company production secrets.');

console.log('PASS: Phase 17.7 source ownership is one Worker per hostname: public apex/www, production admin, isolated staging admin, and no company domains on the legacy Worker.');

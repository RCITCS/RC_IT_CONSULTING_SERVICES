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

const [buildSource, publicConfigRaw, stagingRaw, productionRaw, adminConnectedRaw, adminConnectedEntrypoint] = await Promise.all([
  readFile(path.join(root, 'scripts/build.mjs'), 'utf8'),
  readFile(path.join(root, 'wrangler.jsonc'), 'utf8'),
  readFile(path.join(root, 'wrangler.admin-staging.jsonc'), 'utf8'),
  readFile(path.join(root, 'wrangler.admin-production.jsonc'), 'utf8'),
  readFile(path.join(root, 'cloudflare/legacy-rcitcservices/wrangler.jsonc'), 'utf8'),
  readFile(path.join(root, 'cloudflare/legacy-rcitcservices/index.js'), 'utf8')
]);

assert.ok(buildSource.includes("import { configureWorkersBuild } from './configure-cloudflare-workers-build.mjs';"));
assert.ok(buildSource.includes('await configureWorkersBuild();'));

const publicConfig = JSON.parse(publicConfigRaw);
const stagingConfig = JSON.parse(stagingRaw);
const productionConfig = JSON.parse(productionRaw);
const adminConnectedConfig = JSON.parse(adminConnectedRaw);

assert.equal(publicConfig.name, 'rc-it-consulting-services');
assert.deepEqual(publicConfig.secrets?.required, ['SUPABASE_SECRET_KEY']);
assert.equal(publicConfig.routes?.length, 1, 'Public Worker must own only the public apex Custom Domain.');
assert.equal(publicConfig.routes?.[0]?.pattern, 'rcitcs.com');
assert.equal(publicConfig.routes?.[0]?.custom_domain, true);
assert.equal(publicConfig.routes?.some((route) => String(route.pattern || '').startsWith('admin.rcitcs.com')), false, 'Public Worker must never claim the admin hostname.');

assert.equal(stagingConfig.name, 'rcitcs-admin-staging');
assert.equal(stagingConfig.main, './worker/admin-only.js');
assert.equal(stagingConfig.keep_vars, true);
assert.equal(Object.hasOwn(stagingConfig, 'secrets'), false, 'Staging admin edge must not inherit the public Worker secret requirement.');

assert.equal(productionConfig.name, 'rcitcs-admin-production');
assert.equal(productionConfig.main, './worker/admin-only.js');
assert.equal(productionConfig.keep_vars, true);
assert.equal(Object.hasOwn(productionConfig, 'secrets'), false, 'Production admin edge must not inherit the public Worker secret requirement.');

assert.equal(adminConnectedConfig.name, 'rcitcservices');
assert.equal(adminConnectedConfig.workers_dev, false);
assert.equal(adminConnectedConfig.keep_vars, true);
assert.equal(Object.hasOwn(adminConnectedConfig, 'secrets'), false, 'Connected admin edge must not require the public Worker secret.');
assert.equal(adminConnectedConfig.routes?.length, 1, 'Connected admin Worker must own exactly one Custom Domain.');
assert.equal(adminConnectedConfig.routes?.[0]?.pattern, 'admin.rcitcs.com');
assert.equal(adminConnectedConfig.routes?.[0]?.custom_domain, true, 'Connected admin Worker must provision admin.rcitcs.com DNS/certificate as a Custom Domain.');
assert.ok(adminConnectedEntrypoint.includes("import adminWorker from '../../worker/admin-only.js';"));
assert.ok(adminConnectedEntrypoint.includes('export default adminWorker;'));

console.log('PASS: Cloudflare Workers Builds keeps rcitcs.com on the public Worker and admin.rcitcs.com on the isolated connected admin Worker without cross-target secret or route leakage.');

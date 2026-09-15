import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [worker, publicEntrypoint, wrangler, productionAdminWrangler, stagingAdminWrangler, legacyWrangler, domainWorkflow] = await Promise.all([
  readFile(path.join(root, 'src/backend/runtime/worker.js'), 'utf8'),
  readFile(path.join(root, 'worker/index.js'), 'utf8'),
  readFile(path.join(root, 'wrangler.jsonc'), 'utf8'),
  readFile(path.join(root, 'wrangler.admin-production.jsonc'), 'utf8'),
  readFile(path.join(root, 'wrangler.admin-staging.jsonc'), 'utf8'),
  readFile(path.join(root, 'cloudflare/legacy-rcitcservices/wrangler.jsonc'), 'utf8'),
  readFile(path.join(root, '.github/workflows/admin-portal-domain-smoke.yml'), 'utf8')
]);

for (const contract of [
  "const ADMIN_PRODUCTION_ORIGIN = 'https://admin.rcitcs.com'",
  "new Set(['admin.rcitcs.com', 'admin-staging.rcitcs.com'])",
  'function enhanceAdminNavigation',
  '<span>Applications</span>',
  "if (isDedicatedAdminHost(url.hostname)) return handleAdminRequest(request)",
  "if (isAdminPath(url.pathname)) return redirectPublicAdminAlias(request, url)",
  "headers.set('location', target.toString())"
]) assert.ok(worker.includes(contract), `Dedicated admin routing contract missing: ${contract}`);

assert.ok(publicEntrypoint.includes("import adminWorker from './admin-only.js'"), 'Public bundle may retain the hardened admin fallback implementation, but routing must not expose it on admin.rcitcs.com.');

const publicConfig = JSON.parse(wrangler);
const productionAdminConfig = JSON.parse(productionAdminWrangler);
const stagingAdminConfig = JSON.parse(stagingAdminWrangler);
const legacyConfig = JSON.parse(legacyWrangler);

assert.ok(Array.isArray(publicConfig.assets?.run_worker_first));
assert.ok(publicConfig.assets.run_worker_first.includes('/*'), 'Public Worker must run before assets for dynamic Careers/API routing.');
assert.equal(publicConfig.workers_dev, true, 'Primary public Worker remains reachable on its workers.dev deployment until the later Phase-17 exposure-hardening module.');
assert.deepEqual(
  publicConfig.routes?.map((route) => [route.pattern, route.custom_domain]),
  [['rcitcs.com', true], ['www.rcitcs.com', true]],
  'Public Worker must own only the apex and www public Custom Domains.'
);
assert.equal(
  publicConfig.routes?.some((route) => /^admin(?:-staging)?\.rcitcs\.com/.test(String(route.pattern || ''))),
  false,
  'Public Worker must never own or route a dedicated admin hostname.'
);

assert.equal(productionAdminConfig.name, 'rcitcs-admin-production');
assert.equal(productionAdminConfig.workers_dev, false);
assert.equal(productionAdminConfig.vars?.RC_ADMIN_ENVIRONMENT, 'production');
assert.deepEqual(
  productionAdminConfig.routes?.map((route) => [route.pattern, route.custom_domain]),
  [['admin.rcitcs.com', true]],
  'Canonical production admin Worker must own only admin.rcitcs.com.'
);

assert.equal(stagingAdminConfig.name, 'rcitcs-admin-staging');
assert.equal(stagingAdminConfig.workers_dev, false);
assert.equal(stagingAdminConfig.vars?.RC_ADMIN_ENVIRONMENT, 'staging');
assert.equal(stagingAdminConfig.vars?.RC_ADMIN_STAGING_MODE, 'unavailable');
assert.deepEqual(
  stagingAdminConfig.routes?.map((route) => [route.pattern, route.custom_domain]),
  [['admin-staging.rcitcs.com', true]],
  'Admin staging Worker must own only admin-staging.rcitcs.com after Phase 17.7 convergence.'
);

assert.equal(legacyConfig.name, 'rcitcservices');
assert.equal(Object.hasOwn(legacyConfig, 'routes'), false, 'Old-account Worker must not claim any company domain.');

for (const expected of [
  "ADMIN='https://admin.rcitcs.com'",
  "ADMIN_STAGING='https://admin-staging.rcitcs.com'",
  '! grep -q \'Technology that moves business forward\'',
  'action="/login"',
  "PUBLIC='https://rcitcs.com'",
  'Production admin routes remain private and host-local'
]) assert.ok(domainWorkflow.includes(expected), `Admin domain release gate missing: ${expected}`);

assert.ok(!worker.includes("ADMIN_PRODUCTION_ORIGIN = 'https://rcitcservices.frsmkgit.workers.dev"), 'workers.dev must not be the company admin origin.');
console.log('PASS: rcitcs.com/www stay public, admin.rcitcs.com belongs only to rcitcs-admin-production, admin-staging belongs only to rcitcs-admin-staging, and no legacy Worker owns a company hostname.');

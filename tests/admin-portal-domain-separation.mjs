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

assert.ok(publicEntrypoint.includes("import adminWorker from './admin-only.js'"), 'Public bundle may retain the hardened admin fallback implementation, but routing must not expose it on a public alternate origin.');
assert.ok(publicEntrypoint.includes('if (!PUBLIC_ALLOWED_HOSTS.has(host)) return rejectedHostResponse()'), 'Public bundle must fail closed on an unowned Host even if a route is misconfigured.');

const publicConfig = JSON.parse(wrangler);
const productionAdminConfig = JSON.parse(productionAdminWrangler);
const stagingAdminConfig = JSON.parse(stagingAdminWrangler);
const legacyConfig = JSON.parse(legacyWrangler);

assert.ok(Array.isArray(publicConfig.assets?.run_worker_first));
assert.ok(publicConfig.assets.run_worker_first.includes('/*'), 'Public Worker must run before assets for dynamic Careers/API routing.');
assert.equal(publicConfig.workers_dev, false, 'Phase 17.10 must disable the public workers.dev production route.');
assert.equal(publicConfig.preview_urls, false, 'Phase 17.10 must disable public Worker preview URLs.');
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
  "STAGING='https://admin-staging.rcitcs.com'",
  "test \"$code\" = '503'",
  'Staging administration is intentionally unavailable.',
  'x-rc-admin-staging-state: *intentionally-unavailable',
  '! grep -q \'Technology that moves business forward\'',
  'action="/login"',
  "PUBLIC='https://rcitcs.com'",
  "test \"$alias_code\" = '308'",
  "test \"$post_code\" = '404'",
  'Production admin, intentional staging isolation, and public admin separation verified.'
]) assert.ok(domainWorkflow.includes(expected), `Admin domain release gate missing: ${expected}`);

assert.ok(!worker.includes("ADMIN_PRODUCTION_ORIGIN = 'https://rcitcservices.frsmkgit.workers.dev"), 'workers.dev must not be the company admin origin.');
console.log('PASS: public and admin custom-domain ownership remains isolated; production admin stays authoritative, staging is intentionally unavailable, and public admin aliases cannot accept credentials.');

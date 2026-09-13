import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [worker, publicEntrypoint, wrangler, companyAdminWrangler, legacyWrangler, domainWorkflow] = await Promise.all([
  readFile(path.join(root, 'src/backend/runtime/worker.js'), 'utf8'),
  readFile(path.join(root, 'worker/index.js'), 'utf8'),
  readFile(path.join(root, 'wrangler.jsonc'), 'utf8'),
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
const companyAdminConfig = JSON.parse(companyAdminWrangler);
const legacyConfig = JSON.parse(legacyWrangler);

assert.ok(Array.isArray(publicConfig.assets?.run_worker_first));
assert.ok(publicConfig.assets.run_worker_first.includes('/*'), 'Public Worker must run before assets for dynamic Careers/API routing.');
assert.equal(publicConfig.workers_dev, true, 'Primary public Worker remains reachable on its workers.dev deployment.');
assert.equal(publicConfig.routes?.length, 1, 'Public Worker must own only rcitcs.com.');
assert.equal(publicConfig.routes?.[0]?.pattern, 'rcitcs.com');
assert.equal(publicConfig.routes?.[0]?.custom_domain, true, 'Public rcitcs.com remains its own Worker Custom Domain.');
assert.equal(publicConfig.routes?.some((route) => String(route.pattern || '').startsWith('admin.rcitcs.com')), false, 'Public Worker must never own or route admin.rcitcs.com.');

assert.equal(companyAdminConfig.name, 'rcitcs-admin-staging');
assert.equal(companyAdminConfig.workers_dev, false);
assert.ok(companyAdminConfig.routes?.some((route) => route.pattern === 'admin.rcitcs.com' && route.custom_domain === true), 'Connected company admin Worker must provision admin.rcitcs.com.');
assert.ok(companyAdminConfig.routes?.some((route) => route.pattern === 'admin-staging.rcitcs.com' && route.custom_domain === true), 'Admin staging hostname must remain independently available.');

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
console.log('PASS: rcitcs.com and admin.rcitcs.com remain separate public/admin sites, with production admin DNS provisioned inside the company Cloudflare account and no old-account route ownership.');

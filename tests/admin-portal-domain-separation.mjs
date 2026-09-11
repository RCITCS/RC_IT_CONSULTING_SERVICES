import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [worker, wrangler, domainWorkflow] = await Promise.all([
  readFile(path.join(root, 'src/backend/runtime/worker.js'), 'utf8'),
  readFile(path.join(root, 'wrangler.jsonc'), 'utf8'),
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

const config = JSON.parse(wrangler);
assert.ok(Array.isArray(config.assets?.run_worker_first));
assert.ok(config.assets.run_worker_first.includes('/*'), 'Worker must run before assets at admin-host root.');
assert.equal(config.routes?.find((route) => route.pattern === 'admin-staging.rcitcs.com/*')?.zone_name, 'rcitcs.com', 'Known-good staging transition route must remain deployable until isolated staging provisioning is complete.');
assert.equal(config.routes?.find((route) => route.pattern === 'admin.rcitcs.com')?.custom_domain, true, 'Production admin custom domain remains authoritative during the cutover transition.');

for (const expected of [
  "ADMIN='https://admin.rcitcs.com'",
  "ADMIN_STAGING='https://admin-staging.rcitcs.com'",
  '! grep -q \'Technology that moves business forward\'',
  'action="/login"',
  "PUBLIC='https://rcitcs.com'",
  'Production admin routes remain private and host-local',
  'Public rcitcs.com is not provisioned yet; production admin verification remains authoritative.'
]) assert.ok(domainWorkflow.includes(expected), `Admin domain release gate missing: ${expected}`);

assert.ok(!worker.includes("ADMIN_PRODUCTION_ORIGIN = 'https://rcitcservices.frsmkgit.workers.dev"), 'workers.dev must not be the company admin origin.');
console.log('PASS: admin.rcitcs.com is the authoritative private portal, staging/public-apex provisioning is diagnosed without weakening production security, and Applications navigation remains first-class.');

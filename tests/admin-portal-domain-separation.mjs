import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [worker, publicEntrypoint, wrangler, domainWorkflow] = await Promise.all([
  readFile(path.join(root, 'src/backend/runtime/worker.js'), 'utf8'),
  readFile(path.join(root, 'worker/index.js'), 'utf8'),
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

for (const contract of [
  "import adminWorker from './admin-only.js'",
  'if (DEDICATED_ADMIN_HOSTS.has(host))',
  'return adminWorker.fetch(request, env, ctx)'
]) assert.ok(publicEntrypoint.includes(contract), `Connected production Worker must delegate the admin hostname through the hardened admin entrypoint: ${contract}`);

const config = JSON.parse(wrangler);
assert.ok(Array.isArray(config.assets?.run_worker_first));
assert.ok(config.assets.run_worker_first.includes('/*'), 'Worker must run before assets for dynamic Careers/API/admin-host routing.');
assert.equal(config.workers_dev, true, 'Primary application Worker remains reachable on its workers.dev deployment.');
assert.equal(Object.hasOwn(config, 'route'), false);
assert.equal(config.routes?.length, 1, 'The connected company Worker must own exactly one explicit production admin edge route.');
assert.equal(config.routes?.[0]?.pattern, 'admin.rcitcs.com/*');
assert.equal(config.routes?.[0]?.zone_name, 'rcitcs.com');
assert.notEqual(config.routes?.[0]?.custom_domain, true, 'The public Worker is a Route in front of the existing admin Custom Domain, not a replacement origin.');

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
console.log('PASS: the existing company Workers Build owns the production admin edge Route, delegates it through the hardened admin entrypoint, and leaves the existing Custom Domain as the underlying origin/fallback.');

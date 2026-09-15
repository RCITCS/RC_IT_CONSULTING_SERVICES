import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adminWorker from '../worker/admin-only.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const production = readJson('wrangler.admin-production.jsonc');
const staging = readJson('wrangler.admin-staging.jsonc');
const publicConfig = readJson('wrangler.jsonc');
const legacy = readJson('cloudflare/legacy-rcitcservices/wrangler.jsonc');
const buildSelector = read('scripts/configure-cloudflare-workers-build.mjs');
const adminSource = read('worker/admin-only.js');
const baseline = read('docs/PHASE_17_DOMAIN_BASELINE.md');

assert.equal(production.name, 'rcitcs-admin-production');
assert.equal(production.main, './worker/admin-only.js');
assert.equal(production.workers_dev, false, 'Production admin must never expose a workers.dev endpoint.');
assert.equal(production.keep_vars, true, 'Production admin deployment must preserve managed runtime bindings.');
assert.deepEqual(
  production.routes?.map((route) => [route.pattern, route.custom_domain]),
  [['admin.rcitcs.com', true]],
  'Canonical production-admin config must own only admin.rcitcs.com.'
);
assert.equal(Object.hasOwn(production, 'secrets'), false, 'Production admin edge must not inherit public Worker secret requirements.');

assert.equal(
  publicConfig.routes?.some((route) => /^admin(?:-staging)?\.rcitcs\.com/.test(String(route.pattern || ''))),
  false,
  'Public Worker source config must not claim either admin hostname.'
);
assert.equal(Object.hasOwn(legacy, 'routes'), false, 'Legacy cross-account Worker must not claim RC IT production domains.');

assert.ok(buildSelector.includes("'rcitcs-admin-production': 'wrangler.admin-production.jsonc'"));
assert.ok(buildSelector.includes("'rcitcs-admin-staging': 'wrangler.admin-staging.jsonc'"));

// 17.4 defines the canonical production-admin contract. The currently connected
// staging Worker still carries the production hostname until the explicit 17.7
// ownership-convergence cutover. Do not hide or prematurely delete that overlap.
assert.deepEqual(
  staging.routes?.map((route) => [route.pattern, route.custom_domain]),
  [['admin.rcitcs.com', true], ['admin-staging.rcitcs.com', true]],
  'The known production/staging ownership overlap must remain explicit until Module 17.7.'
);
assert.match(baseline, /admin\.rcitcs\.com.*Route.*rc-it-consulting-services/is);
assert.match(baseline, /admin\.rcitcs\.com.*Production Custom Domain.*rcitcs-admin-staging/is);

for (const fragment of [
  "const ADMIN_HOSTS = new Set(['admin.rcitcs.com', 'admin-staging.rcitcs.com'])",
  "export const ADMIN_EDGE_RELEASE = 'phase12-job-authoring-v1'",
  "export const ADMIN_BUILD_SURFACE = 'phase16-security-closure-v1'",
  "export const ADMIN_HTML_MEDIA_FIX = 'phase16-html-content-type-v1'",
  "headers.set('x-rc-admin-edge-release', ADMIN_EDGE_RELEASE)",
  "headers.set('x-rc-admin-build-surface', ADMIN_BUILD_SURFACE)",
  "headers.set('x-rc-admin-html-media-fix', ADMIN_HTML_MEDIA_FIX)"
]) {
  assert.ok(adminSource.includes(fragment), `Production admin edge contract lost required fragment: ${fragment}`);
}

const rejectedPublicHost = await adminWorker.fetch(
  new Request('https://rcitcs.com/'),
  {},
  { waitUntil() {} }
);
assert.equal(rejectedPublicHost.status, 404, 'Dedicated admin Worker must reject the public hostname.');
assert.match(rejectedPublicHost.headers.get('cache-control') || '', /no-store/i);
assert.match(rejectedPublicHost.headers.get('x-robots-tag') || '', /noindex/i);

console.log('Phase 17.4 production admin-domain source contract: PASS');
console.log('CANONICAL: admin.rcitcs.com -> rcitcs-admin-production / worker/admin-only.js.');
console.log('DEFERRED TO 17.7: remove the connected staging/public control-plane ownership overlap only during explicit ownership convergence.');

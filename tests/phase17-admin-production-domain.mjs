import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adminWorker from '../worker/admin-only.js';
import { productionAdminLegacyRedirect } from '../worker/admin-production.js';

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
const productionAdminSource = read('worker/admin-production.js');
const baseline = read('docs/PHASE_17_DOMAIN_BASELINE.md');

assert.equal(production.name, 'rcitcs-admin-production');
assert.equal(production.main, './worker/admin-production.js');
assert.equal(production.workers_dev, false, 'Production admin must never expose a workers.dev endpoint.');
assert.equal(
  Object.hasOwn(production, 'keep_vars'),
  false,
  'Production admin Wrangler config must be authoritative for its non-secret runtime variables.'
);
assert.equal(production.vars?.RC_ADMIN_ENVIRONMENT, 'production');
assert.equal(Object.hasOwn(production.vars || {}, 'RC_ADMIN_STAGING_MODE'), false, 'Production config must never inherit staging-unavailable mode.');
assert.deepEqual(
  production.routes?.map((route) => [route.pattern, route.custom_domain]),
  [['admin.rcitcs.com', true]],
  'Canonical production-admin config must own only admin.rcitcs.com.'
);
assert.equal(Object.hasOwn(production, 'secrets'), false, 'Production admin edge must not inherit public Worker secret requirements.');

assert.deepEqual(
  staging.routes?.map((route) => [route.pattern, route.custom_domain]),
  [['admin-staging.rcitcs.com', true]],
  'After 17.7 the staging Worker must no longer claim the production admin hostname.'
);
assert.equal(staging.main, './worker/admin-only.js', 'Staging must remain on the shared hardened admin edge without the production legacy wrapper.');
assert.equal(staging.vars?.RC_ADMIN_ENVIRONMENT, 'staging');
assert.equal(staging.vars?.RC_ADMIN_STAGING_MODE, 'unavailable');

assert.equal(
  publicConfig.routes?.some((route) => /^admin(?:-staging)?\.rcitcs\.com/.test(String(route.pattern || ''))),
  false,
  'Public Worker source config must not claim either admin hostname.'
);
assert.equal(Object.hasOwn(legacy, 'routes'), false, 'Legacy cross-account Worker must not claim RC IT production domains.');

assert.ok(buildSelector.includes("'rcitcs-admin-production': 'wrangler.admin-production.jsonc'"));
assert.ok(buildSelector.includes("'rcitcs-admin-staging': 'wrangler.admin-staging.jsonc'"));
assert.ok(productionAdminSource.includes("import adminWorker"), 'Production wrapper must delegate canonical routes to the hardened shared admin edge.');
assert.ok(productionAdminSource.includes("return adminWorker.fetch(request, env, ctx)"), 'Production wrapper must not duplicate the admin runtime.');

// The 17.1 ledger remains immutable historical evidence of the pre-convergence
// control plane. Working source configuration is intentionally stricter after 17.7.
assert.match(baseline, /admin\.rcitcs\.com.*Route.*rc-it-consulting-services/is);
assert.match(baseline, /admin\.rcitcs\.com.*Production Custom Domain.*rcitcs-admin-staging/is);

for (const fragment of [
  "const ADMIN_HOSTS = new Set(['admin.rcitcs.com', 'admin-staging.rcitcs.com'])",
  "export const ADMIN_EDGE_RELEASE = 'phase12-job-authoring-v1'",
  "export const ADMIN_BUILD_SURFACE = 'phase16-security-closure-v1'",
  "export const ADMIN_HTML_MEDIA_FIX = 'phase16-html-content-type-v1'",
  "headers.set('x-rc-admin-edge-release', ADMIN_EDGE_RELEASE)",
  "headers.set('x-rc-admin-build-surface', ADMIN_BUILD_SURFACE)",
  "headers.set('x-rc-admin-html-media-fix', ADMIN_HTML_MEDIA_FIX)",
  "headers.set('x-rc-admin-environment', environment)"
]) {
  assert.ok(adminSource.includes(fragment), `Production admin edge contract lost required fragment: ${fragment}`);
}

const rejectedPublicHost = await adminWorker.fetch(
  new Request('https://rcitcs.com/'),
  production.vars,
  { waitUntil() {} }
);
assert.equal(rejectedPublicHost.status, 404, 'Dedicated admin Worker must reject the public hostname.');
assert.match(rejectedPublicHost.headers.get('cache-control') || '', /no-store/i);
assert.match(rejectedPublicHost.headers.get('x-robots-tag') || '', /noindex/i);

const legacyNavigation = productionAdminLegacyRedirect(
  new Request('https://admin.rcitcs.com/admin/applications?state=new')
);
assert.ok(legacyNavigation, 'Production wrapper must canonicalize legacy /admin navigation.');
assert.equal(legacyNavigation.status, 308);
assert.equal(legacyNavigation.headers.get('location'), 'https://admin.rcitcs.com/applications?state=new');
assert.equal(legacyNavigation.headers.get('x-rc-admin-environment'), 'production');

console.log('Phase 17.4 production admin-domain contract preserved after Phase 17.7 convergence: PASS');
console.log('CANONICAL: admin.rcitcs.com -> rcitcs-admin-production / worker/admin-production.js -> worker/admin-only.js.');

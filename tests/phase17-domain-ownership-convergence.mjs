import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enhanceAdminResponse } from '../worker/admin-only.js';
import { WORKERS_BUILD_CONFIG } from '../scripts/configure-cloudflare-workers-build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const publicConfig = readJson('wrangler.jsonc');
const production = readJson('wrangler.admin-production.jsonc');
const staging = readJson('wrangler.admin-staging.jsonc');
const legacy = readJson('cloudflare/legacy-rcitcservices/wrangler.jsonc');
const baseline = read('docs/PHASE_17_DOMAIN_BASELINE.md');

const routePairs = (config) => (config.routes || []).map((route) => [route.pattern, route.custom_domain]);

assert.equal(publicConfig.name, 'rc-it-consulting-services');
assert.deepEqual(routePairs(publicConfig), [
  ['rcitcs.com', true],
  ['www.rcitcs.com', true]
]);

assert.equal(production.name, 'rcitcs-admin-production');
assert.equal(production.workers_dev, false);
assert.equal(production.vars?.RC_ADMIN_ENVIRONMENT, 'production');
assert.deepEqual(routePairs(production), [['admin.rcitcs.com', true]]);

assert.equal(staging.name, 'rcitcs-admin-staging');
assert.equal(staging.workers_dev, false);
assert.equal(staging.vars?.RC_ADMIN_ENVIRONMENT, 'staging');
assert.equal(staging.vars?.RC_ADMIN_STAGING_MODE, 'unavailable');
assert.deepEqual(routePairs(staging), [['admin-staging.rcitcs.com', true]]);

assert.equal(legacy.name, 'rcitcservices');
assert.equal(legacy.workers_dev, false);
assert.equal(Object.hasOwn(legacy, 'routes'), false);

const ownership = new Map();
for (const [worker, config] of [
  [publicConfig.name, publicConfig],
  [production.name, production],
  [staging.name, staging]
]) {
  for (const route of config.routes || []) {
    assert.equal(route.custom_domain, true, `${worker} route ${route.pattern} must be a Custom Domain declaration.`);
    assert.equal(ownership.has(route.pattern), false, `Hostname ${route.pattern} is claimed by more than one Worker.`);
    ownership.set(route.pattern, worker);
  }
}

assert.deepEqual(Object.fromEntries(ownership), {
  'rcitcs.com': 'rc-it-consulting-services',
  'www.rcitcs.com': 'rc-it-consulting-services',
  'admin.rcitcs.com': 'rcitcs-admin-production',
  'admin-staging.rcitcs.com': 'rcitcs-admin-staging'
});

assert.equal(
  (publicConfig.routes || []).some((route) => /^admin(?:-staging)?\.rcitcs\.com(?:\/\*)?$/.test(String(route.pattern || ''))),
  false,
  'Public Worker source must contain no admin Route or Custom Domain.'
);
assert.equal(
  (staging.routes || []).some((route) => route.pattern === 'admin.rcitcs.com'),
  false,
  'Staging Worker must not claim production admin after convergence.'
);
assert.equal(
  (production.routes || []).some((route) => route.pattern === 'admin-staging.rcitcs.com'),
  false,
  'Production admin Worker must not claim staging.'
);

assert.deepEqual(WORKERS_BUILD_CONFIG, {
  'rc-it-consulting-services': 'wrangler.jsonc',
  'rcitcs-admin-staging': 'wrangler.admin-staging.jsonc',
  'rcitcs-admin-production': 'wrangler.admin-production.jsonc',
  rcitcservices: 'cloudflare/legacy-rcitcservices/wrangler.jsonc'
});

const productionMarker = await enhanceAdminResponse(
  new Response('{"authenticated":false}', {
    status: 401,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  }),
  'GET',
  production.vars
);
assert.equal(productionMarker.headers.get('x-rc-admin-environment'), 'production');
assert.equal(productionMarker.headers.get('x-rc-admin-build-surface'), 'phase16-security-closure-v1');

const stagingMarker = await enhanceAdminResponse(
  new Response('{"authenticated":false}', {
    status: 401,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  }),
  'GET',
  staging.vars
);
assert.equal(stagingMarker.headers.get('x-rc-admin-environment'), 'staging');

assert.match(baseline, /admin\.rcitcs\.com.*Route.*rc-it-consulting-services/is, '17.1 historical route evidence must remain preserved.');
assert.match(baseline, /admin\.rcitcs\.com.*Production Custom Domain.*rcitcs-admin-staging/is, '17.1 historical staging ownership evidence must remain preserved.');

console.log('Phase 17.7 Worker/Custom-Domain/Route ownership convergence source contract: PASS');
console.log('FINAL SOURCE OWNERS: apex+www -> public; admin -> production admin; admin-staging -> staging; legacy -> none.');

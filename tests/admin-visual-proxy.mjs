import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerPath = path.join(root, 'src/backend/runtime/worker.js');
const workerSource = await readFile(workerPath, 'utf8');
const primaryConfig = JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'));
const stagingConfig = JSON.parse(await readFile(path.join(root, 'wrangler.admin-staging.jsonc'), 'utf8'));
const productionAdminConfig = JSON.parse(await readFile(path.join(root, 'wrangler.admin-production.jsonc'), 'utf8'));
const adminOnlySource = await readFile(path.join(root, 'worker/admin-only.js'), 'utf8');
const domainWorkflow = await readFile(path.join(root, '.github/workflows/admin-portal-domain-smoke.yml'), 'utf8');
const { adminOriginAllowed, buildAdminUpstreamRequest, isDedicatedAdminHost } = await import(pathToFileURL(workerPath).href);

for (const required of [
  "const ADMIN_PRODUCTION_ORIGIN = 'https://admin.rcitcs.com'",
  "new Set(['admin.rcitcs.com', 'admin-staging.rcitcs.com'])",
  "const ADMIN_UPSTREAM_BASE = '/functions/v1/admin-auth'",
  "upstreamRequest.headers.set('x-rcitcs-admin-proxy', 'cloudflare')",
  "upstreamRequest.headers.delete('host')",
  "upstreamRequest.headers.delete('content-length')",
  "fetch(upstreamRequest, { redirect: 'manual' })",
  "headers.set('cache-control', 'no-store, no-transform, max-age=0, must-revalidate')",
  "headers.set('x-robots-tag', 'noindex, nofollow, noarchive')",
  "if (isDedicatedAdminHost(url.hostname)) return handleAdminRequest(request)",
  "if (isAdminPath(url.pathname)) return redirectPublicAdminAlias(request, url)",
  'function enhanceAdminNavigation',
  '<span>Applications</span>'
]) {
  assert.ok(workerSource.includes(required), `Admin proxy security/navigation contract missing: ${required}`);
}

assert.equal(isDedicatedAdminHost('admin.rcitcs.com'), true);
assert.equal(isDedicatedAdminHost('ADMIN-STAGING.RCITCS.COM'), true);
assert.equal(isDedicatedAdminHost('rcitcs.com'), false);
assert.equal(isDedicatedAdminHost('rcitcservices.frsmkgit.workers.dev'), false);

const productionLogin = new URL('https://admin.rcitcs.com/login');
const stagingLogin = new URL('https://admin-staging.rcitcs.com/login');
const navHeaders = {
  'sec-fetch-site': 'same-origin',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-dest': 'document',
  'sec-fetch-user': '?1'
};
const requestWith = (headers) => ({ headers: new Headers(headers) });
assert.equal(adminOriginAllowed(requestWith({ origin: productionLogin.origin }), productionLogin), true);
assert.equal(adminOriginAllowed(requestWith({ origin: stagingLogin.origin }), stagingLogin), true);
assert.equal(adminOriginAllowed(requestWith({ origin: 'https://example.invalid', ...navHeaders }), productionLogin), false);
assert.equal(adminOriginAllowed(requestWith({ origin: 'null', ...navHeaders }), productionLogin), true);
assert.equal(adminOriginAllowed(requestWith({ origin: 'null', ...navHeaders, 'sec-fetch-site': 'cross-site' }), productionLogin), false);

const browserPost = new Request(productionLogin, {
  method: 'POST',
  headers: { origin: productionLogin.origin, ...navHeaders, 'content-type': 'application/x-www-form-urlencoded' },
  body: 'email=admin%40example.invalid&password=placeholder'
});
const upstream = new URL('https://chsizmffzpxcqhaptjeu.supabase.co/functions/v1/admin-auth/login');
const proxied = buildAdminUpstreamRequest(browserPost, upstream);
assert.equal(proxied.url, upstream.href);
assert.equal(proxied.headers.get('x-rcitcs-admin-proxy'), 'cloudflare');
assert.equal(proxied.headers.get('host'), null);
assert.equal(proxied.headers.get('content-length'), null);
assert.equal(await proxied.text(), 'email=admin%40example.invalid&password=placeholder');

assert.equal(primaryConfig.main, './worker/index.js');
assert.equal(primaryConfig.workers_dev, true, 'The primary Phase 12 application Worker must remain reachable on its workers.dev production origin.');
assert.equal(Object.hasOwn(primaryConfig, 'route'), false, 'Primary Worker route reconciliation is intentionally detached during the admin Worker cutover.');
assert.equal(Object.hasOwn(primaryConfig, 'routes'), false, 'Primary Worker must not overwrite externally managed admin-domain bindings during the cutover.');
assert.deepEqual(primaryConfig.assets?.run_worker_first, ['/*']);
assert.deepEqual(primaryConfig.triggers?.crons, ['*/15 * * * *']);

assert.equal(stagingConfig.name, 'rcitcs-admin-staging');
assert.equal(stagingConfig.main, './worker/admin-only.js');
assert.equal(stagingConfig.workers_dev, false);
assert.equal(stagingConfig.routes?.length, 1);
assert.equal(stagingConfig.routes?.[0]?.pattern, 'admin-staging.rcitcs.com');
assert.equal(stagingConfig.routes?.[0]?.custom_domain, true, 'The isolated staging cutover config must use a Worker Custom Domain when it is provisioned.');

assert.equal(productionAdminConfig.name, 'rcitcs-admin-production');
assert.equal(productionAdminConfig.main, './worker/admin-only.js');
assert.equal(productionAdminConfig.workers_dev, false);
assert.equal(productionAdminConfig.routes?.[0]?.pattern, 'admin.rcitcs.com');
assert.equal(productionAdminConfig.routes?.[0]?.custom_domain, true);

assert.ok(adminOnlySource.includes("new Set(['admin.rcitcs.com', 'admin-staging.rcitcs.com'])"));
assert.ok(adminOnlySource.includes("return new Response('Not Found'"));
assert.ok(adminOnlySource.includes('return runtime.fetch(request, env, ctx)'));
for (const forbidden of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS', 'ADMIN_BOOTSTRAP_PASSWORD_VERIFIER']) {
  assert.equal(workerSource.includes(forbidden), false, `Secret material leaked into admin proxy source: ${forbidden}`);
  assert.equal(adminOnlySource.includes(forbidden), false, `Secret material leaked into dedicated admin entrypoint: ${forbidden}`);
}

for (const expected of [
  "ADMIN='https://admin.rcitcs.com'",
  "ADMIN_STAGING='https://admin-staging.rcitcs.com'",
  "PUBLIC='https://rcitcs.com'",
  '${ADMIN}/applications',
  '${ADMIN}/session',
  'Production admin routes remain private and host-local',
  'Public rcitcs.com is not provisioned yet; production admin verification remains authoritative.'
]) {
  assert.ok(domainWorkflow.includes(expected), `Admin domain release gate missing: ${expected}`);
}

console.log('PASS: Phase 12 public Worker deployment is detached from admin-route reconciliation while admin proxy security, live-domain verification and isolated admin Worker cutover configs remain intact.');

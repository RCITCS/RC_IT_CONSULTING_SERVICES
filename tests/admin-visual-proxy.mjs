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
assert.deepEqual(primaryConfig.assets?.run_worker_first, ['/*']);
assert.deepEqual(primaryConfig.triggers?.crons, ['*/15 * * * *']);
assert.equal(primaryConfig.routes?.some((route) => route.pattern === 'admin-staging.rcitcs.com/*' || route.pattern === 'admin-staging.rcitcs.com'), false, 'The public/current production Worker must not claim the separate staging admin hostname.');
const temporaryProductionBinding = primaryConfig.routes?.find((route) => route.pattern === 'admin.rcitcs.com');
assert.equal(temporaryProductionBinding?.custom_domain, true, 'Production admin must remain live on the current Worker until the isolated production Worker is created and cut over.');

assert.equal(stagingConfig.name, 'rcitcs-admin-staging');
assert.equal(stagingConfig.main, './worker/admin-only.js');
assert.equal(stagingConfig.workers_dev, false);
assert.equal(stagingConfig.routes?.length, 1);
assert.equal(stagingConfig.routes?.[0]?.pattern, 'admin-staging.rcitcs.com');
assert.equal(stagingConfig.routes?.[0]?.custom_domain, true, 'Staging admin must be a Worker Custom Domain so Cloudflare owns its DNS and certificate.');

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
  'Public rcitcs.com does not accept admin authentication'
]) {
  assert.ok(domainWorkflow.includes(expected), `Admin domain release gate missing: ${expected}`);
}

console.log('PASS: admin proxy security is preserved, staging ownership is isolated to rcitcs-admin-staging, and the production admin Worker cutover is source-controlled without downtime.');

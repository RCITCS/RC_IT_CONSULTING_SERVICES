import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerPath = path.join(root, 'src/backend/runtime/worker.js');
const workerSource = await readFile(workerPath, 'utf8');
const wranglerSource = await readFile(path.join(root, 'wrangler.jsonc'), 'utf8');
const workflowSource = await readFile(path.join(root, '.github/workflows/cloudflare-deploy.yml'), 'utf8');
const domainWorkflowSource = await readFile(path.join(root, '.github/workflows/admin-portal-domain-smoke.yml'), 'utf8');
const { adminOriginAllowed, buildAdminUpstreamRequest, isDedicatedAdminHost } = await import(pathToFileURL(workerPath).href);

for (const required of [
  "const ADMIN_PUBLIC_BASE = '/admin'",
  "const ADMIN_PRODUCTION_ORIGIN = 'https://admin.rcitcs.com'",
  "new Set(['admin.rcitcs.com', 'admin-staging.rcitcs.com'])",
  "const ADMIN_UPSTREAM_BASE = '/functions/v1/admin-auth'",
  "script-src 'self'",
  'const ADMIN_UI_SCRIPT =',
  'const ADMIN_UI_STYLE =',
  'function adminFetchMetadataAllowsNavigationPost',
  'export function adminOriginAllowed',
  'export function buildAdminUpstreamRequest',
  'export function isDedicatedAdminHost',
  'function isInternalWorkerHost',
  'function adminPublicBase',
  'function redirectPublicAdminAlias',
  "request.headers.get('sec-fetch-site') === 'same-origin'",
  "request.headers.get('sec-fetch-mode') === 'navigate'",
  "request.headers.get('sec-fetch-dest') === 'document'",
  "request.headers.get('sec-fetch-user') === '?1'",
  "origin && origin !== 'null'",
  "upstreamRequest.headers.set('x-rcitcs-admin-proxy', 'cloudflare')",
  'function adminUiScriptResponse',
  'function enhanceAdminHtml',
  'function isAdminPath',
  'function adminUpstreamUrl',
  'function rewriteAdminReference',
  'function proxyAdminResponse',
  'async function handleAdminRequest',
  "headers.set('content-type', 'text/html; charset=utf-8')",
  "headers.set('content-security-policy', ADMIN_HTML_CSP)",
  "if (isDedicatedAdminHost(url.hostname)) return handleAdminRequest(request)",
  "if (isAdminPath(url.pathname) && isInternalWorkerHost(url.hostname)) return handleAdminRequest(request)",
  "if (isAdminPath(url.pathname)) return redirectPublicAdminAlias(request, url)"
]) {
  assert.ok(workerSource.includes(required), `admin dedicated-host contract missing: ${required}`);
}

for (const passwordUiContract of [
  "document.querySelectorAll('input[type=\"password\"]')",
  "button.setAttribute('aria-label', 'Show password')",
  "button.setAttribute('aria-pressed', 'false')",
  "input.type = reveal ? 'text' : 'password'",
  'password-reveal',
  'password-control'
]) {
  assert.ok(workerSource.includes(passwordUiContract), `password reveal contract missing: ${passwordUiContract}`);
}

assert.equal(isDedicatedAdminHost('admin.rcitcs.com'), true, 'production admin hostname must be dedicated');
assert.equal(isDedicatedAdminHost('ADMIN-STAGING.RCITCS.COM'), true, 'staging admin hostname matching must be case-insensitive');
assert.equal(isDedicatedAdminHost('rcitcs.com'), false, 'public production hostname must never be classified as admin');
assert.equal(isDedicatedAdminHost('rcitcservices.frsmkgit.workers.dev'), false, 'underlying public workers.dev hostname must never be classified as a company admin hostname');

function requestWith(headers = {}) {
  return { headers: new Headers(headers) };
}

const stagingLoginUrl = new URL('https://admin-staging.rcitcs.com/login');
const productionLoginUrl = new URL('https://admin.rcitcs.com/login');
const sameOriginNavigation = {
  'sec-fetch-site': 'same-origin',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-dest': 'document',
  'sec-fetch-user': '?1'
};

assert.equal(adminOriginAllowed(requestWith({ origin: stagingLoginUrl.origin }), stagingLoginUrl), true, 'explicit staging same-origin POST must be accepted');
assert.equal(adminOriginAllowed(requestWith({ origin: productionLoginUrl.origin }), productionLoginUrl), true, 'explicit production same-origin POST must be accepted');
assert.equal(adminOriginAllowed(requestWith({ origin: 'null', ...sameOriginNavigation }), stagingLoginUrl), true, 'privacy-reduced same-origin browser form POST with Origin: null must be accepted');
assert.equal(adminOriginAllowed(requestWith(sameOriginNavigation), stagingLoginUrl), true, 'same-origin browser form POST with an omitted Origin header must be accepted');
assert.equal(adminOriginAllowed(requestWith({ origin: productionLoginUrl.origin, ...sameOriginNavigation }), stagingLoginUrl), false, 'an explicit different admin origin must not be accepted by staging');
assert.equal(adminOriginAllowed(requestWith({ origin: 'https://example.invalid', ...sameOriginNavigation }), stagingLoginUrl), false, 'an explicit hostile origin must take precedence over fetch metadata and be rejected');
assert.equal(adminOriginAllowed(requestWith({ origin: 'null', ...sameOriginNavigation, 'sec-fetch-site': 'cross-site' }), stagingLoginUrl), false, 'Origin: null from a cross-site request must be rejected');
assert.equal(adminOriginAllowed(requestWith({ origin: 'null', ...sameOriginNavigation, 'sec-fetch-site': 'same-site' }), stagingLoginUrl), false, 'Origin: null from a same-site but cross-origin request must be rejected');
assert.equal(adminOriginAllowed(requestWith({ origin: 'null', ...sameOriginNavigation, 'sec-fetch-dest': 'empty' }), stagingLoginUrl), false, 'Origin: null must only be accepted for a document navigation');
assert.equal(adminOriginAllowed(requestWith({ origin: 'null', 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' }), stagingLoginUrl), false, 'Origin: null navigation without user activation must be rejected');
assert.equal(adminOriginAllowed(requestWith({ origin: 'not a url', ...sameOriginNavigation }), stagingLoginUrl), false, 'malformed explicit Origin must fail closed');

const browserPost = new Request(stagingLoginUrl, {
  method: 'POST',
  headers: { origin: 'null', ...sameOriginNavigation, 'content-type': 'application/x-www-form-urlencoded' },
  body: 'email=admin%40example.invalid&password=placeholder'
});
const upstreamUrl = new URL('https://chsizmffzpxcqhaptjeu.supabase.co/functions/v1/admin-auth/login');
const upstreamRequest = buildAdminUpstreamRequest(browserPost, upstreamUrl);
assert.equal(upstreamRequest.url, upstreamUrl.href, 'admin POST must target the Supabase admin-auth endpoint');
assert.equal(upstreamRequest.method, 'POST', 'admin POST method must be preserved');
assert.equal(upstreamRequest.headers.get('origin'), 'null', 'browser Origin must be preserved for the upstream browser-metadata gate');
assert.equal(upstreamRequest.headers.get('sec-fetch-site'), 'same-origin', 'browser Fetch Metadata must be preserved upstream');
assert.equal(upstreamRequest.headers.get('sec-fetch-mode'), 'navigate', 'browser navigation mode must be preserved upstream');
assert.equal(upstreamRequest.headers.get('sec-fetch-dest'), 'document', 'browser navigation destination must be preserved upstream');
assert.equal(upstreamRequest.headers.get('sec-fetch-user'), '?1', 'browser user activation must be preserved upstream');
assert.equal(upstreamRequest.headers.get('x-rcitcs-admin-proxy'), 'cloudflare', 'upstream request must retain the admin proxy marker');
assert.equal(upstreamRequest.headers.get('host'), null, 'client Host must not be forwarded');
assert.equal(upstreamRequest.headers.get('content-length'), null, 'client Content-Length must not be forwarded');
assert.equal(await upstreamRequest.text(), 'email=admin%40example.invalid&password=placeholder', 'form body must be preserved exactly');

assert.ok(workerSource.includes("'cache-control': 'no-store, no-transform, max-age=0, must-revalidate'"));
assert.ok(workerSource.includes("'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex'"));
assert.ok(workerSource.includes("headers.set('x-robots-tag', 'noindex, nofollow, noarchive')"));
assert.ok(workerSource.includes("'x-frame-options': 'DENY'"));
assert.ok(workerSource.includes("'content-security-policy': ADMIN_HTML_CSP"));
assert.ok(workerSource.includes("upstreamRequest.headers.delete('content-length')"));
assert.ok(workerSource.includes("fetch(upstreamRequest, { redirect: 'manual' })"));
assert.ok(!workerSource.includes("upstreamRequest.headers.set('origin'"), 'proxy must not rewrite the browser Origin header');
assert.ok(!workerSource.includes('ADMIN_ALLOWED_PUBLIC_ORIGINS'), 'cross-origin admin host allowlist must not bypass exact same-origin validation');

const wrangler = JSON.parse(wranglerSource);
assert.ok(Array.isArray(wrangler.assets?.run_worker_first), 'Worker-first configuration must remain explicit');
for (const pattern of ['/*', '/api/*', '/admin', '/admin/*', '/careers', '/careers/jobs/*']) {
  assert.ok(wrangler.assets.run_worker_first.includes(pattern), `Worker-first pattern missing: ${pattern}`);
}
assert.deepEqual(wrangler.triggers?.crons, ['*/15 * * * *']);

assert.ok(workflowSource.includes('Verify live Phase 12 private application runtimes'));
assert.ok(workflowSource.includes('Verify live Phase 12 visual admin delivery'));
assert.ok(workflowSource.includes('"jobs":true'));
assert.ok(workflowSource.includes('"applications":true'));
assert.ok(workflowSource.includes('"design":"phase12-candidate-application-workflow"'));
assert.ok(workflowSource.includes("ADMIN='https://rcitcservices.frsmkgit.workers.dev/admin'"), 'workers.dev may remain only as the underlying internal deployment probe');

for (const required of [
  'Verify dedicated admin portal domains',
  "ADMIN='https://admin.rcitcs.com'",
  "ADMIN_STAGING='https://admin-staging.rcitcs.com'",
  'Technology that moves business forward',
  'action="/login"',
  '! grep -q \'action="/admin/login"\'',
  'https://admin\\.rcitcs\\.com/',
  "PUBLIC='https://rcitcs.com'",
  '${ADMIN}/applications',
  '${ADMIN}/session',
  'Public rcitcs.com does not accept admin authentication'
]) {
  assert.ok(domainWorkflowSource.includes(required), `dedicated admin-domain release gate missing: ${required}`);
}

for (const forbidden of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS', 'ADMIN_BOOTSTRAP_PASSWORD_VERIFIER']) {
  assert.ok(!workerSource.includes(forbidden), `secret material must not enter the Cloudflare admin proxy: ${forbidden}`);
}

console.log('PASS: dedicated admin.rcitcs.com/admin-staging.rcitcs.com host routing prevents public-site fallback while workers.dev remains only an internal deployment probe.');

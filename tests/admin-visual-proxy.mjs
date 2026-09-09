import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerPath = path.join(root, 'src/backend/runtime/worker.js');
const workerSource = await readFile(workerPath, 'utf8');
const wranglerSource = await readFile(path.join(root, 'wrangler.jsonc'), 'utf8');
const workflowSource = await readFile(path.join(root, '.github/workflows/cloudflare-deploy.yml'), 'utf8');
const { adminOriginAllowed } = await import(pathToFileURL(workerPath).href);

for (const required of [
  "const ADMIN_PUBLIC_BASE = '/admin'",
  "const ADMIN_UPSTREAM_BASE = '/functions/v1/admin-auth'",
  "script-src 'self'",
  'const ADMIN_UI_SCRIPT =',
  'const ADMIN_UI_STYLE =',
  'function adminFetchMetadataAllowsNavigationPost',
  'export function adminOriginAllowed',
  "request.headers.get('sec-fetch-site') === 'same-origin'",
  "request.headers.get('sec-fetch-mode') === 'navigate'",
  "request.headers.get('sec-fetch-dest') === 'document'",
  "request.headers.get('sec-fetch-user') === '?1'",
  "origin && origin !== 'null'",
  'function adminUiScriptResponse',
  'function enhanceAdminHtml',
  'function isAdminPath',
  'function adminUpstreamUrl',
  'function rewriteAdminReference',
  'function proxyAdminResponse',
  'async function handleAdminRequest',
  "headers.set('content-type', 'text/html; charset=utf-8')",
  "headers.set('content-security-policy', ADMIN_HTML_CSP)",
  "headers.set('origin', ADMIN_UPSTREAM_ORIGIN)",
  "incomingUrl.pathname === `${ADMIN_PUBLIC_BASE}/ui.js`",
  "headers.append('set-cookie', rewriteAdminReference(cookie))",
  "if (isAdminPath(url.pathname)) return handleAdminRequest(request)"
]) {
  assert.ok(workerSource.includes(required), `admin visual proxy contract missing: ${required}`);
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

function requestWith(headers = {}) {
  return { headers: new Headers(headers) };
}

const stagingLoginUrl = new URL('https://admin-staging.rcitcs.com/admin/login');
const productionLoginUrl = new URL('https://admin.rcitcs.com/admin/login');
const sameOriginNavigation = {
  'sec-fetch-site': 'same-origin',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-dest': 'document',
  'sec-fetch-user': '?1'
};

assert.equal(
  adminOriginAllowed(requestWith({ origin: stagingLoginUrl.origin }), stagingLoginUrl),
  true,
  'explicit staging same-origin POST must be accepted'
);
assert.equal(
  adminOriginAllowed(requestWith({ origin: productionLoginUrl.origin }), productionLoginUrl),
  true,
  'explicit production same-origin POST must be accepted'
);
assert.equal(
  adminOriginAllowed(requestWith({ origin: 'null', ...sameOriginNavigation }), stagingLoginUrl),
  true,
  'privacy-reduced same-origin browser form POST with Origin: null must be accepted'
);
assert.equal(
  adminOriginAllowed(requestWith(sameOriginNavigation), stagingLoginUrl),
  true,
  'same-origin browser form POST with an omitted Origin header must be accepted'
);
assert.equal(
  adminOriginAllowed(requestWith({ origin: productionLoginUrl.origin, ...sameOriginNavigation }), stagingLoginUrl),
  false,
  'an explicit different origin must not be accepted by the staging host'
);
assert.equal(
  adminOriginAllowed(requestWith({ origin: 'https://example.invalid', ...sameOriginNavigation }), stagingLoginUrl),
  false,
  'an explicit hostile origin must take precedence over fetch metadata and be rejected'
);
assert.equal(
  adminOriginAllowed(requestWith({ origin: 'null', ...sameOriginNavigation, 'sec-fetch-site': 'cross-site' }), stagingLoginUrl),
  false,
  'Origin: null from a cross-site request must be rejected'
);
assert.equal(
  adminOriginAllowed(requestWith({ origin: 'null', ...sameOriginNavigation, 'sec-fetch-site': 'same-site' }), stagingLoginUrl),
  false,
  'Origin: null from a same-site but cross-origin request must be rejected'
);
assert.equal(
  adminOriginAllowed(requestWith({ origin: 'null', ...sameOriginNavigation, 'sec-fetch-dest': 'empty' }), stagingLoginUrl),
  false,
  'Origin: null must only be accepted for a document navigation'
);
assert.equal(
  adminOriginAllowed(requestWith({
    origin: 'null',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-dest': 'document'
  }), stagingLoginUrl),
  false,
  'Origin: null navigation without user activation must be rejected'
);
assert.equal(
  adminOriginAllowed(requestWith({ origin: 'not a url', ...sameOriginNavigation }), stagingLoginUrl),
  false,
  'malformed explicit Origin must fail closed'
);

assert.ok(workerSource.includes("'cache-control': 'no-store, max-age=0, must-revalidate'"));
assert.ok(workerSource.includes("'x-robots-tag': 'noindex, nofollow, noarchive"));
assert.ok(workerSource.includes("'x-frame-options': 'DENY'"));
assert.ok(workerSource.includes("'content-security-policy': ADMIN_HTML_CSP"));
assert.ok(workerSource.includes("headers.delete('content-length')"));
assert.ok(workerSource.includes("headers.delete('content-encoding')"));
assert.ok(workerSource.includes("redirect: 'manual'"));
assert.ok(!workerSource.includes('ADMIN_ALLOWED_PUBLIC_ORIGINS'), 'cross-origin admin host allowlist must not bypass exact same-origin validation');

assert.ok(wranglerSource.includes('"/admin"'));
assert.ok(wranglerSource.includes('"/admin/*"'));
assert.ok(wranglerSource.includes('"run_worker_first"'));

assert.ok(workflowSource.includes('Verify live Phase 10 visual admin delivery'));
assert.ok(workflowSource.includes("ADMIN='https://rcitcservices.frsmkgit.workers.dev/admin'"));
assert.ok(workflowSource.includes('content-type:.*text/html'));
assert.ok(workflowSource.includes('${ADMIN}/session'));

for (const forbidden of [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEYS',
  'ADMIN_BOOTSTRAP_PASSWORD_VERIFIER'
]) {
  assert.ok(!workerSource.includes(forbidden), `secret material must not enter the Cloudflare admin proxy: ${forbidden}`);
}

console.log('PASS: Phase 10 admin delivery handles the standards-compliant Origin: null form POST produced by the no-referrer policy using strict Fetch Metadata validation, rejects explicit or cross-site origins, preserves private admin delivery controls, and provides an accessible password visibility control without exposing secrets.');

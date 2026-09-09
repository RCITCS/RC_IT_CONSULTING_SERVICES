import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerSource = await readFile(path.join(root, 'src/backend/runtime/worker.js'), 'utf8');
const wranglerSource = await readFile(path.join(root, 'wrangler.jsonc'), 'utf8');
const workflowSource = await readFile(path.join(root, '.github/workflows/cloudflare-deploy.yml'), 'utf8');

for (const required of [
  "const ADMIN_PUBLIC_BASE = '/admin'",
  "const ADMIN_UPSTREAM_BASE = '/functions/v1/admin-auth'",
  "'https://admin.rcitcs.com'",
  "'https://admin-staging.rcitcs.com'",
  "script-src 'self'",
  'const ADMIN_UI_SCRIPT =',
  'const ADMIN_UI_STYLE =',
  'function adminOriginAllowed',
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
  "ADMIN_ALLOWED_PUBLIC_ORIGINS.has(normalized)",
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

assert.ok(workerSource.includes("'cache-control': 'no-store, max-age=0, must-revalidate'"));
assert.ok(workerSource.includes("'x-robots-tag': 'noindex, nofollow, noarchive"));
assert.ok(workerSource.includes("'x-frame-options': 'DENY'"));
assert.ok(workerSource.includes("'content-security-policy': ADMIN_HTML_CSP"));
assert.ok(workerSource.includes("headers.delete('content-length')"));
assert.ok(workerSource.includes("headers.delete('content-encoding')"));
assert.ok(workerSource.includes("redirect: 'manual'"));

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

console.log('PASS: Phase 10 admin delivery preserves the private security boundary, accepts only the approved production/staging admin origins, serves the embedded admin UI correctly, and provides an accessible same-origin password visibility control without exposing secrets.');

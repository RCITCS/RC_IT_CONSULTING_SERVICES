import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import publicWorker, {
  canonicalPublicRedirect,
  legacyAdminRedirect,
  publicAdminAliasRedirect
} from '../worker/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, '..');
const source = fs.readFileSync(path.join(rootDir, 'worker/index.js'), 'utf8');

function publicAlias(url, init = {}) {
  return publicAdminAliasRedirect(new Request(url, init));
}

assert.equal(publicAlias('https://rcitcs.com/'), null, 'Public root must not enter the admin alias redirect.');
assert.equal(publicAlias('https://rcitcs.com/about-us'), null, 'Ordinary public routes must not enter the admin alias redirect.');
assert.equal(publicAlias('https://admin.rcitcs.com/admin'), null, 'Dedicated admin host must not enter the public-host alias redirect.');
assert.equal(publicAlias('https://admin-staging.rcitcs.com/admin'), null, 'Staging admin host must not enter the public-host alias redirect.');

const rootResponse = publicAlias('https://rcitcs.com/admin');
assert.equal(rootResponse.status, 308);
assert.equal(rootResponse.headers.get('location'), 'https://admin.rcitcs.com/');
assert.match(rootResponse.headers.get('cache-control') || '', /no-store/i);
assert.match(rootResponse.headers.get('x-robots-tag') || '', /noindex/i);
assert.equal(rootResponse.headers.get('x-content-type-options'), 'nosniff');
assert.equal(rootResponse.headers.get('x-frame-options'), 'DENY');
assert.match(rootResponse.headers.get('content-security-policy') || '', /default-src 'none'/);
assert.match(rootResponse.headers.get('strict-transport-security') || '', /max-age=31536000/);
assert.equal(await rootResponse.text(), '');

const head = publicAlias('https://rcitcs.com/admin/jobs?view=open', { method: 'HEAD' });
assert.equal(head.status, 308);
assert.equal(head.headers.get('location'), 'https://admin.rcitcs.com/jobs?view=open');
assert.equal(await head.text(), '');

const deep = publicAlias('https://rcitcs.com/admin/applications?status=review&return=%2Fjobs');
assert.equal(deep.status, 308);
assert.equal(deep.headers.get('location'), 'https://admin.rcitcs.com/applications?status=review&return=%2Fjobs');

const openRedirectProbe = publicAlias('https://rcitcs.com/admin//example.invalid/login?next=%2F');
assert.equal(openRedirectProbe.status, 308);
const openRedirectTarget = new URL(openRedirectProbe.headers.get('location'));
assert.equal(openRedirectTarget.origin, 'https://admin.rcitcs.com', 'Leading // admin suffix must never escape the trusted admin origin.');
assert.equal(openRedirectTarget.pathname, '//example.invalid/login');
assert.equal(openRedirectTarget.search, '?next=%2F');

for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
  const init = { method };
  if (!['DELETE', 'OPTIONS'].includes(method)) {
    init.headers = { 'content-type': 'application/x-www-form-urlencoded' };
    init.body = 'email=test@example.invalid&password=not-a-real-password';
  }
  const response = publicAlias('https://rcitcs.com/admin/login?return=%2Fapplications', init);
  assert.equal(response.status, 404, `${method} on public /admin must be rejected instead of replayed to the admin host.`);
  assert.equal(response.headers.has('location'), false, `${method} rejection must not redirect credentials or request bodies.`);
  assert.equal(response.headers.has('set-cookie'), false, `${method} rejection must not establish an admin session.`);
  assert.match(response.headers.get('cache-control') || '', /no-store/i);
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/i);
  assert.equal(await response.text(), 'Not Found');
}

const canonicalWww = canonicalPublicRedirect(new Request('https://www.rcitcs.com/admin?return=%2Fapplications'));
assert.equal(canonicalWww.status, 308);
assert.equal(canonicalWww.headers.get('location'), 'https://rcitcs.com/admin?return=%2Fapplications', 'www canonicalization remains 17.3-first; final redirect minimization belongs to 17.12.');

const dedicatedLegacy = legacyAdminRedirect(new Request('https://admin.rcitcs.com/admin/applications?status=open'));
assert.equal(dedicatedLegacy.status, 308);
assert.equal(dedicatedLegacy.headers.get('location'), 'https://admin.rcitcs.com/applications?status=open');
const dedicatedMutation = legacyAdminRedirect(new Request('https://admin.rcitcs.com/admin/login', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: 'email=x&password=x'
}));
assert.equal(dedicatedMutation.status, 409, 'Legacy dedicated-host mutation must not be silently replayed after path migration.');

const entryGet = await publicWorker.fetch(
  new Request('https://rcitcs.com/admin//example.invalid/path?x=1'),
  {},
  { waitUntil() {} }
);
assert.equal(entryGet.status, 308);
assert.equal(new URL(entryGet.headers.get('location')).origin, 'https://admin.rcitcs.com', 'Cloudflare entry must enforce the safe public-admin boundary before shared runtime dispatch.');

const entryPost = await publicWorker.fetch(
  new Request('https://rcitcs.com/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'email=x&password=x'
  }),
  {},
  { waitUntil() {} }
);
assert.equal(entryPost.status, 404, 'Cloudflare entry must reject public-host admin mutations before shared runtime dispatch.');

assert.ok(source.indexOf('const publicAdmin = publicAdminAliasRedirect(request)') < source.indexOf('runtime.fetch(request, env, ctx)'), 'Public admin separation must execute before shared runtime dispatch, including when the runtime response is wrapped by transport-security headers.');

console.log('Phase 17.6 public /admin redirect and admin-domain separation contract: PASS');
console.log('GET/HEAD navigate to admin.rcitcs.com; mutation methods are rejected; leading // suffixes cannot escape the trusted admin origin.');

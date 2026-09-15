import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPublicRedirect } from '../worker/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const wrangler = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8'));

const customDomains = (wrangler.routes || [])
  .filter((route) => route?.custom_domain === true)
  .map((route) => route.pattern);

assert(customDomains.includes('rcitcs.com'), 'Apex public Custom Domain declaration is missing.');
assert(customDomains.includes('www.rcitcs.com'), 'www public Custom Domain declaration is missing.');
assert.equal(new Set(customDomains).size, customDomains.length, 'Public Custom Domain declarations contain a duplicate hostname.');

function redirect(url, init) {
  return canonicalPublicRedirect(new Request(url, init));
}

assert.equal(redirect('https://rcitcs.com/about-us?source=www-test'), null, 'Apex must never redirect to itself.');
assert.equal(redirect('https://admin.rcitcs.com/'), null, 'Production admin host must not enter the www canonicalizer.');
assert.equal(redirect('https://admin-staging.rcitcs.com/'), null, 'Staging admin host must not enter the www canonicalizer.');

const rootResponse = redirect('https://www.rcitcs.com/');
assert.equal(rootResponse.status, 308, 'www root must permanently redirect.');
assert.equal(rootResponse.headers.get('location'), 'https://rcitcs.com/', 'www root must redirect to the apex root.');

const deepResponse = redirect('https://www.rcitcs.com/services/it/cyber-security?utm_source=legacy&utm_medium=www');
assert.equal(deepResponse.status, 308, 'www deep path must permanently redirect.');
assert.equal(
  deepResponse.headers.get('location'),
  'https://rcitcs.com/services/it/cyber-security?utm_source=legacy&utm_medium=www',
  'www redirect must preserve path and query exactly.'
);

const adminAliasResponse = redirect('https://www.rcitcs.com/admin?return=%2Fapplications');
assert.equal(adminAliasResponse.status, 308, 'www /admin must first canonicalize to the apex.');
assert.equal(
  adminAliasResponse.headers.get('location'),
  'https://rcitcs.com/admin?return=%2Fapplications',
  'www /admin must preserve the public alias path for the later admin-domain redirect boundary.'
);

const postResponse = redirect('https://www.rcitcs.com/api/example?x=1', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{"test":true}'
});
assert.equal(postResponse.status, 308, 'www mutation request must use a method-preserving redirect.');
assert.equal(postResponse.headers.get('location'), 'https://rcitcs.com/api/example?x=1');

const openRedirectProbe = redirect('https://www.rcitcs.com//attacker.example/path?next=%2F');
assert.equal(openRedirectProbe.status, 308);
const openRedirectTarget = new URL(openRedirectProbe.headers.get('location'));
assert.equal(openRedirectTarget.origin, 'https://rcitcs.com', 'Leading // path must not escape the trusted apex origin.');
assert.equal(openRedirectTarget.pathname, '//attacker.example/path', 'Leading // path must remain a path on the apex.');
assert.equal(openRedirectTarget.search, '?next=%2F');

const headResponse = redirect('https://www.rcitcs.com/contact?from=head', { method: 'HEAD' });
assert.equal(headResponse.status, 308, 'HEAD must canonicalize consistently.');
assert.equal(headResponse.headers.get('location'), 'https://rcitcs.com/contact?from=head');
assert.equal(await headResponse.text(), '', 'Canonical redirect must not render duplicate content.');

console.log('Phase 17.3 www canonical redirect source/runtime contract: PASS');
console.log('www.rcitcs.com -> 308 https://rcitcs.com with path/query preserved and open-redirect defense locked.');

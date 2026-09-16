import assert from 'node:assert/strict';
import {
  forceHttps,
  canonicalPublicRedirect,
  publicAdminAliasRedirect,
  legacyAdminRedirect
} from '../worker/index.js';

async function expectRedirect(response, status, location) {
  assert.ok(response, 'expected redirect response');
  assert.equal(response.status, status);
  assert.equal(response.headers.get('location'), location);
  assert.match(response.headers.get('strict-transport-security') ?? '', /max-age=31536000/);
}

await expectRedirect(
  forceHttps(new Request('http://rcitcs.com/careers?team=data')),
  308,
  'https://rcitcs.com/careers?team=data'
);

await expectRedirect(
  canonicalPublicRedirect(new Request('https://www.rcitcs.com/services/it/cloud-computing?ref=nav')),
  308,
  'https://rcitcs.com/services/it/cloud-computing?ref=nav'
);

const hostile = canonicalPublicRedirect(new Request('https://www.rcitcs.com//example.invalid/path?x=1'));
assert.ok(hostile);
assert.equal(hostile.status, 308);
assert.equal(new URL(hostile.headers.get('location')).hostname, 'rcitcs.com');

await expectRedirect(
  publicAdminAliasRedirect(new Request('https://rcitcs.com/admin/applications?state=new')),
  308,
  'https://admin.rcitcs.com/applications?state=new'
);

for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
  const response = publicAdminAliasRedirect(new Request('https://rcitcs.com/admin/login', { method }));
  assert.ok(response);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('location'), null);
}

await expectRedirect(
  legacyAdminRedirect(new Request('https://admin.rcitcs.com/admin/applications?state=new')),
  308,
  'https://admin.rcitcs.com/applications?state=new'
);

const legacyMutation = legacyAdminRedirect(new Request('https://admin.rcitcs.com/admin/login', { method: 'POST' }));
assert.ok(legacyMutation);
assert.equal(legacyMutation.status, 409);
assert.equal(new URL(legacyMutation.headers.get('location')).hostname, 'admin.rcitcs.com');

assert.equal(canonicalPublicRedirect(new Request('https://rcitcs.com/')), null);
assert.equal(publicAdminAliasRedirect(new Request('https://www.rcitcs.com/admin')), null);
assert.equal(legacyAdminRedirect(new Request('https://rcitcs.com/admin')), null);

console.log('Phase 17.12 redirect/canonical-host matrix: PASS');

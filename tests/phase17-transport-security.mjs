import assert from 'node:assert/strict';
import publicWorker, {
  TRANSPORT_SECURITY_POLICY,
  canonicalPublicRedirect,
  forceHttps,
  publicAdminAliasRedirect
} from '../worker/index.js';
import adminWorker, {
  ADMIN_TRANSPORT_SECURITY_POLICY,
  adminStagingUnavailableResponse,
  enhanceAdminResponse
} from '../worker/admin-only.js';

assert.equal(TRANSPORT_SECURITY_POLICY, 'max-age=31536000; includeSubDomains; preload');
assert.equal(ADMIN_TRANSPORT_SECURITY_POLICY, TRANSPORT_SECURITY_POLICY);

const publicHttp = forceHttps(new Request('http://rcitcs.com/services/cloud?ref=phase17'));
assert.ok(publicHttp, 'Apex HTTP must be intercepted.');
assert.equal(publicHttp.status, 308);
assert.equal(publicHttp.headers.get('location'), 'https://rcitcs.com/services/cloud?ref=phase17');
assert.equal(publicHttp.headers.get('strict-transport-security'), TRANSPORT_SECURITY_POLICY);

const wwwHttp = forceHttps(new Request('http://www.rcitcs.com/careers?q=1'));
assert.ok(wwwHttp);
assert.equal(wwwHttp.status, 308);
assert.equal(wwwHttp.headers.get('location'), 'https://www.rcitcs.com/careers?q=1');
assert.equal(forceHttps(new Request('http://rc-it-consulting-services.rcitcservices.workers.dev/')), null, 'workers.dev is not a company HSTS/redirect hostname.');

const canonical = canonicalPublicRedirect(new Request('https://www.rcitcs.com/careers?q=1'));
assert.equal(canonical.status, 308);
assert.equal(canonical.headers.get('location'), 'https://rcitcs.com/careers?q=1');
assert.equal(canonical.headers.get('strict-transport-security'), TRANSPORT_SECURITY_POLICY);

const publicAdmin = publicAdminAliasRedirect(new Request('https://rcitcs.com/admin/jobs?state=open'));
assert.equal(publicAdmin.status, 308);
assert.equal(publicAdmin.headers.get('location'), 'https://admin.rcitcs.com/jobs?state=open');
assert.equal(publicAdmin.headers.get('strict-transport-security'), TRANSPORT_SECURITY_POLICY);

const ctx = { waitUntil() {} };
for (const host of ['admin.rcitcs.com', 'admin-staging.rcitcs.com']) {
  const response = await adminWorker.fetch(new Request(`http://${host}/login?from=test`), {}, ctx);
  assert.equal(response.status, 308, `${host} HTTP must redirect before auth/runtime processing.`);
  assert.equal(response.headers.get('location'), `https://${host}/login?from=test`);
  assert.equal(response.headers.get('strict-transport-security'), ADMIN_TRANSPORT_SECURITY_POLICY);
}

const staging = adminStagingUnavailableResponse('GET');
assert.equal(staging.status, 503);
assert.equal(staging.headers.get('strict-transport-security'), ADMIN_TRANSPORT_SECURITY_POLICY);
assert.match(staging.headers.get('cache-control') || '', /no-store/i);
assert.match(staging.headers.get('x-robots-tag') || '', /noindex/i);
assert.equal(staging.headers.get('x-frame-options'), 'DENY');

const enhanced = await enhanceAdminResponse(
  new Response('ok', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }),
  'GET',
  { RC_ADMIN_ENVIRONMENT: 'production' }
);
assert.equal(enhanced.headers.get('strict-transport-security'), ADMIN_TRANSPORT_SECURITY_POLICY);
assert.equal(enhanced.headers.get('x-rc-admin-environment'), 'production');

// The public Worker must apply the same source-level redirect before any runtime
// or asset logic executes.
const publicDefault = await publicWorker.fetch(new Request('http://rcitcs.com/private-test'), {}, ctx);
assert.equal(publicDefault.status, 308);
assert.equal(publicDefault.headers.get('location'), 'https://rcitcs.com/private-test');
assert.equal(publicDefault.headers.get('strict-transport-security'), TRANSPORT_SECURITY_POLICY);

console.log('Phase 17.9 HTTPS/HSTS source contract: PASS');

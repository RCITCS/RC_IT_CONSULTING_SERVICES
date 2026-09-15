import assert from 'node:assert/strict';
import { enhanceAdminResponse, rewriteAdminEdgeReference } from '../worker/admin-only.js';

const upstreamOrigin = 'https://chsizmffzpxcqhaptjeu.supabase.co/functions/v1/admin-auth';

assert.equal(rewriteAdminEdgeReference('/functions/v1/admin-auth/login'), '/login');
assert.equal(rewriteAdminEdgeReference('/functions/v1/admin-auth/forgot-password?email=x'), '/forgot-password?email=x');
assert.equal(rewriteAdminEdgeReference(`${upstreamOrigin}/reset-password?token=abc`), '/reset-password?token=abc');
assert.equal(rewriteAdminEdgeReference('/applications'), '/applications');

const rawHtml = `<!doctype html><html><head></head><body><form method="post" action="/functions/v1/admin-auth/login"><a href="${upstreamOrigin}/forgot-password">Forgot password?</a></form></body></html>`;
const rawResponse = new Response(rawHtml, {
  status: 200,
  headers: {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
    location: `${upstreamOrigin}/forgot-password`,
    'set-cookie': 'rcitcs_admin_session=opaque; Path=/functions/v1/admin-auth; HttpOnly; Secure; SameSite=Strict'
  }
});

const enhanced = await enhanceAdminResponse(rawResponse, 'GET');
const body = await enhanced.text();
assert.match(body, /action="\/login"/);
assert.match(body, /href="\/forgot-password"/);
assert.ok(!body.includes('/functions/v1/admin-auth'), 'dedicated admin HTML must not expose raw Supabase function paths');
assert.ok(!body.includes('chsizmffzpxcqhaptjeu.supabase.co'), 'dedicated admin HTML must not expose the upstream Supabase origin');
assert.equal(enhanced.headers.get('location'), '/forgot-password');
assert.match(enhanced.headers.get('set-cookie') || '', /Path=\/;/);
assert.equal(enhanced.headers.get('x-rc-admin-edge-release'), 'phase12-job-authoring-v1');
assert.equal(enhanced.headers.get('x-rc-admin-build-surface'), 'phase16-security-closure-v1');
assert.match(enhanced.headers.get('content-security-policy') || '', /script-src 'self'/);
assert.match(enhanced.headers.get('content-security-policy') || '', /connect-src 'self'/);

const rawRedirect = new Response(null, {
  status: 302,
  headers: {
    location: `${upstreamOrigin}/applications`,
    'cache-control': 'no-store'
  }
});
const redirected = await enhanceAdminResponse(rawRedirect, 'GET');
assert.equal(redirected.headers.get('location'), '/applications');
assert.equal(redirected.headers.get('x-rc-admin-build-surface'), 'phase16-security-closure-v1');

console.log('Phase 16 dedicated-admin host-local reference convergence: PASS');

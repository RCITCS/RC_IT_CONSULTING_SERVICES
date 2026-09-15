import assert from 'node:assert/strict';
import { enhanceAdminResponse, rewriteAdminEdgeReference } from '../worker/admin-only.js';

const upstreamOrigin = 'https://chsizmffzpxcqhaptjeu.supabase.co/functions/v1/admin-auth';

assert.equal(rewriteAdminEdgeReference('/functions/v1/admin-auth/login'), '/login');
assert.equal(rewriteAdminEdgeReference('/functions/v1/admin-auth/forgot-password?email=x'), '/forgot-password?email=x');
assert.equal(rewriteAdminEdgeReference(`${upstreamOrigin}/reset-password?token=abc`), '/reset-password?token=abc');
assert.equal(rewriteAdminEdgeReference('/applications'), '/applications');

// Reproduce the production regression: an HTML document arrives labelled as
// text/plain. The dedicated edge must recognize the document, normalize the
// media type, and still apply every host-local/security enhancement.
const rawHtml = `<!doctype html><html><head></head><body><form method="post" action="/functions/v1/admin-auth/login"><a href="${upstreamOrigin}/forgot-password">Forgot password?</a></form></body></html>`;
const rawResponse = new Response(rawHtml, {
  status: 200,
  headers: {
    'content-type': 'text/plain; charset=utf-8',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
    location: `${upstreamOrigin}/forgot-password`,
    'set-cookie': 'rcitcs_admin_session=opaque; Path=/functions/v1/admin-auth; HttpOnly; Secure; SameSite=Strict'
  }
});

const enhanced = await enhanceAdminResponse(rawResponse, 'GET');
const body = await enhanced.text();
assert.equal(enhanced.headers.get('content-type'), 'text/html; charset=utf-8');
assert.match(body, /action="\/login"/);
assert.match(body, /href="\/forgot-password"/);
assert.ok(!body.includes('/functions/v1/admin-auth'), 'dedicated admin HTML must not expose raw Supabase function paths');
assert.ok(!body.includes('chsizmffzpxcqhaptjeu.supabase.co'), 'dedicated admin HTML must not expose the upstream Supabase origin');
assert.equal(enhanced.headers.get('location'), '/forgot-password');
assert.match(enhanced.headers.get('set-cookie') || '', /Path=\/;/);
assert.equal(enhanced.headers.get('x-rc-admin-edge-release'), 'phase12-job-authoring-v1');
assert.equal(enhanced.headers.get('x-rc-admin-build-surface'), 'phase16-security-closure-v1');
assert.equal(enhanced.headers.get('x-rc-admin-html-media-fix'), 'phase16-html-content-type-v1');
assert.match(enhanced.headers.get('content-security-policy') || '', /script-src 'self'/);
assert.match(enhanced.headers.get('content-security-policy') || '', /connect-src 'self'/);

// Missing media type is also recoverable when the body is unambiguously HTML.
const missingType = await enhanceAdminResponse(new Response('<html><head></head><body>Admin</body></html>', { status: 200 }), 'GET');
assert.equal(missingType.headers.get('content-type'), 'text/html; charset=utf-8');
assert.equal(missingType.headers.get('x-rc-admin-edge-release'), 'phase12-job-authoring-v1');

// Genuine plain text must stay plain text rather than being converted to HTML.
const plain = await enhanceAdminResponse(new Response('Request rejected', {
  status: 403,
  headers: { 'content-type': 'text/plain; charset=utf-8' }
}), 'GET');
assert.equal(plain.headers.get('content-type'), 'text/plain; charset=utf-8');
assert.equal(await plain.text(), 'Request rejected');
assert.equal(plain.headers.get('x-rc-admin-build-surface'), 'phase16-security-closure-v1');
assert.equal(plain.headers.get('x-rc-admin-html-media-fix'), 'phase16-html-content-type-v1');
assert.equal(plain.headers.get('x-rc-admin-edge-release'), null);

// Binary/private content remains streamed under its original media type.
const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const binary = await enhanceAdminResponse(new Response(pdfBytes, {
  status: 200,
  headers: { 'content-type': 'application/pdf' }
}), 'GET');
assert.equal(binary.headers.get('content-type'), 'application/pdf');
assert.deepEqual(new Uint8Array(await binary.arrayBuffer()), pdfBytes);
assert.equal(binary.headers.get('x-rc-admin-build-surface'), 'phase16-security-closure-v1');
assert.equal(binary.headers.get('x-rc-admin-html-media-fix'), 'phase16-html-content-type-v1');

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
assert.equal(redirected.headers.get('x-rc-admin-html-media-fix'), 'phase16-html-content-type-v1');

console.log('Phase 16 dedicated-admin host-local/media-type convergence: PASS');

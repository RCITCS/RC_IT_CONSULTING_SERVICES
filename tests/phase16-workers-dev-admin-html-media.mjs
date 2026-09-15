import assert from 'node:assert/strict';
import { proxyAdminResponse } from '../src/backend/runtime/worker.js';

const upstreamOrigin = 'https://chsizmffzpxcqhaptjeu.supabase.co/functions/v1/admin-auth';
const rawHtml = `<!doctype html><html><head></head><body><form method="post" action="/functions/v1/admin-auth/login"><a href="${upstreamOrigin}/forgot-password">Forgot password?</a></form></body></html>`;

const recovered = await proxyAdminResponse(new Response(rawHtml, {
  status: 200,
  headers: {
    'content-type': 'text/plain; charset=utf-8',
    location: `${upstreamOrigin}/applications`,
    'set-cookie': 'rcitcs_admin_session=opaque; Path=/functions/v1/admin-auth; HttpOnly; Secure; SameSite=Strict'
  }
}), 'GET', '/admin');

const recoveredBody = await recovered.text();
assert.equal(recovered.headers.get('content-type'), 'text/html; charset=utf-8');
assert.match(recoveredBody, /action="\/admin\/login"/);
assert.match(recoveredBody, /href="\/admin\/forgot-password"/);
assert.match(recoveredBody, /src="\/admin\/ui\.js"/);
assert.ok(!recoveredBody.includes('/functions/v1/admin-auth'), 'workers.dev compatibility admin HTML must not expose raw Supabase function paths');
assert.ok(!recoveredBody.includes('chsizmffzpxcqhaptjeu.supabase.co'), 'workers.dev compatibility admin HTML must not expose the upstream Supabase origin');
assert.equal(recovered.headers.get('location'), '/admin/applications');
assert.match(recovered.headers.get('set-cookie') || '', /Path=\/admin;/);
assert.match(recovered.headers.get('content-security-policy') || '', /form-action 'self'/);
assert.equal(recovered.headers.get('x-content-type-options'), 'nosniff');
assert.match(recovered.headers.get('cache-control') || '', /no-store/);

const missingType = await proxyAdminResponse(new Response('<html><head></head><body>Admin</body></html>', {
  status: 200
}), 'GET', '/admin');
assert.equal(missingType.headers.get('content-type'), 'text/html; charset=utf-8');
assert.match(await missingType.text(), /src="\/admin\/ui\.js"/);

const plain = await proxyAdminResponse(new Response('Request rejected', {
  status: 403,
  headers: { 'content-type': 'text/plain; charset=utf-8' }
}), 'GET', '/admin');
assert.equal(plain.headers.get('content-type'), 'text/plain; charset=utf-8');
assert.equal(await plain.text(), 'Request rejected');

const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const binary = await proxyAdminResponse(new Response(pdfBytes, {
  status: 200,
  headers: { 'content-type': 'application/pdf' }
}), 'GET', '/admin');
assert.equal(binary.headers.get('content-type'), 'application/pdf');
assert.deepEqual(new Uint8Array(await binary.arrayBuffer()), pdfBytes);

console.log('Phase 16 workers.dev compatibility-admin HTML media recovery: PASS');

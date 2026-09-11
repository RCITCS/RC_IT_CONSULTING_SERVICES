import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');

const [edge, gateway, router, handlers] = await Promise.all([
  read('supabase/functions/candidate-applications/index.ts'),
  read('src/backend/providers/candidate-application-gateway.js'),
  read('src/backend/api/router.js'),
  read('src/backend/api/handlers.js')
]);

assert.ok(edge.includes('bearerCredential(request)'), 'Candidate intake must authenticate the server proxy credential.');
assert.ok(edge.includes('constantTimeEqual(presented, serviceKey)'), 'Proxy credential comparison must avoid ordinary early-exit string equality.');
assert.ok(edge.includes('requestBoundary(request, serviceKey)'), 'Service credential must be part of the intake boundary decision.');
assert.ok(edge.indexOf('constantTimeEqual(presented, serviceKey)') < edge.indexOf('x-rcitcs-client-ip'), 'Proxy authentication must happen before forwarded client metadata is trusted.');
assert.ok(!edge.includes('request.headers.get("x-rcitcs-original-origin") || request.headers.get("origin")'), 'The intake Edge Function must not fall back to a direct browser Origin header.');
assert.ok(edge.includes('MAX_CANDIDATE_JSON_BYTES'));
assert.ok(edge.includes('request.body.getReader()'));
assert.ok(edge.includes('reader.cancel()'));

assert.ok(gateway.includes('authorization: `Bearer ${persistence.secretKey}`'));
assert.ok(gateway.includes("headerValue(headers, 'cf-connecting-ip')"));
assert.ok(gateway.includes("headerValue(headers, 'x-vercel-forwarded-for')"));
assert.ok(gateway.includes("'x-rcitcs-client-ip': clientIp"));
assert.ok(!gateway.includes("headerValue(headers, 'x-rcitcs-client-ip')"), 'RC gateway must not trust a browser-supplied forwarded client-IP header.');
assert.ok(router.includes("'career-application': { methods: ['POST'], handler: 'candidateApplication', body: true }"));
assert.ok(handlers.includes('candidateApplicationGateway.forward'));

for (const source of [edge, gateway, router, handlers]) {
  assert.ok(!/sb_secret_[A-Za-z0-9_-]{20,}/.test(source), 'No real Supabase secret may be committed in Phase 12 source.');
  assert.ok(!/SUPABASE_SECRET_KEY\s*=/.test(source), 'No Supabase secret assignment may be committed in Phase 12 source.');
}

console.log('PASS: Phase 12 rejects forged direct-proxy authority, authenticates the RC server gateway before forwarded metadata, and keeps candidate JSON bounded.');

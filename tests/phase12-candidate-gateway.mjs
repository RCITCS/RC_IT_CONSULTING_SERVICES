import assert from 'node:assert/strict';
import { createCandidateApplicationGateway } from '../src/backend/providers/candidate-application-gateway.js';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_phase12_test_only',
  SUPABASE_STORAGE_BUCKET: 'candidate-documents'
};

{
  const calls = [];
  const gateway = createCandidateApplicationGateway({
    env,
    runtime: 'cloudflare-workers',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ ok: true, stage: 'start' }), {
        status: 201,
        headers: { 'content-type': 'application/json' }
      });
    }
  });

  const result = await gateway.forward({
    body: { action: 'start', jobSlug: 'senior-data-engineer' },
    requestId: 'req-phase12-test',
    headers: new Headers({
      origin: 'https://rcitcservices.frsmkgit.workers.dev',
      'cf-connecting-ip': '203.0.113.44',
      'x-rcitcs-client-ip': '198.51.100.77'
    })
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.supabase.co/functions/v1/candidate-applications');
  const sent = new Headers(calls[0].init.headers);
  assert.equal(sent.get('authorization'), 'Bearer sb_secret_phase12_test_only');
  assert.equal(sent.get('apikey'), 'sb_secret_phase12_test_only');
  assert.equal(sent.get('x-rcitcs-application-proxy'), 'cloudflare');
  assert.equal(sent.get('x-rcitcs-original-origin'), 'https://rcitcservices.frsmkgit.workers.dev');
  assert.equal(sent.get('x-rcitcs-client-ip'), '203.0.113.44', 'Cloudflare gateway must ignore browser-supplied proxy IP metadata.');
  assert.deepEqual(JSON.parse(calls[0].init.body), { action: 'start', jobSlug: 'senior-data-engineer' });
}

{
  let called = false;
  const gateway = createCandidateApplicationGateway({
    env,
    runtime: 'cloudflare-workers',
    fetchImpl: async () => { called = true; return new Response('{}'); }
  });
  await assert.rejects(
    gateway.forward({
      body: { action: 'start' },
      headers: new Headers({ 'cf-connecting-ip': '203.0.113.44' })
    }),
    (error) => error?.code === 'REQUEST_REJECTED' && error?.status === 403
  );
  assert.equal(called, false, 'Unverifiable browser requests must be rejected before the Supabase intake service is called.');
}

{
  const calls = [];
  const gateway = createCandidateApplicationGateway({
    env,
    runtime: 'vercel',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  await gateway.forward({
    body: { action: 'cancel' },
    headers: {
      origin: 'https://rc-it-services.vercel.app',
      'x-vercel-forwarded-for': '192.0.2.22',
      'x-forwarded-for': '198.51.100.200'
    }
  });
  assert.equal(new Headers(calls[0].init.headers).get('x-rcitcs-client-ip'), '192.0.2.22');
}

{
  const calls = [];
  const tokenHash = 'a'.repeat(64);
  const gateway = createCandidateApplicationGateway({
    env,
    runtime: 'cloudflare-workers',
    fetchImpl: async (url, init) => {
      const current = { url: String(url), method: init?.method || 'GET', body: init?.body ? JSON.parse(init.body) : null };
      calls.push(current);
      if (current.url.endsWith('/rest/v1/rpc/claim_expired_candidate_intakes')) {
        return new Response(JSON.stringify({
          ok: true,
          claims: [{
            intake_id: '11111111-1111-4111-8111-111111111111',
            token_hash: tokenHash,
            documents: [{ object_path: 'applications/11111111-1111-4111-8111-111111111111/documents/22222222-2222-4222-8222-222222222222.pdf' }]
          }]
        }), { status: 200 });
      }
      if (current.url.includes('/storage/v1/object/candidate-documents')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (current.url.endsWith('/rest/v1/rpc/complete_expired_candidate_intake_cleanup')) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      throw new Error(`Unexpected cleanup request: ${current.url}`);
    }
  });

  const result = await gateway.cleanupExpired({ limit: 25 });
  assert.deepEqual(result, { claimed: 1, cleaned: 1, failed: 0 });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].body.p_limit, 25);
  assert.equal(calls[1].method, 'DELETE');
  assert.deepEqual(calls[1].body.prefixes, ['applications/11111111-1111-4111-8111-111111111111/documents/22222222-2222-4222-8222-222222222222.pdf']);
  assert.deepEqual(calls[2].body, {
    p_intake_id: '11111111-1111-4111-8111-111111111111',
    p_token_hash: tokenHash
  });
}

{
  const gateway = createCandidateApplicationGateway({
    env: { SUPABASE_URL: 'https://example.supabase.co' },
    runtime: 'cloudflare-workers',
    fetchImpl: async () => { throw new Error('must not be called'); }
  });
  assert.equal(gateway.configured, false);
  await assert.rejects(
    gateway.forward({ body: {}, headers: new Headers() }),
    (error) => error?.status === 503
  );
}

console.log('PASS: Phase 12 candidate gateway authenticates intake, uses trusted ingress metadata, rejects spoofed authority and performs retry-safe scheduled private-upload cleanup.');

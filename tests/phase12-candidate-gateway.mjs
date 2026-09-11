import assert from 'node:assert/strict';
import { createCandidateApplicationGateway } from '../src/backend/providers/candidate-application-gateway.js';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_phase12_test_only'
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

console.log('PASS: Phase 12 candidate application gateway uses a server credential, trusted ingress IP metadata and same-origin verification without exposing browser authority.');

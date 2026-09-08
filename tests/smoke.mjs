import { spawn } from 'node:child_process';
import { ALL_ROUTES } from '../src/frontend/app/site-config.js';

const port = 4287;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.mjs'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});

let stderr = '';
child.stderr.on('data', (chunk) => stderr += chunk);

async function waitForHealth() {
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not become healthy. ${stderr}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(response) {
  return response.json();
}

try {
  await waitForHealth();

  for (const route of ALL_ROUTES) {
    const response = await fetch(base + route);
    assert(response.status === 200, `${route} returned ${response.status}`);
    const html = await response.text();
    assert(html.includes('id="site-root"'), `${route} did not return app shell`);
  }

  for (const asset of ['/css/tokens.css', '/css/components.css', '/js/app.js', '/js/pages.js', '/vendor/bootstrap-grid.css']) {
    const response = await fetch(base + asset);
    assert(response.ok, `${asset} returned ${response.status}`);
  }

  let response = await fetch(`${base}/api/health`);
  let body = await json(response);
  assert(response.status === 200 && body.ok === true && body.requestId, 'health response contract failed');
  assert(response.headers.get('x-request-id') === body.requestId, 'health request id header mismatch');

  response = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test', lastName: 'User', company: 'RC QA', jobTitle: 'Tester',
      email: 'qa@example.com', phone: '+44 7700 900000', consultationTopic: 'IT Consultancy',
      message: 'Smoke test', privacyConsent: true
    })
  });
  body = await json(response);
  assert(response.status === 503, `unconfigured contact persistence returned ${response.status}`);
  assert(body.code === 'PERSISTENCE_NOT_CONFIGURED' && body.ok === false, 'contact must fail explicitly when persistence is unavailable');

  response = await fetch(`${base}/api/contact`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ firstName: 'Test' })
  });
  body = await json(response);
  assert(response.status === 422 && body.code === 'VALIDATION_ERROR', `contact validation returned ${response.status}`);

  for (const [endpoint, payload] of [
    ['/api/demo', { name: 'Test User', company: 'RC QA', businessEmail: 'qa@example.com', product: 'Ed+ Cloud' }],
    ['/api/consultation', { name: 'Test User', company: 'RC QA', businessEmail: 'qa@example.com', topic: 'Cloud Computing' }],
    ['/api/chat', { name: 'Test User', company: 'RC QA', businessEmail: 'qa@example.com', message: 'Hello from smoke test' }]
  ]) {
    response = await fetch(base + endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    body = await json(response);
    assert(response.status === 503 && body.code === 'PERSISTENCE_NOT_CONFIGURED', `${endpoint} must not report fake success`);
  }

  response = await fetch(`${base}/api/resume`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  body = await json(response);
  assert(response.status === 501 && body.code === 'RECRUITMENT_STORAGE_NOT_CONFIGURED', `resume boundary returned ${response.status}`);

  response = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  body = await json(response);
  assert(response.status === 501 && body.code === 'AUTH_NOT_CONFIGURED', `login should remain intentionally unconfigured, got ${response.status}`);

  response = await fetch(`${base}/api/contact`);
  assert(response.status === 405 && response.headers.get('allow') === 'POST', 'method contract must return 405 + Allow');

  response = await fetch(`${base}/api/does-not-exist`);
  assert(response.status === 404, 'unknown API route should return 404');

  console.log(`PASS: ${ALL_ROUTES.length} routes + assets + Phase 7 API validation, explicit provider failure and boundary smoke tests.`);
} finally {
  child.kill('SIGTERM');
}

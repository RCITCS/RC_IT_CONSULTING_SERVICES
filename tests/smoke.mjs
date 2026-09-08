import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ALL_ROUTES } from '../src/frontend/app/site-config.js';

const temp = await mkdtemp(path.join(os.tmpdir(), 'rc-it-smoke-'));
const dataDir = path.join(temp, 'data');
const uploadDir = path.join(temp, 'uploads');
const port = 4287;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.mjs'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: String(port), RC_DATA_DIR: dataDir, RC_UPLOAD_DIR: uploadDir },
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

  let response = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: 'Test', lastName: 'User', company: 'RC QA', phone: '+44 7700 900000', businessEmail: 'qa@example.com', jobTitle: 'Tester', message: 'Smoke test' })
  });
  assert(response.status === 201, `contact valid returned ${response.status}`);

  response = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: 'Test' })
  });
  assert(response.status === 422, `contact validation returned ${response.status}`);

  response = await fetch(`${base}/api/demo`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', company: 'RC QA', businessEmail: 'qa@example.com', product: 'Ed+ Cloud' })
  });
  assert(response.status === 201, `demo returned ${response.status}`);

  response = await fetch(`${base}/api/consultation`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', company: 'RC QA', businessEmail: 'qa@example.com', topic: 'Cloud Computing' })
  });
  assert(response.status === 201, `consultation returned ${response.status}`);

  response = await fetch(`${base}/api/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', company: 'RC QA', businessEmail: 'qa@example.com', message: 'Hello from smoke test' })
  });
  assert(response.status === 201, `chat returned ${response.status}`);

  response = await fetch(`${base}/api/resume`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'qa@example.com', primarySkill: 'Frontend', consent: true, fileName: 'test.pdf', mimeType: 'application/pdf', fileBase64: Buffer.from('%PDF-1.4\n%%EOF').toString('base64') })
  });
  assert(response.status === 201, `resume returned ${response.status}`);

  response = await fetch(`${base}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'qa@example.com', password: 'not-used' })
  });
  assert(response.status === 501, `login should be intentionally unconfigured, got ${response.status}`);

  console.log(`PASS: ${ALL_ROUTES.length} routes + structured source assets + API validation/chat/upload smoke tests.`);
} finally {
  child.kill('SIGTERM');
  await rm(temp, { recursive: true, force: true });
}

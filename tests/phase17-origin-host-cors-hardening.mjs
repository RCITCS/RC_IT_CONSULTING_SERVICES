import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import publicWorker from '../worker/index.js';
import { createCandidateApplicationGateway } from '../src/backend/providers/candidate-application-gateway.js';
import { createPublicJobsRepository } from '../src/backend/repositories/public-jobs-repository.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));

const publicConfig = readJson('wrangler.jsonc');
const productionAdmin = readJson('wrangler.admin-production.jsonc');
const stagingAdmin = readJson('wrangler.admin-staging.jsonc');
const publicSource = read('worker/index.js');
const candidateGatewaySource = read('src/backend/providers/candidate-application-gateway.js');
const candidateEdge = read('supabase/functions/candidate-applications/index.ts');
const careersEdge = read('supabase/functions/public-careers/index.ts');
const adminEdge = read('supabase/functions/admin-auth/index.ts');

for (const config of [publicConfig, productionAdmin, stagingAdmin]) {
  assert.equal(config.workers_dev, false, `${config.name} must not expose a workers.dev production URL.`);
  assert.equal(config.preview_urls, false, `${config.name} must not expose public preview URLs.`);
}

assert.match(publicSource, /const PUBLIC_ALLOWED_HOSTS = new Set\(\[PUBLIC_PRODUCTION_HOST, WWW_PUBLIC_HOST\]\)/);
assert.match(publicSource, /if \(!PUBLIC_ALLOWED_HOSTS\.has\(host\)\) return rejectedHostResponse\(\)/);

for (const host of [
  'rc-it-consulting-services.rcitcservices.workers.dev',
  'preview-rc-it-consulting-services.rcitcservices.workers.dev',
  'rc-it-services.vercel.app',
  'example.invalid'
]) {
  const response = await publicWorker.fetch(new Request(`https://${host}/`), {}, { waitUntil() {} });
  assert.equal(response.status, 404, `${host} must fail closed at the public Worker host boundary.`);
  assert.match(response.headers.get('cache-control') || '', /no-store/i);
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/i);
}

assert.doesNotMatch(candidateGatewaySource, /rc-it-consulting-services\.rcitcservices\.workers\.dev/);
assert.doesNotMatch(candidateGatewaySource, /rc-it-services\.vercel\.app/);
assert.doesNotMatch(candidateGatewaySource, /runtime === 'vercel'/);
assert.match(candidateGatewaySource, /if \(runtime === 'cloudflare-workers'\) return 'cloudflare'/);
assert.match(candidateEdge, /const ALLOWED_PROXIES = new Set\(\["cloudflare"\]\)/);
assert.doesNotMatch(candidateEdge, /rc-it-consulting-services\.rcitcservices\.workers\.dev/);
assert.doesNotMatch(candidateEdge, /rc-it-services\.vercel\.app/);
assert.doesNotMatch(candidateEdge.toLowerCase(), /access-control-allow-origin/);

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_phase17_boundary_test',
  SUPABASE_STORAGE_BUCKET: 'candidate-documents'
};
const retired = createCandidateApplicationGateway({ env, runtime: 'vercel', fetchImpl: async () => { throw new Error('must not call'); } });
assert.equal(retired.configured, false);

const careersCalls = [];
const careers = createPublicJobsRepository({
  env: { PUBLIC_CAREERS_API_URL: 'https://example.supabase.co/functions/v1/public-careers', SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY },
  fetchImpl: async (url, init) => {
    careersCalls.push({ url: String(url), init });
    return new Response(JSON.stringify({ jobs: [], selected: null }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
});
assert.equal(careers.configured, true);
await careers.getCareersContext('');
const careersHeaders = new Headers(careersCalls[0].init.headers);
assert.equal(careersHeaders.get('authorization'), `Bearer ${env.SUPABASE_SECRET_KEY}`);
assert.equal(careersHeaders.get('apikey'), env.SUPABASE_SECRET_KEY);
assert.equal(careersHeaders.get('x-rcitcs-public-proxy'), 'cloudflare');

assert.match(careersEdge, /proxyBoundaryOk\(request, key\)/);
assert.match(careersEdge, /constantTimeEqual/);
assert.match(careersEdge, /REQUEST_REJECTED/);
assert.doesNotMatch(careersEdge.toLowerCase(), /access-control-allow-origin/);
assert.doesNotMatch(adminEdge.toLowerCase(), /access-control-allow-origin/);
assert.match(adminEdge, /const ADMIN_PROXY_HEADER = "x-rcitcs-admin-proxy"/);
assert.match(adminEdge, /ADMIN_PUBLIC_ORIGINS/);
assert.match(adminEdge, /if \(request\.method === "POST" && !originOk\(request, url\)\)/);

console.log('Phase 17.10 origin/Host/CORS/direct-backend hardening contract: PASS');
console.log('workers.dev/preview exposure is disabled; unowned Hosts fail closed; sensitive backend hops are authenticated or mutation-gated with no browser CORS grant.');

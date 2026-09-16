import assert from 'node:assert/strict';
import fs from 'node:fs';

const publicConfig = fs.readFileSync('wrangler.jsonc', 'utf8');
const prodAdmin = fs.readFileSync('wrangler.admin-production.jsonc', 'utf8');
const stagingAdmin = fs.readFileSync('wrangler.admin-staging.jsonc', 'utf8');
const publicHeaders = fs.readFileSync('public/_headers', 'utf8');
const publicWorker = fs.readFileSync('worker/index.js', 'utf8');
const adminWorker = fs.readFileSync('worker/admin-only.js', 'utf8');
const candidateFunction = fs.readFileSync('supabase/functions/candidate-applications/index.ts', 'utf8');
const publicCareersFunction = fs.readFileSync('supabase/functions/public-careers/index.ts', 'utf8');
const doc = fs.readFileSync('docs/PHASE_17_13_DOMAIN_SECURITY.md', 'utf8');

for (const [label, config] of [['public', publicConfig], ['production admin', prodAdmin], ['staging admin', stagingAdmin]]) {
  assert.match(config, /"workers_dev"\s*:\s*false/, `${label} workers.dev must be disabled`);
  assert.match(config, /"preview_urls"\s*:\s*false/, `${label} preview URLs must be disabled`);
}

assert.match(publicHeaders, /X-Frame-Options:\s*DENY/i);
assert.match(publicHeaders, /X-Content-Type-Options:\s*nosniff/i);
assert.match(publicHeaders, /Strict-Transport-Security:\s*max-age=/i);

assert.match(publicWorker, /PUBLIC_ALLOWED_HOSTS/);
assert.match(publicWorker, /return rejectedHostResponse\(\)/);
assert.match(publicWorker, /publicAdminAliasRedirect/);
assert.match(publicWorker, /TRANSPORT_SECURITY_POLICY/);
assert.match(publicWorker, /status:\s*404/);

assert.match(adminWorker, /x-robots-tag/i);
assert.match(adminWorker, /no-store/i);
assert.match(adminWorker, /content-security-policy/i);
assert.match(adminWorker, /x-frame-options/i);
assert.match(adminWorker, /strict-transport-security/i);
assert.doesNotMatch(adminWorker, /Domain=rcitcs\.com/i);

assert.doesNotMatch(candidateFunction, /Access-Control-Allow-Origin['"]?\s*[:=]\s*['"]\*['"]/i);
assert.doesNotMatch(publicCareersFunction, /Access-Control-Allow-Origin['"]?\s*[:=]\s*['"]\*['"]/i);

assert.match(stagingAdmin, /RC_ADMIN_STAGING_MODE/);
assert.match(stagingAdmin, /unavailable/);
assert.match(doc, /_dmarc\.rcitcs\.com/);
assert.match(doc, /v=DMARC1; p=none;/);
assert.match(doc, /20d349f3f75ab611adb3f987188636e7/);
assert.match(doc, /not accepted as RC IT production authority/i);

console.log('Phase 17.13 domain-security source contract: PASS');

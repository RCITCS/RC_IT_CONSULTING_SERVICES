import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const publicConfig = read('wrangler.jsonc');
const entryWorker = read('worker/index.js');
const runtimeWorker = read('src/backend/runtime/worker.js');
const baseline = read('docs/PHASE_17_DOMAIN_BASELINE.md');

// 17.2 authority: the public production apex is owned by exactly the public Worker.
assert.match(publicConfig, /"name"\s*:\s*"rc-it-consulting-services"/);
assert.match(publicConfig, /"main"\s*:\s*"\.\/worker\/index\.js"/);
assert.match(publicConfig, /"pattern"\s*:\s*"rcitcs\.com"\s*,?\s*\n\s*"custom_domain"\s*:\s*true/);

// 17.2 must not pull later modules forward. www is 17.3 and dedicated admin ownership is 17.4/17.7.
assert.doesNotMatch(publicConfig, /"pattern"\s*:\s*"www\.rcitcs\.com"/);
assert.doesNotMatch(publicConfig, /"pattern"\s*:\s*"admin(?:-staging)?\.rcitcs\.com/);

// workers.dev remains deliberately unchanged until the direct-backend/exposure hardening module.
assert.match(publicConfig, /"workers_dev"\s*:\s*true/);

// Dedicated admin hosts must not be treated as ordinary public-site hosts.
assert.match(entryWorker, /const DEDICATED_ADMIN_HOSTS = new Set\(\['admin\.rcitcs\.com', 'admin-staging\.rcitcs\.com'\]\)/);
assert.match(entryWorker, /if \(DEDICATED_ADMIN_HOSTS\.has\(host\)\) \{\s*return adminWorker\.fetch/);
assert.match(entryWorker, /return runtime\.fetch\(request, env, ctx\)/);

// Preserve the public /admin separation inherited from Phase 16 while 17.2 only locks apex ownership.
assert.match(runtimeWorker, /const ADMIN_PRODUCTION_ORIGIN = 'https:\/\/admin\.rcitcs\.com'/);
assert.match(runtimeWorker, /function redirectPublicAdminAlias/);
assert.match(runtimeWorker, /return new Response\('Not Found', \{ status: 404/);
assert.match(runtimeWorker, /return new Response\(null, \{ status: 308, headers \}\)/);

// 17.1 must already have classified the client account as authoritative before 17.2 can exist.
assert.match(baseline, /client Cloudflare account/i);
assert.match(baseline, /3fdd024f6fbc25c03ed4481352576540/);
assert.match(baseline, /20d349f3f75ab611adb3f987188636e7/);
assert.match(baseline, /not approved for RC IT work/i);
assert.match(baseline, /does not manage the `rcitcs\.com` zone/i);

console.log('Phase 17.2 public production domain source contract: PASS');
console.log('AUTHORITATIVE APEX: rcitcs.com -> rc-it-consulting-services custom domain.');
console.log('DEFERRED: www (17.3), admin ownership convergence (17.4/17.7), workers.dev exposure hardening (17.10).');

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
const seoConfig = read('src/frontend/seo/seo-config.js');
const baseline = read('docs/PHASE_17_DOMAIN_BASELINE.md');
const phase172 = read('docs/PHASE_17_2_PUBLIC_PRODUCTION_DOMAIN.md');

// 17.2 authority: the public production apex remains owned by the public Worker.
assert.match(publicConfig, /"name"\s*:\s*"rc-it-consulting-services"/);
assert.match(publicConfig, /"main"\s*:\s*"\.\/worker\/index\.js"/);
assert.match(publicConfig, /"pattern"\s*:\s*"rcitcs\.com"\s*,?\s*\n\s*"custom_domain"\s*:\s*true/);

// The canonical public identity must remain source-controlled, not dependent on a
// Cloudflare build variable that can silently drift to workers.dev or another host.
assert.match(seoConfig, /export const SITE_ORIGIN = 'https:\/\/rcitcs\.com'/);
assert.doesNotMatch(seoConfig, /PUBLIC_ORIGIN/);
assert.doesNotMatch(seoConfig, /SITE_ORIGIN\s*=.*workers\.dev/);

// Later modules may intentionally add approved public aliases, but admin/staging
// ownership must never leak into the public Worker declaration.
assert.doesNotMatch(publicConfig, /"pattern"\s*:\s*"admin(?:-staging)?\.rcitcs\.com/);

// The 17.2 closure record remains historical evidence that www was deferred to 17.3.
assert.match(phase172, /Status: \*\*COMPLETE — exact-head source\/build\/live-baseline acceptance passed\*\*/);
assert.match(phase172, /`www\.rcitcs\.com` — Module 17\.3/);
assert.match(phase172, /Module 17\.2 is COMPLETE/);

// Phase 17.10 closes the direct workers.dev and preview URL exposure that 17.2
// explicitly deferred.
assert.match(publicConfig, /"workers_dev"\s*:\s*false/);
assert.match(publicConfig, /"preview_urls"\s*:\s*false/);

// Dedicated admin hosts must not be treated as ordinary public-site hosts. The
// transport wrapper may decorate the returned response with HSTS but must not
// change which Worker handles a dedicated admin hostname.
assert.match(entryWorker, /const DEDICATED_ADMIN_HOSTS = new Set\(\['admin\.rcitcs\.com', 'admin-staging\.rcitcs\.com'\]\)/);
assert.match(entryWorker, /if \(DEDICATED_ADMIN_HOSTS\.has\(host\)\) \{\s*return secureTransportResponse\(await adminWorker\.fetch/);
assert.match(entryWorker, /if \(!PUBLIC_ALLOWED_HOSTS\.has\(host\)\) return rejectedHostResponse\(\)/);
assert.match(entryWorker, /runtime\.fetch\(request, env, ctx\)/);

// Preserve the public /admin separation inherited from Phase 16.
assert.match(runtimeWorker, /const ADMIN_PRODUCTION_ORIGIN = 'https:\/\/admin\.rcitcs\.com'/);
assert.match(runtimeWorker, /function redirectPublicAdminAlias/);
assert.match(runtimeWorker, /return new Response\('Not Found', \{ status: 404/);
assert.match(runtimeWorker, /return new Response\(null, \{ status: 308, headers \}\)/);

// 17.1 remains immutable historical evidence of the pre-hardening control plane.
assert.match(baseline, /client Cloudflare account/i);
assert.match(baseline, /3fdd024f6fbc25c03ed4481352576540/);
assert.match(baseline, /20d349f3f75ab611adb3f987188636e7/);
assert.match(baseline, /not approved for RC IT work/i);
assert.match(baseline, /does not manage the `rcitcs\.com` zone/i);

console.log('Phase 17.2 public production domain invariant contract: PASS');
console.log('AUTHORITATIVE APEX: rcitcs.com remains owned by rc-it-consulting-services.');
console.log('PHASE 17.10: workers.dev/preview exposure is disabled and unknown public hosts fail closed.');

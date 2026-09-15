import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const publicConfig = read('wrangler.jsonc');
const adminProductionConfig = read('wrangler.admin-production.jsonc');
const adminStagingConfig = read('wrangler.admin-staging.jsonc');
const legacyConfig = read('cloudflare/legacy-rcitcservices/wrangler.jsonc');
const adminOnlyWorker = read('worker/admin-only.js');
const runtimeWorker = read('src/backend/runtime/worker.js');
const domainSmoke = read('.github/workflows/admin-portal-domain-smoke.yml');
const auditDoc = read('docs/PHASE_17_DOMAIN_BASELINE.md');

// Public production declaration.
assert.match(publicConfig, /"name"\s*:\s*"rc-it-consulting-services"/);
assert.match(publicConfig, /"workers_dev"\s*:\s*true/);
assert.match(publicConfig, /"pattern"\s*:\s*"rcitcs\.com"/);
assert.doesNotMatch(publicConfig, /www\.rcitcs\.com/);

// Intended canonical production-admin declaration.
assert.match(adminProductionConfig, /"name"\s*:\s*"rcitcs-admin-production"/);
assert.match(adminProductionConfig, /"workers_dev"\s*:\s*false/);
assert.match(adminProductionConfig, /"pattern"\s*:\s*"admin\.rcitcs\.com"/);
assert.doesNotMatch(adminProductionConfig, /admin-staging\.rcitcs\.com/);

// Phase-16 connected admin deployment baseline. This overlap is intentional
// evidence for Phase 17.1, not the desired final Phase-17 ownership state.
assert.match(adminStagingConfig, /"name"\s*:\s*"rcitcs-admin-staging"/);
assert.match(adminStagingConfig, /"workers_dev"\s*:\s*false/);
assert.match(adminStagingConfig, /"pattern"\s*:\s*"admin\.rcitcs\.com"/);
assert.match(adminStagingConfig, /"pattern"\s*:\s*"admin-staging\.rcitcs\.com"/);

// The checked-in legacy Worker must not silently reclaim a company hostname.
assert.match(legacyConfig, /"name"\s*:\s*"rcitcservices"/);
assert.doesNotMatch(legacyConfig, /"pattern"\s*:\s*"(?:www\.)?rcitcs\.com"/);
assert.doesNotMatch(legacyConfig, /"pattern"\s*:\s*"admin(?:-staging)?\.rcitcs\.com"/);

// Dedicated admin host and public alias behavior carried from Phase 16.
assert.match(adminOnlyWorker, /admin\.rcitcs\.com/);
assert.match(adminOnlyWorker, /admin-staging\.rcitcs\.com/);
assert.match(runtimeWorker, /const ADMIN_PRODUCTION_ORIGIN = 'https:\/\/admin\.rcitcs\.com'/);
assert.match(runtimeWorker, /const ADMIN_HOSTS = new Set\(\['admin\.rcitcs\.com', 'admin-staging\.rcitcs\.com'\]\)/);
assert.match(runtimeWorker, /function redirectPublicAdminAlias/);
assert.match(runtimeWorker, /return new Response\('Not Found', \{ status: 404/);
assert.match(runtimeWorker, /return new Response\(null, \{ status: 308, headers \}\)/);
assert.match(runtimeWorker, /isAdminPath\(url\.pathname\) && isInternalWorkerHost\(url\.hostname\)/);

// Existing production smoke must continue to protect the public/admin split.
assert.match(domainSmoke, /https:\/\/admin\.rcitcs\.com/);
assert.match(domainSmoke, /https:\/\/admin-staging\.rcitcs\.com/);
assert.match(domainSmoke, /https:\/\/rcitcs\.com/);
assert.match(domainSmoke, /test "\$alias_code" = '308'/);
assert.match(domainSmoke, /test "\$post_code" = '404'/);

// Phase 17.1 audit ledger. The primary account inventory is complete, but
// exact-head CI exposed a second Cloudflare account/build surface involving
// the legacy rcitcservices Worker. These assertions prevent the blocker from
// being silently lost before cross-account ownership is classified.
assert.match(auditDoc, /Status: \*\*17\.1 OPEN — secondary Cloudflare ownership surface discovered during closure CI\*\*/);
assert.match(auditDoc, /exactly two Worker applications in this account/i);
assert.match(auditDoc, /`admin\.rcitcs\.com\/\*` \| Route/);
assert.match(auditDoc, /`admin\.rcitcs\.com` \| Production Custom Domain/);
assert.match(auditDoc, /`www\.rcitcs\.com` as a Production Custom Domain/);
assert.match(auditDoc, /Cloudflare displays a configuration-drift warning/);
assert.match(auditDoc, /Workers Builds: rcitcservices/);
assert.match(auditDoc, /20d349f3f75ab611adb3f987188636e7/);
assert.match(auditDoc, /different Cloudflare account/);
assert.match(auditDoc, /Module 17\.1 remains OPEN/);
assert.match(auditDoc, /No production behavior was changed during this audit/);

console.log('Phase 17.1 source/domain baseline and control-plane evidence ledger: PASS');
console.log('PRIMARY ACCOUNT: inventory complete; admin ownership overlap and broken www state recorded without mutation.');
console.log('OPEN BLOCKER: exact-head Cloudflare GitHub App check targets secondary account 20d349f3f75ab611adb3f987188636e7 and Worker rcitcservices.');
console.log('NEXT GATE: classify the secondary account read-only before 17.1 can close or 17.2 can begin.');

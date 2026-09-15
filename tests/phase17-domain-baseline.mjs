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

// Phase 17.1 authoritative control-plane findings are intentionally recorded
// as immutable audit evidence. These assertions do not pretend to query
// Cloudflare; they protect the accepted audit ledger from being silently
// reverted to the earlier incomplete assumptions.
assert.match(auditDoc, /Status: \*\*17\.1 COMPLETE — read-only control-plane inventory closed\*\*/);
assert.match(auditDoc, /exactly two Worker applications/i);
assert.match(auditDoc, /`rcitcs-admin-production` \| \*\*not present in this Cloudflare account\*\*/);
assert.match(auditDoc, /`rcitcservices` \| \*\*not present as a Worker application\*\*/);
assert.match(auditDoc, /`admin\.rcitcs\.com\/\*` \| Route/);
assert.match(auditDoc, /`admin\.rcitcs\.com` \| Production Custom Domain/);
assert.match(auditDoc, /`www\.rcitcs\.com` as a \*\*Production Custom Domain\*\*/);
assert.match(auditDoc, /no A, AAAA, or CNAME answer for `www\.rcitcs\.com`/);
assert.match(auditDoc, /Cloudflare displays an explicit configuration-drift warning/);
assert.match(auditDoc, /no production behavior changed during the audit/i);
assert.match(auditDoc, /Module 17\.1 is COMPLETE/);

console.log('Phase 17.1 source/domain baseline and control-plane evidence ledger: PASS');
console.log('CLOSED FINDING: authoritative Cloudflare inventory contains exactly two active RC IT Workers; rcitcs-admin-production and legacy rcitcservices are source-only today.');
console.log('CLOSED FINDING: admin.rcitcs.com has competing Route and Custom Domain ownership, and www.rcitcs.com is configured as a Custom Domain but is not publicly resolvable.');
console.log('NEXT GATE: do not begin 17.2 until this exact branch head passes CI.');

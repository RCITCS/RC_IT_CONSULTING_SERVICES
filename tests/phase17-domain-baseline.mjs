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

// 17.1 permanently locks the historical audit ledger. Working configuration is
// allowed to converge in later modules without rewriting what was observed then.
assert.match(publicConfig, /"name"\s*:\s*"rc-it-consulting-services"/);
assert.match(publicConfig, /"workers_dev"\s*:\s*true/);
assert.match(publicConfig, /"pattern"\s*:\s*"rcitcs\.com"/);
assert.match(publicConfig, /"pattern"\s*:\s*"www\.rcitcs\.com"/);
assert.doesNotMatch(publicConfig, /"pattern"\s*:\s*"admin(?:-staging)?\.rcitcs\.com/);

assert.match(adminProductionConfig, /"name"\s*:\s*"rcitcs-admin-production"/);
assert.match(adminProductionConfig, /"workers_dev"\s*:\s*false/);
assert.match(adminProductionConfig, /"RC_ADMIN_ENVIRONMENT"\s*:\s*"production"/);
assert.match(adminProductionConfig, /"pattern"\s*:\s*"admin\.rcitcs\.com"/);
assert.doesNotMatch(adminProductionConfig, /admin-staging\.rcitcs\.com/);

assert.match(adminStagingConfig, /"name"\s*:\s*"rcitcs-admin-staging"/);
assert.match(adminStagingConfig, /"workers_dev"\s*:\s*false/);
assert.match(adminStagingConfig, /"RC_ADMIN_ENVIRONMENT"\s*:\s*"staging"/);
assert.match(adminStagingConfig, /"RC_ADMIN_STAGING_MODE"\s*:\s*"unavailable"/);
assert.doesNotMatch(adminStagingConfig, /"pattern"\s*:\s*"admin\.rcitcs\.com"/);
assert.match(adminStagingConfig, /"pattern"\s*:\s*"admin-staging\.rcitcs\.com"/);

assert.match(legacyConfig, /"name"\s*:\s*"rcitcservices"/);
assert.doesNotMatch(legacyConfig, /"pattern"\s*:\s*"(?:www\.)?rcitcs\.com"/);
assert.doesNotMatch(legacyConfig, /"pattern"\s*:\s*"admin(?:-staging)?\.rcitcs\.com"/);

assert.match(adminOnlyWorker, /admin\.rcitcs\.com/);
assert.match(adminOnlyWorker, /admin-staging\.rcitcs\.com/);
assert.match(adminOnlyWorker, /x-rc-admin-environment/);
assert.match(runtimeWorker, /const ADMIN_PRODUCTION_ORIGIN = 'https:\/\/admin\.rcitcs\.com'/);
assert.match(runtimeWorker, /const ADMIN_HOSTS = new Set\(\['admin\.rcitcs\.com', 'admin-staging\.rcitcs\.com'\]\)/);
assert.match(runtimeWorker, /function redirectPublicAdminAlias/);
assert.match(runtimeWorker, /return new Response\('Not Found', \{ status: 404/);
assert.match(runtimeWorker, /return new Response\(null, \{ status: 308, headers \}\)/);
assert.match(runtimeWorker, /isAdminPath\(url\.pathname\) && isInternalWorkerHost\(url\.hostname\)/);

assert.match(domainSmoke, /https:\/\/admin\.rcitcs\.com/);
assert.match(domainSmoke, /https:\/\/admin-staging\.rcitcs\.com/);
assert.match(domainSmoke, /https:\/\/rcitcs\.com/);
assert.match(domainSmoke, /test "\$alias_code" = '308'/);
assert.match(domainSmoke, /test "\$post_code" = '404'/);

// Authoritative historical control-plane findings remain immutable evidence.
assert.match(auditDoc, /Status: \*\*17\.1 COMPLETE — read-only control-plane inventory closed\*\*/);
assert.match(auditDoc, /Account ID: `3fdd024f6fbc25c03ed4481352576540`/);
assert.match(auditDoc, /exactly two active Worker applications/i);
assert.match(auditDoc, /`admin\.rcitcs\.com\/\*` \| Route/);
assert.match(auditDoc, /`admin\.rcitcs\.com` \| Production Custom Domain/);
assert.match(auditDoc, /`www\.rcitcs\.com` as a Production Custom Domain/);
assert.match(auditDoc, /public DNS returns no A, AAAA, or CNAME answer for `www\.rcitcs\.com`/i);
assert.match(auditDoc, /Cloudflare displays a configuration-drift warning/);
assert.match(auditDoc, /Workers Builds: rcitcservices/);
assert.match(auditDoc, /20d349f3f75ab611adb3f987188636e7/);
assert.match(auditDoc, /separate\/main Cloudflare account/i);
assert.match(auditDoc, /`infinexit\.com`/);
assert.match(auditDoc, /`nxnlogistics\.com`/);
assert.match(auditDoc, /does not manage the `rcitcs\.com` zone/i);
assert.match(auditDoc, /stale cross-account GitHub\/Cloudflare build integration/i);
assert.match(auditDoc, /do not deploy RC IT to account `20d349f3f75ab611adb3f987188636e7`/i);
assert.match(auditDoc, /No production behavior was changed during this audit/);
assert.match(auditDoc, /Module 17\.1 is COMPLETE/);

console.log('Phase 17.1 historical control-plane baseline ledger: PASS');
console.log('Working source topology may converge after 17.1; the historical Cloudflare evidence remains unchanged.');
console.log('CROSS-ACCOUNT: personal account 20d349f3f75ab611adb3f987188636e7 remains outside the rcitcs.com ownership boundary and prohibited as an RC IT deployment target.');

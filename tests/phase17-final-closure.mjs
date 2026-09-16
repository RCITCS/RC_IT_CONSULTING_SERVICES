import assert from 'node:assert/strict';
import fs from 'node:fs';

const closure = fs.readFileSync('docs/PHASE_17_16_EXACT_SHA_CLOSURE.md', 'utf8');
const cutover = fs.readFileSync('docs/DOMAIN_CUTOVER.md', 'utf8');
const mirror = fs.readFileSync('.github/workflows/mirror-to-rcitcs.yml', 'utf8');
const exact = fs.readFileSync('.github/workflows/cloudflare-exact-deployment.yml', 'utf8');

const moduleDocs = [
  'docs/PHASE_17_DOMAIN_BASELINE.md',
  'docs/PHASE_17_2_PUBLIC_PRODUCTION_DOMAIN.md',
  'docs/PHASE_17_3_WWW_CANONICAL_REDIRECT.md',
  'docs/PHASE_17_4_PRODUCTION_ADMIN_DOMAIN.md',
  'docs/PHASE_17_5_ADMIN_STAGING_ISOLATION.md',
  'docs/PHASE_17_6_PUBLIC_ADMIN_SEPARATION.md',
  'docs/PHASE_17_7_DOMAIN_OWNERSHIP_CONVERGENCE.md',
  'docs/PHASE_17_8_DNS_CLEANUP.md',
  'docs/PHASE_17_9_TLS_HTTPS_HSTS.md',
  'docs/PHASE_17_10_ORIGIN_HOST_CORS_HARDENING.md',
  'docs/PHASE_17_11_EMAIL_DOMAIN_DNS.md',
  'docs/PHASE_17_12_REDIRECT_CANONICAL_MATRIX.md',
  'docs/PHASE_17_13_DOMAIN_SECURITY.md',
  'docs/PHASE_17_14_PRODUCTION_RUNTIME_ACCEPTANCE.md',
  'docs/PHASE_17_15_MULTI_ROLE_REVIEW.md'
];
for (const path of moduleDocs) assert.ok(fs.statSync(path).size > 0, `${path} must exist`);

assert.match(closure, /only overall Phase-17 closure gate/i);
assert.match(closure, /exact verified head SHA/i);
assert.match(closure, /RCITCS\/RC_IT_CONSULTING_SERVICES/);
assert.match(closure, /primary and mirror main SHAs to be identical/i);
assert.match(closure, /Supabase Security Advisor/i);
assert.match(closure, /_dmarc/i);
assert.match(closure, /20d349f3f75ab611adb3f987188636e7/);
assert.match(closure, /3fdd024f6fbc25c03ed4481352576540/);
assert.match(closure, /must not be deleted blindly/i);
assert.match(closure, /17\.16 OPEN/i);

assert.match(cutover, /rcitcs\.com` is the public production identity/);
assert.match(cutover, /rcitcs-admin-production/);
assert.match(cutover, /intentionally unavailable/);
assert.match(cutover, /workers\.dev.*must not remain a live production website endpoint/i);
assert.doesNotMatch(cutover, /PENDING CLOUDFLARE ACCOUNT \/ ZONE LINKAGE/);
assert.doesNotMatch(cutover, /rcitcservices\.frsmkgit\.workers\.dev/);

assert.match(mirror, /TARGET_REPOSITORY: RCITCS\/RC_IT_CONSULTING_SERVICES/);
assert.match(mirror, /SOURCE_SHA=.*git rev-parse HEAD/);
assert.match(mirror, /REMOTE_SHA=/);
assert.match(mirror, /Source and destination SHAs differ/);

assert.match(exact, /EXPECTED_SHA: \$\{\{ github\.sha \}\}/);
assert.match(exact, /rc-deployment-sha/);
assert.match(exact, /BASE='https:\/\/rcitcs\.com'/);

console.log('Phase 17.16 exact-SHA production closure contract: PASS');

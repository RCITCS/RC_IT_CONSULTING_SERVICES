import assert from 'node:assert/strict';
import fs from 'node:fs';

const ci = fs.readFileSync('.github/workflows/cloudflare-deploy.yml', 'utf8');
const exact = fs.readFileSync('.github/workflows/cloudflare-exact-deployment.yml', 'utf8');
const doc = fs.readFileSync('docs/PHASE_17_14_PRODUCTION_RUNTIME_ACCEPTANCE.md', 'utf8');

assert.match(ci, /BASE='https:\/\/rcitcs\.com'/);
assert.match(ci, /ADMIN='https:\/\/admin\.rcitcs\.com'/);
assert.doesNotMatch(ci, /BASE='https:\/\/rc-it-consulting-services\.rcitcservices\.workers\.dev'/);
assert.doesNotMatch(ci, /Verify Vercel fallback routes remain reachable/);
assert.doesNotMatch(ci, /Vercel is retained as a secondary live fallback/);
assert.match(ci, /x-rc-admin-environment: \*production/i);
assert.match(ci, /x-rc-admin-staging-state: \*intentionally-unavailable/i);
assert.match(ci, /workers_code/);
assert.match(ci, /test "\$workers_code" != '200'/);
assert.match(ci, /public_admin/);
assert.match(ci, /test "\$mutation" = '404'/);
assert.match(ci, /content-type:\.\*text\/html/i);
assert.match(ci, /cache-control:\.\*no-store/i);
assert.match(ci, /content-security-policy/i);
assert.match(ci, /strict-transport-security/i);
assert.match(ci, /data-runtime-job-posting/);
assert.match(ci, /data-career-application/);
assert.match(ci, /immutable/);

assert.match(exact, /EXPECTED_SHA: \$\{\{ github\.sha \}\}/);
assert.match(exact, /BASE='https:\/\/rcitcs\.com'/);
assert.match(doc, /workers\.dev`, Vercel and raw Supabase URLs are not accepted production browser identities/);
assert.match(doc, /does not replace Phase 18 responsive testing/);

console.log('Phase 17.14 production browser/runtime acceptance contract: PASS');

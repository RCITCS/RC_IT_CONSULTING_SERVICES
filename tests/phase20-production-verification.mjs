import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflow = await readFile(path.join(root, '.github', 'workflows', 'phase20-production-verification.yml'), 'utf8');
const docs = await readFile(path.join(root, 'docs', 'PHASE_20_6_10_PRODUCTION_VERIFICATION.md'), 'utf8');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

function requireAll(source, values, label) {
  for (const value of values) {
    assert.ok(source.includes(value), `${label} must include ${value}.`);
  }
}

assert.equal(
  packageJson.scripts['check:phase20-production'],
  'node tests/phase20-production-verification.mjs',
  'Phase 20.6-20.10 must have a dedicated static certification command.'
);
assert.match(
  packageJson.scripts.verify,
  /check:phase20-production/,
  'Inherited verify must execute the Phase 20.6-20.10 source contract.'
);

requireAll(workflow, [
  'PHASE20_5_CERTIFIED_BASELINE: e1cd60fcdcef8743d7faa932960995fe3ac94047',
  '20.6 Public website production smoke and deep-route verification',
  '20.7 Admin production domain acceptance',
  '20.8 Admin staging isolation verification',
  '20.9 Domain redirect and origin ownership certification',
  '20.10 TLS headers and browser security verification',
  'git merge-base --is-ancestor',
  'npm run verify'
], 'Phase 20 production workflow');

requireAll(workflow, [
  "getPrerenderRoutes",
  'rc-deployment-sha',
  'data-prerendered-path',
  '/api/health',
  '/sitemap.xml',
  '/robots.txt',
  'missing_code',
  "test \"$route_count\" -ge 60"
], '20.6 public production gate');
assert.match(
  workflow,
  /github\.event\.pull_request\.base\.sha/,
  'PR acceptance must bind public production to the PR base SHA rather than pretending the candidate SHA is deployed.'
);

requireAll(workflow, [
  'Administrator sign in',
  'x-rc-admin-environment: *production',
  '/applications /jobs',
  '"authenticated":false',
  'Origin: https://example.invalid',
  'Request rejected',
  "! grep -qi '^set-cookie:'"
], '20.7 admin production gate');

requireAll(workflow, [
  'Staging administration is intentionally unavailable.',
  'intentionally-unavailable',
  'x-rc-admin-environment: *staging',
  "test \"$code\" = '503'",
  "! grep -qi '^location:'"
], '20.8 admin staging gate');

requireAll(workflow, [
  'http://rcitcs.com/careers?from=phase20',
  'https://www.rcitcs.com/services/it/cloud-computing?from=phase20',
  'https://rcitcs.com/admin?from=phase20',
  'https://admin.rcitcs.com/admin?from=phase20',
  'https://rc-it-consulting-services.rcitcservices.workers.dev/',
  '000|404'
], '20.9 domain ownership gate');

requireAll(workflow, [
  '--tlsv1.2',
  'strict-transport-security',
  'includesubdomains',
  '31536000',
  'x-content-type-options: *nosniff',
  'x-frame-options: *DENY',
  'referrer-policy: *strict-origin-when-cross-origin',
  'permissions-policy:',
  'content-security-policy:.*frame-ancestors',
  "! grep -qi '^access-control-allow-origin: *\\*'"
], '20.10 browser security gate');

const orderedNeeds = [
  'needs: production-contract',
  'needs: public-production',
  'needs: admin-production',
  'needs: admin-staging',
  'needs: domain-ownership'
];
let priorIndex = -1;
for (const marker of orderedNeeds) {
  const index = workflow.indexOf(marker, priorIndex + 1);
  assert.ok(index > priorIndex, `Sequential production gate dependency ${marker} must be preserved.`);
  priorIndex = index;
}

requireAll(docs, [
  '20.6 — Public Website Production Smoke & Deep-Route Verification',
  '20.7 — Admin Production Domain Acceptance',
  '20.8 — Admin Staging Isolation Verification',
  '20.9 — Domain, Redirect & Origin Ownership Certification',
  '20.10 — TLS, Headers & Browser Security Verification',
  'e1cd60fcdcef8743d7faa932960995fe3ac94047',
  'post-merge',
  'exact SHA'
], 'Phase 20.6-20.10 documentation');

console.log('Phase 20.6-20.10 production verification source contract passed.');

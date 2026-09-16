import assert from 'node:assert/strict';
import fs from 'node:fs';

const doc = fs.readFileSync('docs/PHASE_17_15_MULTI_ROLE_REVIEW.md', 'utf8');

for (const heading of [
  'Product Owner review',
  'Solution / Software Architect review',
  'Senior Frontend review',
  'Backend review',
  'QA review',
  'Security review',
  'SEO review',
  'Performance review',
  'Accessibility review',
  'End-user review'
]) {
  assert.match(doc, new RegExp(`## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
}

assert.match(doc, /not represented as independent human approval/i);
assert.match(doc, /PR #85 had no submitted GitHub pull-request reviews/i);
assert.match(doc, /_dmarc\.rcitcs\.com/);
assert.match(doc, /Phase 17 must not be declared closed/i);
assert.match(doc, /stale cross-account Cloudflare GitHub integration/i);
assert.match(doc, /Supabase Security Advisor/i);
assert.match(doc, /exact merged SHA/i);
assert.match(doc, /mirror convergence/i);
assert.doesNotMatch(doc, /human approved/i);
assert.doesNotMatch(doc, /WCAG conformance achieved/i);

console.log('Phase 17.15 multi-role review evidence contract: PASS');

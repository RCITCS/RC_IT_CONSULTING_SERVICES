import assert from 'node:assert/strict';
import fs from 'node:fs';

const doc = fs.readFileSync('docs/PHASE_19_MULTI_ROLE_REVIEW.md', 'utf8');

for (const heading of [
  'Product Owner review',
  'Solution / Software Architect review',
  'Senior Frontend review',
  'Backend / API review',
  'Database review',
  'QA review',
  'Security review',
  'SEO review',
  'Performance review',
  'Accessibility review',
  'End User review'
]) {
  assert.match(doc, new RegExp(`## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
}

for (const evidence of [
  'not represented as independent human approval',
  'Supabase Security Advisor returned zero findings',
  'unused_index',
  'LCP ≤ 2.5 s',
  'CLS ≤ 0.1',
  'third-party-cookie',
  'first-party media',
  'admin `no-store`',
  'x-robots-tag: noindex',
  'Search Console ownership/index timing is an external operational concern',
  'field-data availability is not fabricated',
  'primary/company mirror convergence',
  'exact merged SHA'
]) {
  assert.match(doc, new RegExp(evidence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
}

for (let module = 1; module <= 18; module += 1) {
  assert.match(doc, new RegExp(`\\| 19\\.${module} `), `Phase 19.${module} is missing from the module closure matrix`);
}

assert.match(doc, /Phase 19 must not be declared closed from this document alone/i);
assert.doesNotMatch(doc, /human approved/i);
assert.doesNotMatch(doc, /Search Console ownership verified/i);
assert.doesNotMatch(doc, /all users are WCAG conformant/i);

console.log('Phase 19 multi-role engineering review evidence contract: PASS');

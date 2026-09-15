import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const publicConfig = readJson('wrangler.jsonc');
const productionAdmin = readJson('wrangler.admin-production.jsonc');
const stagingAdmin = readJson('wrangler.admin-staging.jsonc');
const legacy = readJson('cloudflare/legacy-rcitcservices/wrangler.jsonc');
const baseline = read('docs/PHASE_17_DOMAIN_BASELINE.md');
const cleanup = read('docs/PHASE_17_8_DNS_CLEANUP.md');

const expected = new Map([
  ['rcitcs.com', 'rc-it-consulting-services'],
  ['www.rcitcs.com', 'rc-it-consulting-services'],
  ['admin.rcitcs.com', 'rcitcs-admin-production'],
  ['admin-staging.rcitcs.com', 'rcitcs-admin-staging']
]);

const configs = [publicConfig, productionAdmin, stagingAdmin];
const claims = new Map();
for (const config of configs) {
  for (const route of config.routes || []) {
    assert.equal(route.custom_domain, true, `${config.name} must use Custom Domains for Phase-17 company hostnames.`);
    assert.ok(expected.has(route.pattern), `Unexpected company Custom Domain claim: ${route.pattern}`);
    assert.equal(expected.get(route.pattern), config.name, `${route.pattern} is assigned to the wrong Worker.`);
    assert.equal(claims.has(route.pattern), false, `Duplicate hostname ownership remains for ${route.pattern}.`);
    claims.set(route.pattern, config.name);
  }
}
assert.deepEqual([...claims.keys()].sort(), [...expected.keys()].sort(), 'The complete approved web-host set must be represented exactly once.');
assert.equal(Object.hasOwn(legacy, 'routes'), false, 'Legacy Worker must remain route-less.');

// 17.8 must not turn web-host cleanup into destructive mail-DNS cleanup.
for (const evidence of [
  'route2.mx.cloudflare.net',
  'route1.mx.cloudflare.net',
  'route3.mx.cloudflare.net',
  'links.rcitcs.com',
  'send.rcitcs.com',
  'Resend',
  'Amazon SES'
]) {
  assert.ok(baseline.includes(evidence), `Immutable 17.1 DNS evidence missing: ${evidence}`);
}

assert.match(cleanup, /does \*\*not\*\* delete mail, verification, DKIM, SPF, Resend, Amazon SES, or Cloudflare Email Routing records/i);
assert.match(cleanup, /Cloudflare-managed Custom Domain for `rcitcs-admin-production`/);
assert.match(cleanup, /Cloudflare-managed Custom Domain for `rcitcs-admin-staging`/);
assert.match(cleanup, /Final Phase-17 closure still requires the post-main activation gate/);

console.log('Phase 17.8 DNS conflict-elimination source contract: PASS');
console.log('FINAL WEB DNS OWNERS: apex/www -> public, admin -> production admin, admin-staging -> staging; mail DNS preserved.');

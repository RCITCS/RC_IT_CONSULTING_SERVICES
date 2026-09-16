import assert from 'node:assert/strict';
import fs from 'node:fs';

const doc = fs.readFileSync('docs/PHASE_17_11_EMAIL_DOMAIN_DNS.md', 'utf8');

assert.match(doc, /rcitcs\.com/);
assert.match(doc, /route1\.mx\.cloudflare\.net/);
assert.match(doc, /route2\.mx\.cloudflare\.net/);
assert.match(doc, /route3\.mx\.cloudflare\.net/);
assert.match(doc, /include:_spf\.mx\.cloudflare\.net/);
assert.match(doc, /resend\._domainkey\.rcitcs\.com/);
assert.match(doc, /send\.rcitcs\.com/);
assert.match(doc, /links\.rcitcs\.com/);
assert.match(doc, /_dmarc\.rcitcs\.com/);
assert.match(doc, /v=DMARC1; p=none;/);
assert.match(doc, /adkim=s; aspf=s;/);
assert.match(doc, /read-only on pull requests/i);
assert.match(doc, /never removes or rewrites/i);

console.log('Phase 17.11 email-domain DNS source contract: PASS');

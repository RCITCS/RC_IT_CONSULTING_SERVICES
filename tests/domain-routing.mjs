import { canonicalHostRedirect, isolateSecondaryOrigin, PRIMARY_ORIGIN } from '../src/backend/runtime/domain-routing.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let url = new URL('https://www.rcitcs.com/services/it/cyber-security?source=test');
let response = canonicalHostRedirect(url);
assert(response?.status === 308, 'www must permanently redirect to the canonical apex domain.');
assert(response.headers.get('location') === `${PRIMARY_ORIGIN}/services/it/cyber-security?source=test`, 'www redirect must preserve path and query.');

url = new URL('https://rcitcs.com/about-us');
assert(canonicalHostRedirect(url) === null, 'canonical apex requests must not redirect.');

const canonicalResponse = isolateSecondaryOrigin(new Response('<html></html>', { headers: { 'content-type': 'text/html' } }), 'rcitcs.com');
assert(!canonicalResponse.headers.has('x-robots-tag'), 'canonical production origin must remain eligible for normal indexing.');

const workerDevResponse = isolateSecondaryOrigin(new Response('<html></html>', { headers: { 'content-type': 'text/html' } }), 'rcitcservices.frsmkgit.workers.dev');
assert(workerDevResponse.headers.get('x-robots-tag') === 'noindex, nofollow', 'workers.dev production alias must be search-isolated.');

const previewResponse = isolateSecondaryOrigin(new Response('<html></html>', { headers: { 'content-type': 'text/html' } }), 'phase-8-database-storage-rcitcservices.frsmkgit.workers.dev');
assert(previewResponse.headers.get('x-robots-tag') === 'noindex, nofollow', 'workers.dev preview aliases must be search-isolated.');

console.log('PASS: rcitcs.com canonical host, www redirect and workers.dev search isolation verified.');

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');

const wrangler = JSON.parse(await read('wrangler.jsonc'));
const zoneRoutes = new Map((wrangler.routes || []).map((route) => [route.pattern, route.zone_name]));
for (const pattern of ['rcitcs.com/*', 'www.rcitcs.com/*']) {
  if (zoneRoutes.get(pattern) !== 'rcitcs.com') throw new Error(`Cloudflare zone route missing or mis-scoped: ${pattern}`);
}
if ((wrangler.routes || []).some((route) => route.custom_domain === true)) {
  throw new Error('Hotfix routing must not attempt Custom Domain DNS replacement until the hostname conflict is resolved.');
}
if (wrangler.workers_dev !== true || wrangler.preview_urls !== true) {
  throw new Error('workers.dev and preview URLs must remain enabled as isolated deployment/debug surfaces.');
}

const seoConfig = await read('src/frontend/seo/seo-config.js');
if (!seoConfig.includes("configuredOrigin || 'https://rcitcs.com'")) {
  throw new Error('Canonical SEO origin must default to https://rcitcs.com.');
}
if (seoConfig.includes("configuredOrigin || 'https://rcitcservices.frsmkgit.workers.dev'")) {
  throw new Error('Temporary workers.dev hostname regained canonical SEO ownership.');
}

const routing = await read('src/backend/runtime/domain-routing.js');
for (const contract of ["PRIMARY_HOSTNAME = 'rcitcs.com'", 'WWW_HOSTNAME', 'Response.redirect(destination.toString(), 308)', "headers.set('x-robots-tag', 'noindex, nofollow')"]) {
  if (!routing.includes(contract)) throw new Error(`Domain routing contract missing: ${contract}`);
}

const runtime = await read('src/backend/runtime/worker.js');
for (const contract of ['canonicalHostRedirect', 'isolateSecondaryOrigin']) {
  if (!runtime.includes(contract)) throw new Error(`Worker domain integration missing: ${contract}`);
}

const workflow = await read('.github/workflows/cloudflare-deploy.yml');
for (const contract of ["BASE='https://rcitcs.com'", 'https://www.rcitcs.com', 'https://rcitcservices.frsmkgit.workers.dev', 'x-robots-tag:.*noindex']) {
  if (!workflow.includes(contract)) throw new Error(`Production domain verification contract missing: ${contract}`);
}

const packageJson = JSON.parse(await read('package.json'));
if (!packageJson.scripts?.['test:domain'] || !packageJson.scripts?.test?.includes('test:domain')) {
  throw new Error('Domain-routing tests must run in the default regression suite.');
}
if (!packageJson.scripts?.['check:domain-architecture'] || !packageJson.scripts?.['check:architecture']?.includes('check:domain-architecture')) {
  throw new Error('Domain architecture checks must run in the architecture gate.');
}

console.log('PASS: rcitcs.com Cloudflare zone-route ownership, canonical SEO, www normalization and secondary-origin isolation verified.');

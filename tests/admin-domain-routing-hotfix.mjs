import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryPath = path.join(root, 'worker', 'admin-domain-entry.js');
const wranglerPath = path.join(root, 'wrangler.jsonc');
const entrySource = await readFile(entryPath, 'utf8');
const wrangler = JSON.parse(await readFile(wranglerPath, 'utf8'));
const { isDedicatedAdminHost, mapDedicatedAdminUrl } = await import(pathToFileURL(entryPath).href);

assert.equal(isDedicatedAdminHost('admin.rcitcs.com'), true);
assert.equal(isDedicatedAdminHost('ADMIN-STAGING.RCITCS.COM'), true);
assert.equal(isDedicatedAdminHost('rcitcs.com'), false);
assert.equal(isDedicatedAdminHost('www.rcitcs.com'), false);

const stagingRoot = mapDedicatedAdminUrl('https://admin-staging.rcitcs.com/?from=test');
assert.equal(stagingRoot?.hostname, 'admin-staging.rcitcs.com');
assert.equal(stagingRoot?.pathname, '/admin');
assert.equal(stagingRoot?.search, '?from=test');

const productionLogin = mapDedicatedAdminUrl('https://admin.rcitcs.com/login');
assert.equal(productionLogin?.pathname, '/admin/login');

const existingAdminPath = mapDedicatedAdminUrl('https://admin.rcitcs.com/admin/jobs');
assert.equal(existingAdminPath?.pathname, '/admin/jobs');

assert.equal(mapDedicatedAdminUrl('https://rcitcs.com/'), null, 'public corporate host must not be remapped into admin');

assert.equal(wrangler.main, './worker/admin-domain-entry.js');
assert.deepEqual(
  wrangler.assets?.run_worker_first,
  ['/*'],
  'A single catch-all Worker-first rule must own hostname routing; narrower rules are invalid/redundant in Wrangler 4.'
);

const stagingRoute = wrangler.routes?.find((route) => route.pattern === 'admin-staging.rcitcs.com/*');
assert.equal(stagingRoute?.zone_name, 'rcitcs.com', 'staging admin hostname must be explicitly routed through the Worker');

const productionRoute = wrangler.routes?.find((route) => route.pattern === 'admin.rcitcs.com');
assert.equal(productionRoute?.custom_domain, true, 'production admin hostname must be a Worker Custom Domain so Cloudflare owns DNS/TLS');

assert.ok(entrySource.includes("'admin.rcitcs.com'"));
assert.ok(entrySource.includes("'admin-staging.rcitcs.com'"));
assert.ok(entrySource.includes("url.pathname === '/' ? '/admin'"));
assert.ok(entrySource.includes('return applicationWorker.fetch(mappedRequest, env, ctx)'));

console.log('PASS: dedicated RC IT admin hostnames cannot fall through to the public static homepage; Cloudflare domain bindings and the single Worker-first catch-all are explicit.');

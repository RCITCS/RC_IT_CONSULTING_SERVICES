import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const expectedSha = String(process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || '').trim();

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

async function requireNonEmpty(relativePath) {
  const fullPath = path.join(dist, relativePath);
  const info = await stat(fullPath);
  assert.ok(info.isFile(), `${relativePath} must be a file.`);
  assert.ok(info.size > 0, `${relativePath} must not be empty.`);
  return readFile(fullPath, 'utf8');
}

const indexHtml = await requireNonEmpty('index.html');
const notFoundHtml = await requireNonEmpty('404.html');
const sitemap = await requireNonEmpty('sitemap.xml');
const robots = await requireNonEmpty('robots.txt');
const redirects = await requireNonEmpty('_redirects');

const allFiles = await walk(dist);
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));
assert.ok(htmlFiles.length >= 60, `Expected at least 60 prerendered HTML artifacts, found ${htmlFiles.length}.`);

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, 'utf8');
  assert.ok(html.includes('name="rc-deployment-sha"'), `Missing deployment SHA marker in ${path.relative(dist, htmlFile)}.`);
  assert.ok(html.includes('data-prerendered-path='), `Missing prerender route marker in ${path.relative(dist, htmlFile)}.`);
  if (expectedSha) {
    assert.ok(
      html.includes(`name="rc-deployment-sha" content="${expectedSha}"`),
      `Artifact ${path.relative(dist, htmlFile)} is not bound to exact CI SHA ${expectedSha}.`
    );
  }
}

assert.ok(notFoundHtml.includes('noindex'), '404 artifact must remain non-indexable.');

const assetsDirectory = path.join(dist, 'assets');
const assetNames = await readdir(assetsDirectory);
const requiredPatterns = [
  /^app-[A-Za-z0-9]+\.js$/,
  /^app-[A-Za-z0-9]+\.css$/,
  /^global-overrides-[A-Za-z0-9]+\.css$/,
  /^route-careers-[A-Za-z0-9]+\.css$/,
  /^route-services-[A-Za-z0-9]+\.css$/,
  /^route-legal-[A-Za-z0-9]+\.css$/
];

for (const pattern of requiredPatterns) {
  const assetName = assetNames.find((name) => pattern.test(name));
  assert.ok(assetName, `Missing hashed production artifact matching ${pattern}.`);
  const info = await stat(path.join(assetsDirectory, assetName));
  assert.ok(info.size > 0, `Required production artifact ${assetName} must not be empty.`);
}

assert.ok(!assetNames.includes('app.js'), 'Unhashed production app.js must not be emitted.');
assert.ok(!assetNames.includes('app.css'), 'Unhashed production app.css must not be emitted.');
assert.match(indexHtml, /\/assets\/app-[A-Za-z0-9]+\.js/, 'Root document must reference hashed app JavaScript.');
assert.match(indexHtml, /\/assets\/app-[A-Za-z0-9]+\.css/, 'Root document must reference hashed app CSS.');
assert.match(indexHtml, /\/assets\/global-overrides-[A-Za-z0-9]+\.css/, 'Root document must reference hashed global overrides CSS.');

const jsAssetNames = assetNames.filter((name) => name.endsWith('.js'));
const referencedChunkNames = new Set();
for (const jsAssetName of jsAssetNames) {
  const source = await readFile(path.join(assetsDirectory, jsAssetName), 'utf8');
  for (const match of source.matchAll(/(?:\.\/)?(chunk-[A-Za-z0-9]+\.js)/g)) {
    referencedChunkNames.add(match[1]);
  }
}

for (const referencedChunkName of referencedChunkNames) {
  assert.ok(assetNames.includes(referencedChunkName), `Referenced split chunk ${referencedChunkName} is missing from dist/assets.`);
}

const referencedNoOpChunks = [];
for (const assetName of assetNames) {
  const info = await stat(path.join(assetsDirectory, assetName));
  if (info.size > 0) continue;

  const isHashedSplitJsChunk = /^chunk-[A-Za-z0-9]+\.js$/.test(assetName);
  const isReferenced = referencedChunkNames.has(assetName);
  assert.ok(
    isHashedSplitJsChunk && isReferenced,
    `Zero-byte production asset ${assetName} is not an intentional referenced split-module no-op.`
  );
  referencedNoOpChunks.push(assetName);
}

assert.ok(sitemap.includes('<urlset'), 'Sitemap must contain a urlset.');
assert.ok(sitemap.includes('<loc>https://rcitcs.com/</loc>'), 'Sitemap must declare rcitcs.com as canonical public origin.');
assert.ok(!sitemap.includes('admin.rcitcs.com'), 'Admin URLs must not appear in the public sitemap.');
assert.ok(!sitemap.includes('workers.dev'), 'workers.dev URLs must not appear in the public sitemap.');
assert.ok(!sitemap.includes('/apply</loc>'), 'Application submission routes must not appear in the public sitemap.');
assert.ok(robots.includes('Sitemap: https://rcitcs.com/sitemap.xml'), 'robots.txt must advertise the canonical sitemap.');
assert.ok(redirects.trim().length > 0, '_redirects must not be empty.');

const noOpNote = referencedNoOpChunks.length > 0
  ? `; referenced no-op split chunks: ${referencedNoOpChunks.join(', ')}`
  : '';
console.log(
  `Phase 20 artifact integrity passed: ${htmlFiles.length} HTML artifacts, ${assetNames.length} hashed/static assets${expectedSha ? `, exact SHA ${expectedSha}` : ''}${noOpNote}.`
);
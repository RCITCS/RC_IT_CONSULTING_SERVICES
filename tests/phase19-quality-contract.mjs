globalThis.document = { title: '' };
globalThis.location = { origin: 'https://rcitcs.com' };

const { routeContent } = await import('../src/frontend/router/router.js');
const { siteShell } = await import('../src/frontend/layouts/site-shell.js');
const { LEGACY_ROUTE_ALIASES } = await import('../src/frontend/app/site-config.js');
const {
  SITE_ORIGIN,
  getIndexableRoutes,
  getPrerenderRoutes,
  getSeoForRoute,
  normaliseSeoPath,
  renderRobotsTxt,
  renderSeoHead,
  renderSitemapXml,
  schemaGraphForRoute
} = await import('../src/frontend/seo/seo-model.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function matches(markup, expression) {
  return [...String(markup).matchAll(expression)];
}

function attributes(tag = '') {
  return Object.fromEntries(
    [...tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map((match) => [match[1].toLowerCase(), match[3]])
  );
}

function textOnly(markup = '') {
  return String(markup)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#039);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateImages(route, markup) {
  for (const match of matches(markup, /<img\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    assert(Object.hasOwn(attrs, 'alt'), `${route}: image is missing an alt attribute: ${match[0]}`);
    assert(!/^image(?:\s|$)|^photo(?:\s|$)|^picture(?:\s|$)/i.test(attrs.alt || ''), `${route}: image alt text is generic: ${attrs.alt}`);
    if ((attrs.loading || '').toLowerCase() === 'lazy') {
      assert((attrs.fetchpriority || '').toLowerCase() !== 'high', `${route}: lazy image cannot also have fetchpriority=high.`);
    }
  }
}

function validateButtons(route, markup) {
  for (const match of matches(markup, /<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    const attrs = attributes(match[0]);
    const visibleName = textOnly(match[1]);
    const accessibleName = visibleName || attrs['aria-label'] || attrs['aria-labelledby'] || attrs.title;
    assert(Boolean(accessibleName), `${route}: button has no accessible name: ${match[0]}`);
  }
}

function validateFormControls(route, markup) {
  const labels = new Set(matches(markup, /<label\b[^>]*\bfor=(['"])(.*?)\1[^>]*>/gi).map((match) => match[2]));
  const controls = matches(markup, /<(input|select|textarea)\b[^>]*>/gi);
  for (const match of controls) {
    const attrs = attributes(match[0]);
    if ((attrs.type || '').toLowerCase() === 'hidden') continue;
    const hasProgrammaticName = Boolean(attrs['aria-label'] || attrs['aria-labelledby']);
    const hasLabel = Boolean(attrs.id && labels.has(attrs.id));
    const wrappedByLabel = markup.includes(`<label`) && new RegExp(`<label\\b[^>]*>[\\s\\S]*?${match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(markup);
    assert(hasProgrammaticName || hasLabel || wrappedByLabel, `${route}: form control lacks an accessible label: ${match[0]}`);
  }
}

function validateLandmarksAndHeadings(route, pageMarkup, shellMarkup) {
  const mains = matches(shellMarkup, /<main\b[^>]*>/gi);
  assert(mains.length === 1, `${route}: expected exactly one main landmark, found ${mains.length}.`);
  assert(/<main\b[^>]*\bid=(['"])main-content\1/i.test(shellMarkup), `${route}: main landmark must expose id="main-content".`);

  const h1s = matches(pageMarkup, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi);
  assert(h1s.length === 1, `${route}: RC IT Services convention requires one primary H1, found ${h1s.length}.`);
  assert(textOnly(h1s[0][1]).length >= 3, `${route}: H1 is empty or not meaningful.`);

  const headings = matches(pageMarkup, /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi);
  let previous = 0;
  for (const heading of headings) {
    const level = Number(heading[1]);
    assert(textOnly(heading[2]).length > 0, `${route}: heading level ${level} is empty.`);
    if (previous > 0) {
      assert(level <= previous + 1, `${route}: semantic heading hierarchy jumps from H${previous} to H${level}.`);
    }
    previous = level;
  }
}

function validateSeo(route) {
  const seo = getSeoForRoute(route);
  assert(seo, `${route}: SEO descriptor missing.`);
  assert(seo.canonical === `${SITE_ORIGIN}${route === '/' ? '/' : route}`, `${route}: canonical is not the canonical production URL.`);
  assert(!seo.canonical.includes('www.'), `${route}: www leaked into canonical URL.`);
  assert(!seo.canonical.includes('workers.dev'), `${route}: workers.dev leaked into canonical URL.`);

  const head = renderSeoHead(route);
  for (const marker of [
    '<meta name="description"',
    '<meta name="robots"',
    '<link rel="canonical"',
    'property="og:title"',
    'property="og:description"',
    'property="og:url"',
    'property="og:image"',
    'name="twitter:card"',
    'application/ld+json'
  ]) {
    assert(head.includes(marker), `${route}: SEO head is missing ${marker}.`);
  }

  const schema = schemaGraphForRoute(route);
  assert(schema.some((node) => node['@type'] === 'Organization'), `${route}: Organization schema missing.`);
  assert(schema.some((node) => node['@type'] === 'WebSite'), `${route}: WebSite schema missing.`);
  assert(schema.some((node) => node['@type'] === 'WebPage'), `${route}: WebPage schema missing.`);
}

const routes = getPrerenderRoutes();
const indexable = new Set(getIndexableRoutes());
const legacy = new Set(LEGACY_ROUTE_ALIASES.map(normaliseSeoPath));

assert(routes.length > 0, 'Phase 19 crawl inventory is empty.');
assert(indexable.size > 0, 'Phase 19 indexable inventory is empty.');

for (const route of routes) {
  const pageMarkup = await routeContent(route);
  const shellMarkup = siteShell(route, pageMarkup);

  validateSeo(route);
  validateLandmarksAndHeadings(route, pageMarkup, shellMarkup);
  validateImages(route, shellMarkup);
  validateButtons(route, shellMarkup);
  validateFormControls(route, shellMarkup);

  for (const hrefMatch of matches(shellMarkup, /\shref=(['"])(.*?)\1/gi)) {
    const href = hrefMatch[2];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const target = normaliseSeoPath(href);
    assert(!legacy.has(target), `${route}: canonical content links to legacy route ${target}.`);
  }
}

const sitemap = renderSitemapXml();
for (const route of routes) {
  const canonical = `${SITE_ORIGIN}${route === '/' ? '/' : route}`;
  if (indexable.has(route)) {
    assert(sitemap.includes(`<loc>${canonical}</loc>`), `${route}: indexable canonical is missing from sitemap.`);
  } else {
    assert(!sitemap.includes(`<loc>${canonical}</loc>`), `${route}: non-indexable route leaked into sitemap.`);
  }
}

const robots = renderRobotsTxt();
assert(robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`), 'Production robots.txt is missing canonical sitemap location.');
assert(robots.includes('Disallow: /api/'), 'Production robots.txt must exclude public API crawling.');
assert(robots.includes('Disallow: /admin/'), 'Production robots.txt must exclude public admin compatibility paths.');

console.log(`PASS: Phase 19 quality contract verified ${routes.length} prerender routes and ${indexable.size} indexable routes across crawl, SEO, semantic and accessibility source contracts.`);

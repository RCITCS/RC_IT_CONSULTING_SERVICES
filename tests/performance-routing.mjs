import { readFile } from 'node:fs/promises';
import { routeStyleKeys } from '../src/frontend/app/route-styles.js';
import { responsiveImageMarkup } from '../src/frontend/app/image-utils.js';
import { isServiceDetailRoute } from '../src/frontend/router/router.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(routeStyleKeys('/').length === 0, 'Home should not request route-specific CSS.');
assert(routeStyleKeys('/careers').join(',') === 'careers', 'Careers route CSS classification failed.');
assert(routeStyleKeys('/careers/jobs/test-role/apply').join(',') === 'careers', 'Career application route CSS classification failed.');
assert(routeStyleKeys('/services/it/cyber-security').join(',') === 'services', 'Service route CSS classification failed.');
assert(routeStyleKeys('/privacy').join(',') === 'legal', 'Legal route CSS classification failed.');
assert(isServiceDetailRoute('/services/it/consultancy-services/agile'), 'Service detail route detection failed.');
assert(!isServiceDetailRoute('/services/it/consultancy-services'), 'Top-level service route was misclassified as a detail route.');

const routerSource = await readFile(new URL('../src/frontend/router/router.js', import.meta.url), 'utf8');
assert(routerSource.includes("import('../pages/home.page.js')"), 'Home route is not lazy-loaded.');
assert(routerSource.includes("import('../pages/careers.page.js')"), 'Careers route is not lazy-loaded.');
assert(!/from ['"]\.\.\/pages\//.test(routerSource), 'Router contains a static page import that defeats route splitting.');

const appSource = await readFile(new URL('../src/frontend/app/app.js', import.meta.url), 'utf8');
assert(appSource.includes('Promise.all([') && appSource.includes('ensureRouteStyles(pathName)'), 'Route module and route stylesheet loading are not started in parallel.');
assert(appSource.includes('bindRouteEnhancements(pathName)'), 'Route-specific interaction loading is not enabled.');

const enhancements = await readFile(new URL('../src/frontend/app/route-enhancements.js', import.meta.url), 'utf8');
for (const lazyModule of ['forms.js', 'interactions-careers.js', 'interactions-career-filters.js', 'service-page-enhancements.js', 'interactions-page.js']) {
  assert(enhancements.includes(`import('./${lazyModule}')`), `Route enhancement module is not lazy: ${lazyModule}`);
}

const appCss = await readFile(new URL('../src/frontend/styles/app.css', import.meta.url), 'utf8');
for (const routeCss of ['service-detail.css', 'careers.css', 'career-switch.css', 'career-filters.css', 'legal.css']) {
  assert(!appCss.includes(routeCss), `Route-only stylesheet is still bundled globally: ${routeCss}`);
}
const globalOverrides = await readFile(new URL('../src/frontend/styles/global-overrides.css', import.meta.url), 'utf8');
for (const finalCss of ['responsive.css', 'audit-fixes.css', 'bootstrap-overrides.css']) {
  assert(globalOverrides.includes(finalCss), `Global final-cascade stylesheet is missing: ${finalCss}`);
}

const routeStyleSource = await readFile(new URL('../src/frontend/app/route-styles.js', import.meta.url), 'utf8');
assert(routeStyleSource.includes("insertBefore(link, globalOverrides)"), 'Route CSS is not inserted before the final responsive/override layer.');

const responsiveCss = await readFile(new URL('../src/frontend/styles/responsive.css', import.meta.url), 'utf8');
for (const breakpoint of ['max-width: 1100px', 'max-width: 900px', 'max-width: 640px', 'max-width: 390px']) {
  assert(responsiveCss.includes(breakpoint), `Responsive contract lost breakpoint: ${breakpoint}`);
}

const pexelsFixture = 'https://images.pexels.com/photos/5439138/pexels-photo-5439138.jpeg';
const responsiveMarkup = responsiveImageMarkup(pexelsFixture, 'Responsive performance contract');
for (const width of [320, 480, 640, 720, 960, 1280, 1600]) {
  assert(
    responsiveMarkup.includes(`/media/pexels/5439138?w=${width} ${width}w`),
    `Responsive image output is missing the required ${width}w first-party candidate.`
  );
}
assert(responsiveMarkup.includes('src="/media/pexels/5439138?w=1280"'), 'Responsive image default source must use the first-party media route.');
assert(responsiveMarkup.includes('loading="lazy"'), 'Images no longer default to lazy loading.');
assert(responsiveMarkup.includes('decoding="async"'), 'Async image decoding contract is missing.');

const { pageHero } = await import('../src/frontend/components/content.js');
const heroMarkup = pageHero({
  category: 'Performance',
  title: 'Priority hero',
  lead: 'Representative LCP image contract.',
  image: pexelsFixture,
  imageAlt: 'Representative priority hero image',
  crumbs: []
});
assert(heroMarkup.includes('loading="eager"'), 'Page hero must remain eagerly requested.');
assert(heroMarkup.includes('fetchpriority="high"'), 'Page hero must retain high fetch priority.');
assert(heroMarkup.includes('decoding="async"'), 'Page hero must not synchronously block rendering on image decode.');

const phase19QualityCss = await readFile(new URL('../src/frontend/styles/phase19-quality.css', import.meta.url), 'utf8');
assert(phase19QualityCss.includes('.careers-page > .section'), 'Careers below-fold rendering deferral contract is missing.');
assert(phase19QualityCss.includes('content-visibility: auto'), 'Careers below-fold rendering must use content-visibility.');
assert(phase19QualityCss.includes('contain-intrinsic-size'), 'Careers deferred sections must reserve intrinsic layout space.');

console.log('PASS: route JS splitting, cascade-safe route CSS splitting, lazy interaction loading, desktop/tablet/mobile breakpoints, responsive-image delivery, async priority hero decode and Careers below-fold rendering contracts verified.');

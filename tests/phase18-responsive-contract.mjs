import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ALL_ROUTES } from '../src/frontend/app/site-config.js';
import { getPrerenderRoutes } from '../src/frontend/seo/seo-model.js';
import { getPublishedJobs } from '../src/frontend/app/career-job-catalog.js';
import { ADMIN_RESPONSIVE_STYLE } from '../worker/admin-responsive.js';

const [phase18Css, responsiveCss, careersCss, careerApplicationCss, legalCss, globalOverrides, navSource, previewServerSource] = await Promise.all([
  readFile(new URL('../src/frontend/styles/phase18-responsive.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/frontend/styles/responsive.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/frontend/styles/careers.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/frontend/styles/career-application.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/frontend/styles/legal.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/frontend/styles/global-overrides.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/frontend/app/interactions-nav.js', import.meta.url), 'utf8'),
  readFile(new URL('../scripts/serve-phase18-preview.mjs', import.meta.url), 'utf8')
]);

assert.match(globalOverrides, /@import\s+["']\.\/phase18-responsive\.css["'];/, 'Phase 18 responsive guardrails must be loaded last in the global override layer.');
assert.ok(globalOverrides.trim().endsWith('@import "./phase18-responsive.css";'), 'Phase 18 guardrails must remain the final public responsive layer.');

for (const contract of [
  '@media (min-width: 320px) and (max-width: 374px)',
  '@media (min-width: 375px) and (max-width: 767px)',
  '@media (min-width: 768px) and (max-width: 1023px)',
  '@media (min-width: 1024px) and (max-width: 1279px)',
  '100dvh',
  'safe-area-inset-right',
  "input[type='file']::file-selector-button",
  '.legal-table-wrap',
  '@media (hover: none), (pointer: coarse)',
  '@media (max-height: 520px) and (orientation: landscape)',
  'overflow-wrap: anywhere'
]) {
  assert.ok(phase18Css.includes(contract), `Public responsive contract missing: ${contract}`);
}
assert.ok(!phase18Css.includes('html { overflow-x:'), 'Phase 18 must not hide document-level overflow that the browser regression gate is expected to detect.');

assert.ok(responsiveCss.includes('@media (max-width: 1100px)'), 'Desktop/mobile navigation transition must remain defined.');
assert.ok(careersCss.includes('@media (max-width: 900px)'), 'Careers split view must retain its tablet collapse behavior.');
assert.ok(careerApplicationCss.includes('@media (max-width: 640px)'), 'Candidate application form must retain its phone collapse behavior.');
assert.ok(legalCss.includes('.legal-table-wrap') && legalCss.includes('overflow-x: auto'), 'Legal data tables must use local horizontal containment.');

for (const contract of [
  '@media(max-width:1180px)',
  '@media(max-width:900px)',
  '@media(max-width:640px)',
  '@media(max-width:420px)',
  'safe-area-inset-left',
  '100dvh',
  'font-size:16px!important',
  '.activity-wrap{overflow-x:auto!important',
  '.workspace[aria-labelledby="jobs-title"] .activity-table',
  '.workspace[aria-labelledby="applications-title"] .activity-table',
  'min-height:44px!important'
]) {
  assert.ok(ADMIN_RESPONSIVE_STYLE.includes(contract), `Admin responsive contract missing: ${contract}`);
}

assert.match(navSource, /Escape/, 'Mobile navigation must remain keyboard-dismissable.');
assert.match(navSource, /focusable/, 'Mobile navigation must retain its focus trap.');
assert.match(navSource, /innerWidth > 1100/, 'Open mobile navigation must close when the layout returns to desktop navigation.');

assert.match(previewServerSource, /handlePublicMediaRequest/, 'Phase 18 preview must reuse the production public-media handler.');
assert.match(previewServerSource, /url\.pathname\.startsWith\('\/media\/pexels\/'\)/, 'Phase 18 preview must route first-party responsive media before static-file resolution.');

const prerenderRoutes = getPrerenderRoutes();
assert.ok(prerenderRoutes.length >= ALL_ROUTES.length, 'Responsive route inventory must include every configured public route.');
for (const route of ['/', '/about-us', '/contact', '/careers', '/privacy', '/terms']) {
  assert.ok(prerenderRoutes.includes(route), `Responsive route inventory is missing ${route}.`);
}
assert.deepEqual(getPublishedJobs(), [], 'Static builds must keep the server-authoritative no-openings baseline; Phase 18 must not reintroduce a source-code vacancy catalog.');
assert.ok(careersCss.includes('.career-role-detail') && careersCss.includes('.career-application-layout'), 'Runtime job-detail and candidate-application responsive selectors must remain available for database-backed vacancies.');

console.log(`PASS: Phase 18 responsive contracts cover ${prerenderRoutes.length} static public routes plus runtime Careers/application selectors, forms, legal tables, production-media preview parity and admin breakpoint/touch behavior.`);

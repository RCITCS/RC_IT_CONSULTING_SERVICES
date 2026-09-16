import { readFile } from 'node:fs/promises';
import { adminChip, brandTemplate, button, field, pageIntro, panel } from '../src/frontend/app/components.js';
import { siteShell } from '../src/frontend/layouts/site-shell.js';
import { badge, spinner, inlineAlert } from '../src/frontend/components/feedback.js';

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const intro = pageIntro({ eyebrow: 'Platform', title: 'Operations', copy: 'Manage active work.' });
assert(intro.includes('class="page-intro"'), 'Page intro class missing');
assert(intro.includes('<h1>Operations</h1>'), 'Page intro title missing');
pass('page intro renders semantic heading');

const primaryButton = button({ label: 'Save', type: 'submit', className: 'button-primary', attributes: 'data-action="save"' });
assert(primaryButton.includes('type="submit"'), 'Button type missing');
assert(primaryButton.includes('data-action="save"'), 'Button attributes missing');
pass('button supports type and custom attributes');

const textField = field({ label: 'Name', name: 'name', value: '<script>', required: true });
assert(textField.includes('value="&lt;script&gt;"'), 'Field value is not escaped');
assert(textField.includes('required'), 'Required state missing');
pass('field escapes values and preserves required state');

const contentPanel = panel({ title: 'Summary', body: '<p>Ready</p>', className: 'summary-panel' });
assert(contentPanel.includes('summary-panel'), 'Panel class missing');
assert(contentPanel.includes('<h2>Summary</h2>'), 'Panel heading missing');
pass('panel renders reusable section structure');

const brand = brandTemplate();
assert(brand.includes('href="/"'), 'Brand must link to the canonical public home route');
assert(brand.includes('class="brand-mark" aria-hidden="true"'), 'Decorative brand mark must be hidden from the accessibility tree');
assert(!/<a\b[^>]*class="brand"[^>]*aria-label=/i.test(brand), 'Brand link must derive its accessible name from the visible copy instead of an overriding aria-label');
assert(brand.includes('<strong>RC IT Services</strong>'), 'Brand visible company name is missing');
assert(brand.includes('<span>Technology & Consulting</span>'), 'Brand visible descriptor is missing');
pass('brand derives its accessible name from visible content');

const chip = adminChip('Internal');
assert(chip.includes('admin-chip'), 'Admin chip class missing');
pass('admin chip renders');

const badgeMarkup = badge('Active', 'badge-success');
assert(badgeMarkup.includes('badge-success'), 'Badge variant missing');
assert(badgeMarkup.includes('Active'), 'Badge label missing');
pass('badge renders variant and label');

const loading = spinner('Loading records');
assert(loading.includes('role="status"'), 'Spinner status role missing');
assert(loading.includes('Loading records'), 'Spinner label missing');
pass('spinner exposes accessible status');

const alert = inlineAlert('Something changed', 'warning');
assert(alert.includes('role="alert"'), 'Alert role missing');
assert(alert.includes('alert-warning'), 'Alert variant missing');
pass('inline alert exposes accessible alert role');

const shell = siteShell('/products', '<main id="main-content">Page</main>');
const headerIndex = shell.indexOf('site-header');
const mainIndex = shell.indexOf('<main id="main-content">');
const footerIndex = shell.indexOf('site-footer');
assert(!shell.includes('class="skip-link"'), 'Site shell must not duplicate the document-level skip-navigation control');
assert(headerIndex >= 0 && headerIndex < mainIndex && mainIndex < footerIndex, 'Site shell composition order is invalid');
pass('site shell composes header, main and footer without duplicating document controls');

const publicIndex = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const skipLinkMarkup = '<a class="skip-link" href="#main-content">Skip to main content</a>';
const skipLinkCount = publicIndex.split(skipLinkMarkup).length - 1;
assert(skipLinkCount === 1, 'Document template must expose exactly one keyboard skip-navigation control');
assert(publicIndex.indexOf(skipLinkMarkup) < publicIndex.indexOf('<div id="site-root">'), 'Skip-navigation control must precede the application root');
pass('document template owns one skip-navigation control before the application root');

const baseCss = await readFile(new URL('../src/frontend/styles/base.css', import.meta.url), 'utf8');
assert(baseCss.includes('.skip-link'), 'Skip-link base styling is missing');
assert(baseCss.includes('.skip-link:focus'), 'Skip-link focus styling is missing');
assert(baseCss.includes(':focus-visible'), 'Global keyboard focus-visible styling is missing');
pass('base styles preserve keyboard focus and skip-link visibility');

const appCss = await readFile(new URL('../src/frontend/styles/app.css', import.meta.url), 'utf8');
assert(appCss.includes('@import "./global-overrides.css";'), 'Application stylesheet must include global override composition');
pass('application stylesheet composes global overrides');

const globalOverrides = await readFile(new URL('../src/frontend/styles/global-overrides.css', import.meta.url), 'utf8');
for (const requiredImport of ['./responsive.css', './audit-fixes.css', './bootstrap-overrides.css', './phase18-responsive.css', './phase19-quality.css']) {
  assert(globalOverrides.includes(`@import "${requiredImport}";`), `Global overrides are missing ${requiredImport}`);
}
pass('global override composition includes responsive, audit, bootstrap, phase 18 and phase 19 layers');

const phase19Css = await readFile(new URL('../src/frontend/styles/phase19-quality.css', import.meta.url), 'utf8');
assert(phase19Css.includes('.site-footer .brand-copy span'), 'Phase 19 footer brand contrast correction is missing');
assert(phase19Css.includes('.footer-column a'), 'Phase 19 footer target-size correction is missing');
assert(phase19Css.includes('.contact-office-card > .eyebrow'), 'Phase 19 office eyebrow contrast correction is missing');
pass('phase 19 accessibility overrides are isolated in their dedicated stylesheet');

const navigationSource = await readFile(new URL('../src/frontend/components/navigation.js', import.meta.url), 'utf8');
assert(navigationSource.includes('aria-expanded="false"'), 'Navigation toggle must expose initial aria-expanded state');
assert(navigationSource.includes('aria-controls="site-navigation"'), 'Navigation toggle must reference the controlled navigation region');
assert(navigationSource.includes('id="site-navigation"'), 'Navigation region id is missing');
pass('navigation source exposes menu accessibility state contract');

const interactionsSource = await readFile(new URL('../src/frontend/app/interactions-nav.js', import.meta.url), 'utf8');
assert(interactionsSource.includes("setAttribute('aria-expanded'"), 'Navigation interactions must update aria-expanded');
assert(interactionsSource.includes("event.key === 'Escape'"), 'Navigation interactions must support Escape dismissal');
pass('navigation interactions preserve keyboard-operable menu behavior');

console.log('PASS: Design system contracts verified.');

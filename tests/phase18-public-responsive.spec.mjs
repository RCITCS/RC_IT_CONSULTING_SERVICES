import { test, expect } from '@playwright/test';
import { getPrerenderRoutes } from '../src/frontend/seo/seo-model.js';

const representativeRoutes = [
  '/',
  '/about-us',
  '/products',
  '/white-papers',
  '/services/it/cyber-security',
  '/services/management/strategy-and-implementation',
  '/industry/banking-and-finance',
  '/contact',
  '/careers',
  '/faqs',
  '/privacy',
  '/terms'
];

async function expectNoDocumentOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body?.scrollWidth ?? 0
  }));
  expect(metrics.scrollWidth, `${label}: document overflow`).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.bodyScrollWidth, `${label}: body overflow`).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

async function expectNoRuntimeErrors(page, run) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  await run();
  expect(errors, errors.join('\n')).toEqual([]);
}

for (const route of representativeRoutes) {
  test(`route ${route} stays inside the viewport`, async ({ page }, testInfo) => {
    await expectNoRuntimeErrors(page, async () => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.ok(), `${route} should return successfully`).toBeTruthy();
      await expect(page.locator('#main-content')).toBeVisible();
      await expectNoDocumentOverflow(page, `${testInfo.project.name} ${route}`);
    });
  });
}

test('global navigation switches intentionally and mobile menu remains operable', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const width = page.viewportSize()?.width ?? 1280;
  const mobileButton = page.locator('.mobile-menu-button');
  const desktopNav = page.locator('.desktop-nav');

  if (width <= 1100) {
    await expect(mobileButton).toBeVisible();
    await mobileButton.click();
    await expect(page.locator('#mobile-panel')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('.mobile-close')).toBeFocused();
    await expectNoDocumentOverflow(page, 'open mobile navigation');
    await page.keyboard.press('Escape');
    await expect(page.locator('#mobile-panel')).toHaveAttribute('aria-hidden', 'true');
  } else {
    await expect(desktopNav).toBeVisible();
    await expect(mobileButton).toBeHidden();
  }
});

test('runtime Careers detail and candidate application layouts tolerate extreme content', async ({ page }) => {
  await page.goto('/careers', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#main-content')).toBeVisible();

  await page.locator('#main-content').evaluate((main) => {
    main.innerHTML = `<section class="section"><div class="container"><div class="career-browser">
      <aside class="career-role-list"><div class="career-role-list__head"><span class="eyebrow">Open roles</span><strong>1 role</strong></div><div class="career-role-list__items"><a class="career-role-card is-active" href="#"><span class="career-role-card__department">Engineering</span><h3>PrincipalPlatformEngineeringAndTransformationArchitectPrincipalPlatformEngineeringAndTransformationArchitect</h3><div class="career-role-card__meta"><span>London / Hybrid / United Kingdom</span><span>Full time</span></div></a></div></aside>
      <article class="career-role-detail"><div class="career-role-detail__head"><div><span class="eyebrow">Engineering</span><h2>PrincipalPlatformEngineeringAndTransformationArchitectPrincipalPlatformEngineeringAndTransformationArchitect</h2><p>Representative database-backed vacancy content.</p></div><a class="btn btn--primary career-apply-cta" href="#apply">Apply for this role</a></div><div class="career-role-facts"><div><span>Location</span><strong>LondonHybridUnitedKingdomWithAnUnbrokenOperationalLocationValue</strong></div><div><span>Type</span><strong>Full time</strong></div><div><span>Experience</span><strong>Senior</strong></div><div><span>Reference</span><strong>RCIT-EXTREMELY-LONG-REFERENCE-2026-000001</strong></div></div><section class="career-role-section career-role-section--tags"><h3>Technology</h3><div class="career-role-tags"><span>ExtremelyLongUnbrokenTechnologyIdentifierThatMustWrapInsideTheViewport</span><span>Cloud</span></div></section></article>
    </div></div></section>`;
  });
  await expect(page.locator('.career-role-detail')).toBeVisible();
  await expectNoDocumentOverflow(page, 'runtime career detail fixture');

  await page.locator('#main-content').evaluate((main) => {
    main.innerHTML = `<section class="section"><div class="container"><div class="career-application-layout">
      <aside class="career-application-summary"><span class="eyebrow">Application</span><h2>PrincipalPlatformEngineeringAndTransformationArchitect</h2><dl><div><dt>Reference</dt><dd>RCIT-EXTREMELY-LONG-REFERENCE-2026-000001</dd></div><div><dt>Location</dt><dd>LondonHybridUnitedKingdomWithAnUnbrokenOperationalLocationValue</dd></div></dl></aside>
      <div class="career-application-form-shell"><h2>Apply for this role</h2><form class="career-application-form"><div class="career-application-grid"><div class="form-field"><label for="phase18-name">Name</label><input id="phase18-name" name="name" value="Candidate Name"></div><div class="form-field"><label for="phase18-email">Email</label><input id="phase18-email" name="email" type="email" value="candidate@example.com"></div><div class="form-field career-application-grid__wide career-file-field"><label for="phase18-resume">Resume/CV</label><input id="phase18-resume" name="resume" type="file"><small>PDF or document upload.</small></div><div class="form-field career-application-grid__wide"><label for="phase18-message">Cover note</label><textarea id="phase18-message" name="message">Representative content</textarea></div></div><div class="form-actions"><button class="btn btn--primary" type="button">Submit application</button></div></form></div>
    </div></div></section>`;
  });
  await expect(page.locator('input[type="file"]')).toBeVisible();
  await expectNoDocumentOverflow(page, 'runtime candidate application fixture');
});

test('contact controls remain usable on narrow viewports', async ({ page }) => {
  await page.goto('/contact', { waitUntil: 'domcontentloaded' });
  const form = page.locator('#contact-form');
  await expect(form).toBeVisible();
  const controls = form.locator('input:not([type="hidden"]), textarea, select, button');
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const box = await controls.nth(index).boundingBox();
    if (!box) continue;
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 1280) + 1);
  }
  await expectNoDocumentOverflow(page, 'contact form');
});

test('legal table overflow is contained by its own scroller', async ({ page }) => {
  await page.goto('/privacy', { waitUntil: 'domcontentloaded' });
  const wrap = page.locator('.legal-table-wrap').first();
  if (await wrap.count()) {
    const containment = await wrap.evaluate((node) => ({ clientWidth: node.clientWidth, scrollWidth: node.scrollWidth }));
    expect(containment.scrollWidth).toBeGreaterThanOrEqual(containment.clientWidth);
  }
  await expectNoDocumentOverflow(page, 'legal page');
});

test('orientation-like resizing does not create document overflow', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit' && page.viewportSize()?.width === 320, 'Device-emulated WebKit project keeps its device viewport contract.');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/careers', { waitUntil: 'domcontentloaded' });
  await expectNoDocumentOverflow(page, 'landscape');
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoDocumentOverflow(page, 'portrait');
});

const routeInventory = getPrerenderRoutes();
test('static responsive inventory stays aligned with canonical route source', async () => {
  expect(routeInventory.length).toBeGreaterThanOrEqual(representativeRoutes.length);
});

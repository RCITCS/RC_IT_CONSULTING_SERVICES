import { test, expect } from '@playwright/test';
import { getPrerenderRoutes } from '../src/frontend/seo/seo-model.js';

const allRoutes = getPrerenderRoutes();
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
  allRoutes.find((route) => /^\/careers\/jobs\/[^/]+$/.test(route)),
  allRoutes.find((route) => /^\/careers\/jobs\/[^/]+\/apply$/.test(route)),
  '/faqs',
  '/privacy',
  '/terms'
].filter(Boolean);

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

test('Careers and candidate application tolerate extreme content', async ({ page }) => {
  const jobRoute = allRoutes.find((route) => /^\/careers\/jobs\/[^/]+$/.test(route));
  const applyRoute = allRoutes.find((route) => /^\/careers\/jobs\/[^/]+\/apply$/.test(route));
  test.skip(!jobRoute || !applyRoute, 'No published job fixture is available.');

  await page.goto(jobRoute, { waitUntil: 'domcontentloaded' });
  const title = page.locator('.career-role-detail h2, .page-hero h1').first();
  if (await title.count()) await title.evaluate((node) => { node.textContent = 'PrincipalPlatformEngineeringAndTransformationArchitect'.repeat(4); });
  await expectNoDocumentOverflow(page, 'extreme job title');

  await page.goto(applyRoute, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input[type="file"]').first()).toBeVisible();
  await expectNoDocumentOverflow(page, 'candidate application');
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

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/careers', '/contact'];
const productionAdminUrl = process.env.PHASE20_16_ADMIN_URL || '';

async function expectNoOverflow(page, label) {
  const m = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    body: document.body?.scrollWidth || 0
  }));
  expect(m.scroll, `${label}: document overflow`).toBeLessThanOrEqual(m.client + 1);
  expect(m.body, `${label}: body overflow`).toBeLessThanOrEqual(m.client + 1);
}

for (const route of routes) {
  test(`${route} passes cross-browser responsive and WCAG A/AA acceptance`, async ({ page }, testInfo) => {
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.ok(), `${route} must return successfully`).toBeTruthy();
    await expect(page.locator('#main-content')).toBeVisible();
    await expectNoOverflow(page, `${testInfo.project.name} ${route}`);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test('production admin sign-in remains responsive and WCAG A/AA clean across engines', async ({ page }, testInfo) => {
  test.skip(!productionAdminUrl, 'Production-only admin browser acceptance.');

  const response = await page.goto(productionAdminUrl, { waitUntil: 'networkidle' });
  expect(response?.ok(), 'admin sign-in must return successfully').toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Administrator sign in' })).toBeVisible();
  await expectNoOverflow(page, `${testInfo.project.name} admin sign-in`);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test('keyboard bypass and visible focus remain operable across engines', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);

  await page.goto('/contact', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  const focusStyle = await focused.evaluate((el) => {
    const s=getComputedStyle(el);
    return { outlineStyle:s.outlineStyle, outlineWidth:s.outlineWidth, boxShadow:s.boxShadow };
  });
  const outlined=focusStyle.outlineStyle !== 'none' && focusStyle.outlineWidth !== '0px';
  const shadowed=Boolean(focusStyle.boxShadow && focusStyle.boxShadow !== 'none');
  expect(outlined || shadowed).toBeTruthy();
});

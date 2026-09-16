import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  '/',
  '/about-us',
  '/services/it/cloud-computing',
  '/industry/banking-and-finance',
  '/careers',
  '/contact',
  '/privacy-policy'
];

for (const route of routes) {
  test(`${route} has no automated WCAG A/AA violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test('keyboard users can bypass repeated navigation and reach main content', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.keyboard.press('Tab');
  const skipLink = page.locator('.skip-link');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveText('Skip to main content');

  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page).toHaveURL(/#main-content$/);
});

test('interactive controls retain visible keyboard focus', async ({ page }) => {
  await page.goto('/contact', { waitUntil: 'domcontentloaded' });

  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();

  const outline = await focused.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow
    };
  });

  const hasOutline = outline.outlineStyle !== 'none' && outline.outlineWidth !== '0px';
  const hasShadow = outline.boxShadow && outline.boxShadow !== 'none';
  expect(hasOutline || hasShadow).toBeTruthy();
});

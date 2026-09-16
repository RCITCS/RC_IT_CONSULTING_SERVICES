import { test, expect } from '@playwright/test';
import { ADMIN_RESPONSIVE_STYLE } from '../worker/admin-responsive.js';

function adminHarness() {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${ADMIN_RESPONSIVE_STYLE}</head><body>
    <div class="admin-shell">
      <header class="global-header"><div class="global-header-inner"><div class="product-brand"><span class="brandmark">RC</span><div class="brand-copy"><strong>RC IT Services</strong><span>Administration</span></div></div><nav class="primary-nav"><a href="#">Dashboard</a><a href="#">Jobs</a><a href="#">Applications</a></nav><div class="header-actions"><span class="header-account">very.long.administrator.identity@example.com</span><details class="mobile-nav"><summary>Menu</summary><div class="mobile-menu"><a href="#">Dashboard</a><button>Sign out</button></div></details></div></div></header>
      <div class="workspace-bar"><div class="workspace-bar-inner"><div class="workspace-context"><strong>Operations</strong><span>Production</span></div><span class="workspace-state">Healthy</span></div></div>
      <main class="workspace" aria-labelledby="jobs-title"><div class="page-heading"><div><span class="eyebrow">Vacancies</span><h1 id="jobs-title">Job management</h1><p>Responsive operational register.</p></div><div class="snapshot"><strong>Updated now</strong>Production</div></div>
        <section class="data-plane"><div class="section-header"><div><h2>Published jobs</h2><p>Manage vacancies.</p></div><button class="btn">Create job</button></div><div class="activity-wrap"><table class="activity-table"><thead><tr><th>Role</th><th>Status</th><th>Category</th><th>Location</th><th>Applications</th><th>Updated</th><th>Actions</th></tr></thead><tbody><tr><td>PrincipalPlatformEngineeringAndTransformationArchitectWithAnExtremelyLongTitle</td><td>Published</td><td>Technology Consulting</td><td>London / Hybrid / United Kingdom</td><td>128</td><td>16 September 2026</td><td><div><button class="btn">Edit</button><button class="btn secondary">Close</button></div></td></tr></tbody></table></div></section>
        <section class="activity-plane"><div class="activity-wrap"><table class="activity-table"><thead><tr><th>Event</th><th>Type</th><th>Time</th></tr></thead><tbody><tr><td>CandidateApplicationSubmittedWithAnUnbrokenIdentifierThatMustNotBreakTheViewport</td><td>Application</td><td>Now</td></tr></tbody></table></div></section>
      </main>
    </div>
  </body></html>`;
}

async function expectNoDocumentOverflow(page, label) {
  const metrics = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(metrics.scroll, `${label}: document overflow`).toBeLessThanOrEqual(metrics.width + 1);
}

test('admin navigation, registers and touch actions remain usable', async ({ page }) => {
  await page.setContent(adminHarness(), { waitUntil: 'domcontentloaded' });
  const width = page.viewportSize()?.width ?? 1280;
  await expectNoDocumentOverflow(page, 'admin harness');

  if (width <= 1180) {
    await expect(page.locator('.primary-nav')).toBeHidden();
    await expect(page.locator('.mobile-nav')).toBeVisible();
  } else {
    await expect(page.locator('.primary-nav')).toBeVisible();
  }

  if (width <= 900) {
    const jobsTable = page.locator('.workspace[aria-labelledby="jobs-title"] .activity-table').first();
    await expect(jobsTable).toHaveCSS('display', 'block');
    const actionButtons = jobsTable.locator('tbody td:nth-child(7) .btn');
    const count = await actionButtons.count();
    for (let index = 0; index < count; index += 1) {
      const box = await actionButtons.nth(index).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  }
});

test('admin authentication surface fits phone and tablet viewports', async ({ page }) => {
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${ADMIN_RESPONSIVE_STYLE}</head><body><div class="auth"><aside class="auth-context"><div class="auth-brand">RC IT Services</div><div class="auth-context-copy">Private administration</div></aside><main class="auth-main"><form class="auth-card"><h1>Administrator sign in</h1><div class="field"><label>Email<input type="email" value="administrator@example.com"></label></div><div class="field"><label>Password<input type="password" value="example-password"></label></div><button class="btn">Sign in</button></form></main></div></body></html>`);
  await expectNoDocumentOverflow(page, 'admin authentication');
  const input = page.locator('input').first();
  if ((page.viewportSize()?.width ?? 1280) <= 900) await expect(input).toHaveCSS('font-size', '16px');
});

test('applications register uses the responsive card contract and contains extreme values', async ({ page }) => {
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${ADMIN_RESPONSIVE_STYLE}</head><body><div class="admin-shell"><main class="workspace" aria-labelledby="applications-title"><div class="page-heading"><div><h1 id="applications-title">Applications</h1></div></div><section class="data-plane"><div class="activity-wrap"><table class="activity-table"><thead><tr><th>Candidate</th><th>Job</th><th>Status</th><th>Documents</th><th>Reference</th><th>Submitted</th></tr></thead><tbody><tr><td>CandidateWithAnExtremelyLongUnbrokenDisplayNameThatMustStayInsideTheCard</td><td>Principal Platform Engineering Architect</td><td>New</td><td>ResumeAndCoverLetterWithLongFilenames.pdf</td><td>APP-2026-EXTREMELY-LONG-REFERENCE-000001</td><td>16 September 2026</td></tr></tbody></table></div></section></main></div></body></html>`);
  await expectNoDocumentOverflow(page, 'applications register');
  if ((page.viewportSize()?.width ?? 1280) <= 900) {
    await expect(page.locator('.activity-table')).toHaveCSS('display', 'block');
    await expect(page.locator('.activity-table tbody td').first()).toHaveCSS('overflow-wrap', 'anywhere');
  }
});

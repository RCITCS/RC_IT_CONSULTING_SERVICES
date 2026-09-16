import { test, expect } from '@playwright/test';
import { ADMIN_RESPONSIVE_STYLE } from '../worker/admin-responsive.js';
import { ADMIN_INTERACTION_STYLE } from '../worker/admin-interactions.js';

const BASE_ADMIN_STYLE = `<style data-phase18-admin-base>
:root{--page:#f4f6f8;--surface:#fff;--surface-subtle:#f8fafc;--ink:#111827;--text:#263244;--muted:#667085;--quiet:#8993a4;--line:#d9e0e8;--line-strong:#c8d0da;--nav:#0b1424;--accent:#2f5bd3}
*{box-sizing:border-box}html,body{margin:0;max-width:100%;font-family:Arial,sans-serif;background:var(--page);color:var(--text)}button,input,textarea,select{font:inherit}.admin-shell{min-height:100vh}.global-header{height:64px;background:var(--nav);color:#fff}.global-header-inner{height:100%;padding:0 28px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:28px}.product-brand,.header-actions,.primary-nav{display:flex;align-items:center;gap:12px}.primary-nav{justify-self:start}.primary-nav a{color:#fff;text-decoration:none}.mobile-nav{display:none}.workspace-bar-inner{min-height:42px;padding:0 28px;display:flex;align-items:center;justify-content:space-between}.workspace{padding:30px 28px 46px}.page-heading{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:end;margin-bottom:22px}.section-header{display:flex;justify-content:space-between;gap:18px;padding:16px 18px}.data-plane,.activity-plane{min-width:0;background:#fff;border:1px solid var(--line);overflow:hidden}.activity-plane{margin-top:14px}.activity-wrap{max-width:100%;overflow-x:auto}.activity-table{width:100%;border-collapse:collapse;table-layout:fixed}.activity-table th,.activity-table td{padding:12px;border-bottom:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:9px 14px;border:1px solid var(--accent);background:var(--accent);color:#fff}.btn.secondary{background:#fff;color:var(--text);border-color:var(--line-strong)}.auth{min-height:100vh;display:grid;grid-template-columns:minmax(320px,.82fr) minmax(460px,1.18fr);background:#fff}.auth-context{min-height:100vh;padding:48px;background:var(--nav);color:#fff}.auth-main{display:grid;place-items:center;padding:48px}.auth-card{width:min(100%,460px)}.field{margin:20px 0}.field label{display:block}.field input{width:100%;min-height:44px;padding:11px 12px}.actions{display:flex;gap:10px;flex-wrap:wrap}.job-editor-form input,.job-editor-form textarea{width:100%;max-width:100%}
</style>`;

function adminHarness() {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${BASE_ADMIN_STYLE}${ADMIN_RESPONSIVE_STYLE}</head><body>
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
    await expect(page.locator('.mobile-nav')).toBeHidden();
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
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${BASE_ADMIN_STYLE}${ADMIN_RESPONSIVE_STYLE}</head><body><div class="auth"><aside class="auth-context"><div class="auth-brand">RC IT Services</div><div class="auth-context-copy">Private administration</div></aside><main class="auth-main"><form class="auth-card"><h1>Administrator sign in</h1><div class="field"><label>Email<input type="email" value="administrator@example.com"></label></div><div class="field"><label>Password<input type="password" value="example-password"></label></div><button class="btn">Sign in</button></form></main></div></body></html>`);
  await expectNoDocumentOverflow(page, 'admin authentication');
  const input = page.locator('input').first();
  if ((page.viewportSize()?.width ?? 1280) <= 900) await expect(input).toHaveCSS('font-size', '16px');
});

test('applications register uses the responsive card contract and contains extreme values', async ({ page }) => {
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${BASE_ADMIN_STYLE}${ADMIN_RESPONSIVE_STYLE}</head><body><div class="admin-shell"><main class="workspace" aria-labelledby="applications-title"><div class="page-heading"><div><h1 id="applications-title">Applications</h1></div></div><section class="data-plane"><div class="activity-wrap"><table class="activity-table"><thead><tr><th>Candidate</th><th>Job</th><th>Status</th><th>Documents</th><th>Reference</th><th>Submitted</th></tr></thead><tbody><tr><td>CandidateWithAnExtremelyLongUnbrokenDisplayNameThatMustStayInsideTheCard</td><td>Principal Platform Engineering Architect</td><td>New</td><td>ResumeAndCoverLetterWithLongFilenames.pdf</td><td>APP-2026-EXTREMELY-LONG-REFERENCE-000001</td><td>16 September 2026</td></tr></tbody></table></div></section></main></div></body></html>`);
  await expectNoDocumentOverflow(page, 'applications register');
  if ((page.viewportSize()?.width ?? 1280) <= 900) {
    await expect(page.locator('.activity-table')).toHaveCSS('display', 'block');
    await expect(page.locator('.activity-table tbody td').first()).toHaveCSS('overflow-wrap', 'anywhere');
  }
});

test('admin action dialog remains bounded and internally scrollable', async ({ page }) => {
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${BASE_ADMIN_STYLE}${ADMIN_RESPONSIVE_STYLE}${ADMIN_INTERACTION_STYLE}</head><body><dialog class="rc-admin-dialog" open><div class="rc-admin-dialog-shell"><header class="rc-admin-dialog-bar"><h2>Very long administrative action title that must remain contained</h2><button class="rc-admin-dialog-close" type="button">×</button></header><div class="rc-admin-dialog-body"><main class="workspace"><div class="page-heading"><div><h1>Edit vacancy</h1></div></div><section class="data-plane"><form class="job-editor-form" style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><label>Title<input value="Principal Platform Engineering Architect"></label><label>Location<input value="London"></label><label style="grid-column:1/-1">Description<textarea id="job-description">Long form content</textarea></label><div class="actions" style="grid-column:1/-1"><button class="btn">Save</button><button class="btn secondary">Cancel</button></div></form></section></main></div></div></dialog></body></html>`);
  await expect(page.locator('.rc-admin-dialog')).toBeVisible();
  const bounds = await page.locator('.rc-admin-dialog').boundingBox();
  const viewport = page.viewportSize();
  expect(bounds?.width ?? Infinity).toBeLessThanOrEqual((viewport?.width ?? 1280) + 1);
  expect(bounds?.height ?? Infinity).toBeLessThanOrEqual((viewport?.height ?? 800) + 1);
  await expectNoDocumentOverflow(page, 'admin dialog');
});

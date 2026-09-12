import assert from 'node:assert/strict';
import { ADMIN_RESPONSIVE_STYLE, injectAdminResponsiveHtml } from '../worker/admin-responsive.js';

for (const contract of [
  'data-rc-admin-responsive',
  '@media(max-width:1180px)',
  '@media(max-width:900px)',
  '@media(max-width:640px)',
  '@media(max-width:420px)',
  '.primary-nav,.header-account,.header-signout{display:none!important}',
  '.mobile-nav{display:block!important}',
  '.auth{grid-template-columns:1fr!important',
  'font-size:16px!important',
  'safe-area-inset-left',
  '100dvh',
  '.activity-wrap{overflow-x:auto!important',
  '.data-plane form[style*="grid-template-columns"]{grid-template-columns:1fr!important',
  '.identity-row{grid-template-columns:1fr!important'
]) {
  assert.ok(ADMIN_RESPONSIVE_STYLE.includes(contract), `Responsive admin contract missing: ${contract}`);
}

const page = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main class="admin-shell">Admin</main></body></html>';
const once = injectAdminResponsiveHtml(page);
assert.ok(once.includes('data-rc-admin-responsive'), 'Responsive stylesheet must be injected into admin HTML.');
assert.equal((once.match(/data-rc-admin-responsive/g) || []).length, 1, 'Responsive stylesheet must be injected exactly once.');
assert.equal(injectAdminResponsiveHtml(once), once, 'Responsive enhancement must be idempotent.');
assert.equal(injectAdminResponsiveHtml('<html><body>No head</body></html>'), '<html><body>No head</body></html>', 'Pages without a head are left unchanged.');

console.log('PASS: dedicated admin UI has phone and iPad/tablet responsive contracts without changing desktop workflow authority.');

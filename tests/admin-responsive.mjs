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
  '.identity-row{grid-template-columns:1fr!important',
  '.workspace[aria-labelledby="jobs-title"] .activity-table{display:block!important',
  '.workspace[aria-labelledby="applications-title"] .activity-table{display:block!important',
  '.workspace[aria-labelledby="jobs-title"] .activity-table tbody tr{display:grid!important',
  '.workspace[aria-labelledby="applications-title"] .activity-table tbody tr{display:grid!important',
  'content:"Role"',
  'content:"Status"',
  'content:"Applications"',
  'content:"Actions"',
  'content:"Candidate"',
  'content:"Documents"',
  'content:"Submitted"',
  'grid-template-columns:repeat(2,minmax(0,1fr))!important',
  '.workspace[aria-labelledby="jobs-title"] .activity-table td[colspan]',
  '.workspace[aria-labelledby="applications-title"] .activity-table td[colspan]'
]) {
  assert.ok(ADMIN_RESPONSIVE_STYLE.includes(contract), `Responsive admin contract missing: ${contract}`);
}

const page = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main class="admin-shell">Admin</main></body></html>';
const once = injectAdminResponsiveHtml(page);
assert.ok(once.includes('data-rc-admin-responsive'), 'Responsive stylesheet must be injected into admin HTML.');
assert.equal((once.match(/data-rc-admin-responsive/g) || []).length, 1, 'Responsive stylesheet must be injected exactly once.');
assert.equal(injectAdminResponsiveHtml(once), once, 'Responsive enhancement must be idempotent.');
assert.equal(injectAdminResponsiveHtml('<html><body>No head</body></html>'), '<html><body>No head</body></html>', 'Pages without a head are left unchanged.');

assert.ok(
  ADMIN_RESPONSIVE_STYLE.indexOf('.workspace[aria-labelledby="jobs-title"] .activity-table{display:block!important')
    < ADMIN_RESPONSIVE_STYLE.indexOf('@media(max-width:640px)'),
  'Jobs register must switch to card layout at tablet width, not only narrow phone width.'
);
assert.ok(
  ADMIN_RESPONSIVE_STYLE.includes('.workspace[aria-labelledby="jobs-title"] .activity-table tbody td:nth-child(7)>div{width:100%!important;display:grid!important'),
  'Job actions must become a touch-friendly grid instead of a compressed inline button row.'
);
assert.ok(
  ADMIN_RESPONSIVE_STYLE.includes('.workspace[aria-labelledby="applications-title"] .activity-table tbody td:nth-child(1){grid-column:1/-1!important'),
  'Applications register must keep candidate identity full-width in mobile card layout.'
);

console.log('PASS: dedicated admin UI has phone and iPad/tablet responsive contracts, including native Jobs and Applications register card layouts, without changing desktop workflow authority.');

import assert from 'node:assert/strict';
import { legacyAdminRedirect } from '../worker/index.js';

{
  const response = legacyAdminRedirect(new Request('https://admin.rcitcs.com/admin'));
  assert.equal(response?.status, 308);
  assert.equal(response?.headers.get('location'), 'https://admin.rcitcs.com/');
  assert.match(response?.headers.get('cache-control') || '', /no-store/);
}

{
  const response = legacyAdminRedirect(new Request('https://admin.rcitcs.com/admin/jobs?status=published'));
  assert.equal(response?.status, 308);
  assert.equal(response?.headers.get('location'), 'https://admin.rcitcs.com/jobs?status=published');
}

{
  const response = legacyAdminRedirect(new Request('https://admin-staging.rcitcs.com/admin/applications'));
  assert.equal(response?.status, 308);
  assert.equal(response?.headers.get('location'), 'https://admin-staging.rcitcs.com/applications');
}

{
  const response = legacyAdminRedirect(new Request('https://admin.rcitcs.com/admin/change-password', { method: 'POST', body: 'csrf=placeholder' }));
  assert.equal(response?.status, 409, 'Legacy mutating admin routes must fail closed instead of replaying to a new cookie path.');
  assert.match(await response.text(), /Reload the administration portal/);
}

assert.equal(legacyAdminRedirect(new Request('https://admin.rcitcs.com/jobs')), null, 'Canonical dedicated-host routes must pass through untouched.');
assert.equal(legacyAdminRedirect(new Request('https://rcitcs.com/admin/jobs')), null, 'Public corporate routes are governed by the canonical worker public-admin redirect policy.');

console.log('PASS: dedicated admin hosts migrate legacy /admin bookmarks to clean canonical routes without replaying state-changing requests.');

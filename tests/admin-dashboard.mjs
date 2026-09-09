import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = await readFile(path.join(root, 'supabase/functions/admin-auth/index.ts'), 'utf8');
const uiSource = await readFile(path.join(root, 'supabase/functions/admin-auth/ui.ts'), 'utf8');
const dashboardSource = `${indexSource}\n${uiSource}`;
const databaseSource = await readFile(path.join(root, 'supabase/functions/admin-auth/db.ts'), 'utf8');
const migration = await readFile(path.join(root, 'supabase/migrations/20260909052846_phase_10_dashboard_snapshot_query_optimization.sql'), 'utf8');

for (const header of [
  'cache-control',
  'no-store',
  'x-robots-tag',
  'noindex',
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options'
]) assert.ok(dashboardSource.includes(header), 'missing private-admin response control: ' + header);

assert.ok(indexSource.includes('dashboardSnapshot(authState.admin.id)'));
assert.match(indexSource, /admin\.role\s*!==\s*["']super_admin["']/);
assert.ok(uiSource.includes('aria-labelledby="dashboard-title"'));
assert.ok(uiSource.includes('aria-label="Administration"'));
assert.ok(uiSource.includes('aria-label="Sign out"'));
assert.ok(uiSource.includes('font-variant-numeric:tabular-nums'));
assert.ok(uiSource.includes('overflow-x:auto'));
assert.ok(uiSource.includes('prefers-reduced-motion:reduce'));
assert.ok(uiSource.includes('No recent administrative activity has been recorded.'));
assert.ok(indexSource.includes('Dashboard unavailable'));
assert.ok(indexSource.includes('phase10-enterprise-ledger'));

const requiredLabels = [
  'Operational ledger', 'Recruitment positions', 'Open', 'Published', 'Draft',
  'Application workload', 'Today', 'This week', 'Unread', 'Attention queue',
  'Contact enquiries', 'Unread notifications', 'Recent activity'
];
for (const label of requiredLabels) assert.ok(uiSource.includes(label), 'dashboard label missing: ' + label);

for (const rejected of ['Operations Console', 'Operational command view', 'Live data', 'metric-board', 'live-badge', 'linear-gradient']) {
  assert.ok(!dashboardSource.includes(rejected), 'rejected generic dashboard pattern present: ' + rejected);
}

for (const phase11 of ['>Create job<', '>Edit job<', '>Publish job<', '>Unpublish<', '>Delete job<', '>Close position<']) {
  assert.ok(!dashboardSource.includes(phase11), 'Phase 11 control leaked into Phase 10: ' + phase11);
}

assert.ok(databaseSource.includes('rpc/get_admin_dashboard_snapshot'));
assert.ok(migration.includes('security invoker'));
assert.ok(migration.includes("role = 'super_admin'"));
assert.ok(migration.includes("status = 'active'"));
assert.ok(migration.includes("time zone 'Europe/London'"));
assert.ok(migration.includes('revoke all on function public.get_admin_dashboard_snapshot(uuid) from public, anon, authenticated'));
assert.ok(migration.includes('grant execute on function public.get_admin_dashboard_snapshot(uuid) to service_role'));
assert.ok(!/security\s+definer/i.test(migration));

console.log('PASS: Phase 10 admin dashboard UI, private response controls, accessibility/responsive hooks and database authority verified.');

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = await readFile(path.join(root, 'supabase/functions/admin-auth/index.ts'), 'utf8');
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
]) assert.ok(indexSource.includes(header), 'missing private-admin response control: ' + header);

assert.ok(indexSource.includes('dashboardSnapshot(s.admin.id)'));
assert.ok(indexSource.includes('s.admin.role!=="super_admin"'));
assert.ok(indexSource.includes('aria-labelledby="dashboard-title"'));
assert.ok(indexSource.includes('aria-label="Administration"'));
assert.ok(indexSource.includes('aria-label="Sign out"'));
assert.ok(indexSource.includes('font-variant-numeric:tabular-nums'));
assert.ok(indexSource.includes('overflow-x:auto'));
assert.ok(indexSource.includes('prefers-reduced-motion:reduce'));
assert.ok(indexSource.includes('No recent administrative activity has been recorded.'));
assert.ok(indexSource.includes('Dashboard unavailable'));

const requiredLabels = [
  'Recruitment positions', 'Open', 'Published', 'Draft',
  'Application workload', 'Today', 'This week', 'Unread',
  'Contact enquiries', 'Unread notifications', 'Recent activity'
];
for (const label of requiredLabels) assert.ok(indexSource.includes(label), 'dashboard label missing: ' + label);

for (const rejected of ['Operations Console', 'Operational command view', 'Live data', 'metric-board', 'live-badge', 'linear-gradient']) {
  assert.ok(!indexSource.includes(rejected), 'rejected generic dashboard pattern present: ' + rejected);
}

assert.ok(databaseSource.includes('rpc/get_admin_dashboard_snapshot'));
assert.ok(migration.includes('security invoker'));
assert.ok(migration.includes("role = 'super_admin'"));
assert.ok(migration.includes("status = 'active'"));
assert.ok(migration.includes("time zone 'Europe/London'"));
assert.ok(migration.includes('revoke all on function public.get_admin_dashboard_snapshot(uuid) from public, anon, authenticated'));
assert.ok(migration.includes('grant execute on function public.get_admin_dashboard_snapshot(uuid) to service_role'));
assert.ok(!/security\s+definer/i.test(migration));

console.log('PASS: Phase 10 admin dashboard source, private response controls, accessibility/responsive hooks and database authority verified.');

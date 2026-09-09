import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = await readFile(path.join(root, 'supabase/functions/admin-auth/index.ts'), 'utf8');
const uiSource = await readFile(path.join(root, 'supabase/functions/admin-auth/ui.ts'), 'utf8');
const securitySource = await readFile(path.join(root, 'supabase/functions/admin-auth/security.ts'), 'utf8');
const dashboardSource = `${indexSource}\n${uiSource}\n${securitySource}`;
const databaseSource = await readFile(path.join(root, 'supabase/functions/admin-auth/db.ts'), 'utf8');
const migration = await readFile(path.join(root, 'supabase/migrations/20260909052846_phase_10_dashboard_snapshot_query_optimization.sql'), 'utf8');
const sessionFastPathMigration = await readFile(path.join(root, 'supabase/migrations/20260909215000_phase_10_admin_session_context_fast_path.sql'), 'utf8');
const dashboardFastPathMigration = await readFile(path.join(root, 'supabase/migrations/20260909220500_phase_10_dashboard_page_context_fast_path.sql'), 'utf8');

for (const header of ['cache-control','no-store','x-robots-tag','noindex','content-security-policy','strict-transport-security','x-frame-options']) {
  assert.ok(dashboardSource.includes(header), 'missing private-admin response control: ' + header);
}

assert.ok(indexSource.includes('dashboardPageContextByHash('));
assert.match(indexSource, /admin\.role\s*!==\s*["']super_admin["']/);
assert.ok(uiSource.includes('aria-labelledby="dashboard-title"'));
assert.ok(uiSource.includes('aria-label="Administration"'));
assert.ok(uiSource.includes('aria-label="Sign out"'));
assert.ok(uiSource.includes('font-variant-numeric:tabular-nums'));
assert.ok(uiSource.includes('overflow-x:auto'));
assert.ok(uiSource.includes('prefers-reduced-motion:reduce'));
assert.ok(uiSource.includes('No recent administrative activity has been recorded.'));

const requiredLabels = [
  'Enterprise Administration', 'Operations overview', 'Recruitment &amp; application workload',
  'Position inventory', 'Open positions', 'Published', 'Draft', 'Application flow',
  'Applications today', 'This week', 'Unread', 'Attention', 'Contact enquiries',
  'Unread notifications', 'Access &amp; session', 'Recent activity', 'Production snapshot'
];
for (const label of requiredLabels) assert.ok(uiSource.includes(label), 'dashboard label missing: ' + label);

for (const securityContract of [
  'securityPage', 'Security &amp; access', 'Change administrator password', 'Account authority',
  'Verified session', 'Credential control', 'Server-authoritative', 'aria-labelledby="security-title"',
  'aria-current="page"', 'Current password', 'New password', 'Confirm new password'
]) {
  assert.ok(dashboardSource.includes(securityContract), 'security workspace contract missing: ' + securityContract);
}
assert.ok(indexSource.includes('import { securityPage } from "./security.ts"'));
assert.ok(indexSource.includes('path === "/security" || path === "/change-password"'));
assert.ok(indexSource.includes('return securityPage(basePath, authState);'));
assert.ok(indexSource.includes('return securityPage(basePath, authState, "Request rejected. Reload the page and try again.", true, 403);'));
assert.ok(indexSource.includes('return securityPage(basePath, authState, "Current password verification or new-password requirements failed.", true, 400);'));
assert.ok(!indexSource.includes('return authPage("Change password"'), 'authenticated password control must not fall back to the unauthenticated split-screen shell');

for (const rejected of [
  'Operations Console','Operational command view','Operational ledger','metric-board','live-badge',
  'linear-gradient','radial-gradient','glassmorphism','backdrop-filter','JOB/PUB','APP/WK','NTF/NEW',
  'class="sidebar"','class="ledger"'
]) assert.ok(!dashboardSource.includes(rejected), 'rejected generic dashboard pattern present: ' + rejected);

for (const phase11 of ['>Create job<','>Edit job<','>Publish job<','>Unpublish<','>Delete job<','>Close position<']) {
  assert.ok(!dashboardSource.includes(phase11), 'Phase 11 control leaked into Phase 10: ' + phase11);
}

for (const metric of ['open_positions','published_positions','draft_positions','applications_today','applications_week','unread_applications','contact_enquiries','unread_notifications']) {
  assert.ok(dashboardSource.includes(metric), 'missing dashboard metric binding: ' + metric);
  assert.ok(migration.includes(metric), 'missing dashboard metric in snapshot RPC: ' + metric);
}

assert.ok(databaseSource.includes('rpc/get_admin_dashboard_snapshot'));
assert.ok(migration.includes('security invoker'));
assert.ok(migration.includes("role = 'super_admin'"));
assert.ok(migration.includes("status = 'active'"));
assert.ok(migration.includes("time zone 'Europe/London'"));
assert.ok(migration.includes('revoke all on function public.get_admin_dashboard_snapshot(uuid) from public, anon, authenticated'));
assert.ok(migration.includes('grant execute on function public.get_admin_dashboard_snapshot(uuid) to service_role'));
assert.ok(!/security\s+definer/i.test(migration));

// Security/session navigation: session validation, active super-admin authority and
// conditional heartbeat are collapsed into one service-role-only RPC.
assert.ok(indexSource.includes('sessionContextByHash('), 'Security navigation must use the session-context fast path');
assert.ok(databaseSource.includes('rpc/get_admin_session_context'));
assert.ok(sessionFastPathMigration.includes('create or replace function public.get_admin_session_context'));
assert.ok(sessionFastPathMigration.includes('join public.admins a on a.id = s.admin_id'));
assert.ok(sessionFastPathMigration.includes("a.status = 'active'"));
assert.ok(sessionFastPathMigration.includes("a.role = 'super_admin'"));
assert.ok(sessionFastPathMigration.includes("interval '5 minutes'"));
assert.ok(sessionFastPathMigration.includes('security invoker'));
assert.ok(sessionFastPathMigration.includes('revoke all on function public.get_admin_session_context(text, timestamptz) from public, anon, authenticated'));
assert.ok(sessionFastPathMigration.includes('grant execute on function public.get_admin_session_context(text, timestamptz) to service_role'));
assert.ok(!/security\s+definer/i.test(sessionFastPathMigration));

// Overview navigation: session context + the canonical production snapshot are
// returned through one Edge-to-database RPC. The snapshot function remains the
// sole source of metric truth rather than duplicating its aggregation logic.
assert.ok(indexSource.includes('dashboardPageContextByHash('), 'Overview must use the dashboard page-context fast path');
assert.ok(databaseSource.includes('rpc/get_admin_dashboard_page_context'));
assert.ok(dashboardFastPathMigration.includes('create or replace function public.get_admin_dashboard_page_context'));
assert.ok(dashboardFastPathMigration.includes('public.get_admin_session_context(p_token_hash, p_idle_cutoff)'));
assert.ok(dashboardFastPathMigration.includes('public.get_admin_dashboard_snapshot(v_admin_id)'));
assert.ok(dashboardFastPathMigration.includes('security invoker'));
assert.ok(dashboardFastPathMigration.includes('revoke all on function public.get_admin_dashboard_page_context(text, timestamptz) from public, anon, authenticated'));
assert.ok(dashboardFastPathMigration.includes('grant execute on function public.get_admin_dashboard_page_context(text, timestamptz) to service_role'));
assert.ok(!/security\s+definer/i.test(dashboardFastPathMigration));
assert.ok(!indexSource.includes('dashboardSnapshot(authState.admin.id)'), 'Overview must not perform a second Edge-to-database snapshot request');
assert.ok(!indexSource.includes('sessionByHash('), 'old session REST lookup must not remain in the request path');
assert.ok(!indexSource.includes('touchSession('), 'heartbeat must not require a separate Edge-to-database request');

console.log('PASS: Phase 10 enterprise operations/security workspaces, private controls, responsive/accessibility hooks, database authority and one-round-trip authenticated Overview/Security navigation verified.');

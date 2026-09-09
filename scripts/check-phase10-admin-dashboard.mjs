import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = {
  index: 'supabase/functions/admin-auth/index.ts',
  ui: 'supabase/functions/admin-auth/ui.ts',
  db: 'supabase/functions/admin-auth/db.ts',
  migration: 'supabase/migrations/20260909052846_phase_10_dashboard_snapshot_query_optimization.sql'
};
for (const relative of Object.values(files)) await access(path.join(root, relative));

const indexSource = await readFile(path.join(root, files.index), 'utf8');
const uiSource = await readFile(path.join(root, files.ui), 'utf8');
const dashboardSource = `${indexSource}\n${uiSource}`;
const databaseSource = await readFile(path.join(root, files.db), 'utf8');
const migration = await readFile(path.join(root, files.migration), 'utf8');

const dashboardContracts = [
  'dashboardSnapshot', 'Operations overview', 'Enterprise Administration',
  'Recruitment &amp; application workload', 'Position inventory', 'Application flow',
  'Contact enquiries', 'Unread notifications', 'Recent activity', 'Access &amp; session',
  'Production snapshot', 'Europe/London', 'This overview is intentionally read-only',
  'prefers-reduced-motion', ':focus-visible', '@media(max-width:760px)', '@media(max-width:520px)',
  'aria-current="page"', 'Skip to main content', 'font-variant-numeric:tabular-nums'
];
for (const contract of dashboardContracts) {
  if (!dashboardSource.includes(contract)) throw new Error('Phase 10 dashboard source missing contract: ' + contract);
}
if (!/admin\.role\s*!==\s*["']super_admin["']/.test(indexSource)) {
  throw new Error('Phase 10 dashboard must enforce super_admin before rendering.');
}

const requiredMetrics = [
  'open_positions','published_positions','draft_positions','applications_today',
  'applications_week','unread_applications','contact_enquiries','unread_notifications'
];
for (const metric of requiredMetrics) {
  if (!dashboardSource.includes(metric) || !migration.includes(metric)) {
    throw new Error('Phase 10 metric contract missing: ' + metric);
  }
}

for (const rejectedPattern of [
  'Operations Console','Operational command view','Operational ledger','live-badge','metric-board',
  'linear-gradient','radial-gradient','glassmorphism','backdrop-filter','JOB/PUB','APP/WK','NTF/NEW',
  'class="sidebar"','class="ledger"'
]) {
  if (dashboardSource.includes(rejectedPattern)) throw new Error('Rejected dashboard pattern reintroduced: ' + rejectedPattern);
}

for (const phase11Action of ['>Create job<','>Edit job<','>Publish job<','>Unpublish<','>Delete job<','>Close position<']) {
  if (dashboardSource.includes(phase11Action)) throw new Error('Phase 11 control leaked into Phase 10: ' + phase11Action);
}

for (const unsafeOrFake of ['@import','fonts.googleapis.com','fake trend','SLA%','placeholder success']) {
  if (dashboardSource.toLowerCase().includes(unsafeOrFake.toLowerCase())) {
    throw new Error('Unapproved UI/runtime dependency or fake signal detected: ' + unsafeOrFake);
  }
}

if (!databaseSource.includes('rpc/get_admin_dashboard_snapshot')) throw new Error('Dashboard must use the server snapshot RPC.');

const migrationContracts = [
  'create or replace function public.get_admin_dashboard_snapshot','security invoker',
  "status = 'active'", "role = 'super_admin'", "Europe/London", 'limit 8',
  'from public, anon, authenticated', 'to service_role'
];
for (const contract of migrationContracts) {
  if (!migration.includes(contract)) throw new Error('Phase 10 migration missing contract: ' + contract);
}
if (/security\s+definer/i.test(migration)) throw new Error('Dashboard snapshot must never be SECURITY DEFINER.');
if (/grant\s+execute[\s\S]*to\s+(?:anon|authenticated)/i.test(migration)) throw new Error('Browser roles must not execute dashboard snapshot.');

console.log('PASS: Phase 10 enterprise operations workspace, responsive/accessibility boundaries, read-only scope and snapshot authority verified.');

import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'supabase/functions/admin-auth/index.ts',
  'supabase/functions/admin-auth/db.ts',
  'supabase/functions/admin-auth/crypto.js',
  'supabase/migrations/20260909043216_phase_9_admin_auth_security.sql',
  'tests/admin-auth-security.mjs',
  'docs/PHASE_9_VERIFICATION.md'
];

for (const relative of required) await access(path.join(root, relative));

const functionDirectory = path.join(root, 'supabase/functions/admin-auth');
const functionFiles = (await readdir(functionDirectory)).filter((name) => /\.(?:js|ts)$/.test(name));
const functionSource = (
  await Promise.all(functionFiles.map((name) => readFile(path.join(functionDirectory, name), 'utf8')))
).join('\n');
const migration = await readFile(
  path.join(root, 'supabase/migrations/20260909043216_phase_9_admin_auth_security.sql'),
  'utf8'
);
const config = await readFile(path.join(root, 'supabase/config.toml'), 'utf8');

const functionContracts = [
  'const SESSION_TTL = 8 * 60 * 60',
  'const IDLE_TTL = 30 * 60',
  'ADMIN_BOOTSTRAP_PASSWORD_VERIFIER',
  'HttpOnly; Secure; SameSite=Strict',
  'x-robots-tag',
  'cache-control',
  'content-security-policy',
  'strict-transport-security',
  'admin_login_failed',
  'admin_password_reset_requested',
  'admin_password_changed',
  'csrf_token_hash',
  'create_admin_session',
  'consume_admin_password_reset_token'
];
for (const contract of functionContracts) {
  if (!functionSource.includes(contract)) throw new Error('Admin auth source missing Phase 9 contract: ' + contract);
}

const migrationContracts = [
  'admins_single_active_super_admin_uidx',
  'admins_password_hash_shape_check',
  'sessions_csrf_token_hash_check',
  'password_reset_tokens_token_hash_check',
  'verify_admin_password',
  'set_admin_password',
  'create_admin_session',
  'change_admin_password',
  'create_admin_password_reset_token',
  'consume_admin_password_reset_token',
  'sessions_one_active_per_admin_uidx',
  "extensions.gen_salt('bf', 12)",
  'force row level security',
  'for all to anon, authenticated using (false) with check (false)',
  'revoke execute on function',
  'grant execute on function',
  'audit_logs_login_failed_ip_idx',
  'audit_logs_reset_requested_ip_idx'
];
for (const contract of migrationContracts) {
  if (!migration.includes(contract)) throw new Error('Phase 9 migration missing contract: ' + contract);
}

for (const forbidden of ['BOOTSTRAP_SALT', 'BOOTSTRAP_DERIVED', 'pg_net']) {
  if (functionSource.includes(forbidden) || migration.includes(forbidden)) {
    throw new Error('Phase 9 secret-material or unsafe-runtime violation: ' + forbidden);
  }
}

if (migration.includes('get_admin_dashboard_snapshot')) {
  throw new Error('Phase 9 migration history must remain isolated from Phase 10 dashboard schema.');
}

if (!config.includes('[functions.admin-auth]') || !config.includes('verify_jwt = false')) {
  throw new Error('Supabase config must declare browser-facing custom admin authentication explicitly.');
}

console.log('PASS: Phase 9 auth architecture, database controls, runtime-secret bootstrap and browser-role isolation remain preserved in the current admin implementation.');

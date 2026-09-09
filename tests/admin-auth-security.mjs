import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  randomToken,
  shaHex,
  verifyBootstrapPassword
} from '../supabase/functions/admin-auth/crypto.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = await readFile(path.join(root, 'supabase/functions/admin-auth/index.ts'), 'utf8');
const databaseSource = await readFile(path.join(root, 'supabase/functions/admin-auth/db.ts'), 'utf8');
const migration = await readFile(
  path.join(root, 'supabase/migrations/20260909043216_phase_9_admin_auth_security.sql'),
  'utf8'
);

function base64Url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

const testPassword = 'Phase9-Test-Only!47';
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(testPassword),
  'PBKDF2',
  false,
  ['deriveBits']
);
const derived = new Uint8Array(await crypto.subtle.deriveBits(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600_000 },
  key,
  256
));
const verifier = ['pbkdf2-sha256', '600000', base64Url(salt), base64Url(derived)].join(':');

assert.equal(await verifyBootstrapPassword(testPassword, verifier), true);
assert.equal(await verifyBootstrapPassword('wrong-password', verifier), false);
assert.equal(await verifyBootstrapPassword(testPassword, 'malformed'), false);

const firstToken = randomToken();
const secondToken = randomToken();
assert.match(firstToken, /^[A-Za-z0-9_-]{43}$/);
assert.notEqual(firstToken, secondToken);
assert.match(await shaHex(firstToken), /^[0-9a-f]{64}$/);

for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Priority=High']) {
  assert.ok(indexSource.includes(attribute), 'session cookies must include ' + attribute);
}
assert.ok(indexSource.includes('SESSION_TTL = 8 * 60 * 60'));
assert.ok(indexSource.includes('IDLE_TTL = 30 * 60'));
assert.ok(indexSource.includes('failedCount(clientHash)>=5'));
assert.ok(indexSource.includes('retry-after'));
assert.ok(indexSource.includes('originOk(req,url)'));
assert.ok(indexSource.includes('shaHex(submitted)===s.csrf_token_hash'));
assert.ok(indexSource.includes('Invalid email or password.'));
assert.ok(indexSource.includes('If the account is eligible'));
assert.ok(indexSource.includes('ADMIN_BOOTSTRAP_PASSWORD_VERIFIER'));
assert.ok(!indexSource.includes('BOOTSTRAP_SALT'));
assert.ok(!indexSource.includes('BOOTSTRAP_DERIVED'));

assert.ok(databaseSource.includes('const API_KEY = MODERN_SECRET_KEY || LEGACY_SERVICE_ROLE_KEY'));
assert.ok(databaseSource.includes('if (USING_LEGACY_KEY)'));
assert.ok(databaseSource.includes('rpc/create_admin_session'));
assert.ok(databaseSource.includes('rpc/change_admin_password'));
assert.ok(databaseSource.includes('rpc/consume_admin_password_reset_token'));
assert.ok(!databaseSource.includes('get_admin_dashboard_snapshot'));

assert.ok(migration.includes("lower(email) = 'rcitcservices@gmail.com'"));
assert.ok(migration.includes("where role = 'super_admin' and status = 'active'"));
assert.ok(migration.includes("extensions.digest(p_password, 'sha256')"));
assert.ok(migration.includes("extensions.gen_salt('bf', 12)"));
assert.ok(migration.includes('sessions_one_active_per_admin_uidx'));
assert.ok(migration.includes('create or replace function public.create_admin_session'));
assert.ok(migration.includes('create or replace function public.change_admin_password'));
assert.ok(migration.includes('create or replace function public.consume_admin_password_reset_token'));
assert.ok(migration.includes('for update'));
assert.ok(migration.includes('from public, anon, authenticated'));
assert.ok(migration.includes('to service_role'));
assert.ok(!migration.includes('get_admin_dashboard_snapshot'));

console.log('PASS: Phase 9 cryptography helpers, secure-cookie/session controls, throttling, CSRF, generic recovery responses, secret-key handling and phase isolation verified.');

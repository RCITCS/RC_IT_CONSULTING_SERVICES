import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const edge = await readFile(path.join(root, 'cloudflare/admin-production/index.js'), 'utf8');
const adminAuth = await readFile(path.join(root, 'supabase/functions/admin-auth/index.ts'), 'utf8');

assert.match(edge, /rcitcs_admin_recovery=/);
assert.match(edge, /rcitcs_admin_recovery_csrf=/);
assert.match(edge, /SameSite=Lax/);
assert.match(edge, /Max-Age=1800/);
assert.match(edge, /adminWorker\.fetch\(request, env, ctx\)/);
assert.match(adminAuth, /rcitcs_admin_session=.*SameSite=Strict/);
assert.match(adminAuth, /rcitcs_admin_csrf=.*SameSite=Strict/);
assert.ok(!edge.includes('rcitcs_admin_session='));
assert.ok(!edge.includes('rcitcs_admin_csrf='));

console.log('PASS: email-originated password recovery uses a scoped Lax edge handoff while normal admin session cookies remain Strict.');

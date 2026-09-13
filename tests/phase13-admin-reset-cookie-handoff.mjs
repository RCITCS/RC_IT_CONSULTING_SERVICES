import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const edgeSource = await readFile(path.join(root, 'cloudflare/admin-production/index.js'), 'utf8');
const adminAuthSource = await readFile(path.join(root, 'supabase/functions/admin-auth/index.ts'), 'utf8');

assert.match(edgeSource, /rcitcs_admin_recovery=/);
assert.match(edgeSource, /rcitcs_admin_recovery_csrf=/);
assert.match(edgeSource, /SameSite=Strict[\s\S]*SameSite=Lax|replace\(\/SameSite=Strict\/gi, 'SameSite=Lax'\)/);
assert.match(edgeSource, /Max-Age=600/);
assert.match(edgeSource, /Max-Age=1800/);
assert.match(edgeSource, /adminWorker\.fetch\(request, env, ctx\)/);

// Normal authenticated administrator session cookies must remain Strict.
assert.match(adminAuthSource, /rcitcs_admin_session=.*SameSite=Strict/);
assert.match(adminAuthSource, /rcitcs_admin_csrf=.*SameSite=Strict/);

// The edge exception is deliberately scoped only to recovery cookies so that
// email-originated top-level navigation can complete its 303 handoff.
assert.ok(!edgeSource.includes("rcitcs_admin_session=${"));
assert.ok(!edgeSource.includes("rcitcs_admin_csrf=${"));

console.log('PASS: Phase 13 password-reset recovery cookies use a scoped Lax handoff while normal admin sessions remain Strict.');

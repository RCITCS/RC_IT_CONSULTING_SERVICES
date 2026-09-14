import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const edgeSource = await readFile(path.join(root, 'cloudflare/admin-production/index.js'), 'utf8');
const adminAuthSource = await readFile(path.join(root, 'supabase/functions/admin-auth/index.ts'), 'utf8');

// Authoritative recovery cookie policy belongs in admin-auth so the flow does
// not depend on a Cloudflare deployment race.
assert.match(adminAuthSource, /RECOVERY_TTL = 30 \* 60/);
assert.match(adminAuthSource, /rcitcs_admin_recovery=.*SameSite=Lax/);
assert.match(adminAuthSource, /rcitcs_admin_recovery_csrf=.*SameSite=Lax/);

// Normal authenticated administrator session cookies must remain Strict.
assert.match(adminAuthSource, /rcitcs_admin_session=.*SameSite=Strict/);
assert.match(adminAuthSource, /rcitcs_admin_csrf=.*SameSite=Strict/);

// Keep the production-edge compatibility shim narrowly scoped as defense in
// depth for deployments where an older admin-auth response is still observed.
assert.match(edgeSource, /rcitcs_admin_recovery=/);
assert.match(edgeSource, /rcitcs_admin_recovery_csrf=/);
assert.match(edgeSource, /SameSite=Lax/);
assert.match(edgeSource, /Max-Age=1800/);
assert.match(edgeSource, /adminWorker\.fetch\(request, env, ctx\)/);
assert.ok(!edgeSource.includes('rcitcs_admin_session='));
assert.ok(!edgeSource.includes('rcitcs_admin_csrf='));

console.log('PASS: Phase 13 recovery cookies are Lax/30-minute at auth authority while normal admin sessions remain Strict.');

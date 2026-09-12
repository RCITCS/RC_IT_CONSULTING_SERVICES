import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migration = await readFile(
  path.join(root, 'supabase/migrations/20260912235400_phase_12_admin_session_identity_contract.sql'),
  'utf8'
);

assert.match(
  migration,
  /'admin'\s*,\s*jsonb_build_object\([\s\S]*?'id'\s*,\s*v_admin_id[\s\S]*?'email'\s*,\s*v_email[\s\S]*?'role'\s*,\s*v_role/i,
  'Authenticated admin session context must expose the immutable admin id inside admin.id for Jobs and Applications.'
);
assert.match(
  migration,
  /'admin_id'\s*,\s*v_admin_id/i,
  'Existing top-level admin_id must remain available for backward compatibility.'
);
assert.match(
  migration,
  /revoke all on function public\.get_admin_session_context\(text, timestamptz\) from public, anon, authenticated/i,
  'Browser roles must remain unable to invoke the private session RPC.'
);
assert.match(
  migration,
  /grant execute on function public\.get_admin_session_context\(text, timestamptz\) to service_role/i,
  'Only the service role should retain execution authority for the private session RPC.'
);
assert.match(
  migration,
  /notify pgrst, 'reload schema'/i,
  'Session-contract changes must refresh PostgREST schema state.'
);

console.log('PASS: Phase 12 authenticated admin session identity is consistent for Overview, Jobs and Applications.');

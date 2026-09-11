import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const [migration, applications, index] = await Promise.all([
  read('supabase/migrations/20260910205000_phase_12_admin_application_workspace.sql'),
  read('supabase/functions/admin-auth/applications.ts'),
  read('supabase/functions/admin-auth/index.ts')
]);

for (const contract of [
  'get_admin_application_management_context',
  'get_admin_application_document',
  "a.status = 'active'",
  "a.role = 'super_admin'",
  "grant execute on function public.get_admin_application_management_context(uuid,uuid,uuid) to service_role",
  "grant execute on function public.get_admin_application_document(uuid,uuid,uuid) to service_role"
]) assert.ok(migration.includes(contract), `Admin application persistence contract missing: ${contract}`);

assert.ok(migration.includes("revoke all on function public.get_admin_application_management_context(uuid,uuid,uuid) from public, anon, authenticated"));
assert.ok(migration.includes("revoke all on function public.get_admin_application_document(uuid,uuid,uuid) from public, anon, authenticated"));
assert.ok(!/security\s+definer/i.test(migration), 'Admin application RPCs must preserve service-role/RLS authority with SECURITY INVOKER.');
assert.ok(migration.includes("'document_count'"));
assert.ok(migration.includes("'documents'"));
assert.ok(migration.includes("'history'"));
assert.ok(!migration.includes("'object_path', d.object_path"), 'Application detail context rendered to the admin browser must not expose storage object paths.');
assert.ok(migration.includes("'object_path', v_document.object_path"), 'Exact document RPC must retain server-only storage metadata for authenticated streaming.');

for (const contract of [
  'handleApplicationRoute',
  'get_admin_application_management_context',
  'get_admin_application_document',
  'candidate_document_downloaded',
  'Download securely',
  'Candidate communication and status workflows are not enabled in this phase.',
  'cache-control',
  'no-store',
  'content-disposition',
  'x-content-type-options',
  'cross-origin-resource-policy',
  'application_document'
]) assert.ok(applications.includes(contract), `Admin application route missing: ${contract}`);

assert.ok(applications.includes('authState.admin.role !== "super_admin"'));
assert.ok(applications.includes('request.method !== "GET"'), 'Phase 12 admin application surface must remain read-only.');
assert.ok(applications.includes('OBJECT_PATH.exec(objectPath)'));
assert.ok(applications.includes('pathMatch[1].toLowerCase() !== applicationId.toLowerCase()'));
assert.ok(applications.includes('pathMatch[2].toLowerCase() !== documentId.toLowerCase()'));
assert.ok(applications.includes('upstream.body'), 'Private document retrieval must stream the storage response instead of buffering a possible 20 MB file.');
assert.ok(!applications.includes('/object/public/'));
assert.ok(!applications.includes('createSignedDownloadUrl'), 'Admin HTML must not rely on browser-visible signed storage URLs.');

assert.ok(index.includes('import { handleApplicationRoute } from "./applications.ts"'));
assert.ok(index.includes('const applicationResponse = await handleApplicationRoute'));
assert.ok(index.includes('applications: true'));
assert.ok(index.includes('phase12-candidate-application-workflow'));

for (const source of [migration, applications, index]) {
  assert.ok(!/sb_secret_[A-Za-z0-9_-]{20,}/.test(source), 'A real server secret must never be committed.');
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+["']/.test(source), 'Server credentials must remain runtime-only.');
}

console.log('PASS: Phase 12 admin Applications is read-only, super-admin-authorized, job-linked, noindex/no-cache, and streams exact private candidate documents through the authenticated server boundary with audit evidence.');

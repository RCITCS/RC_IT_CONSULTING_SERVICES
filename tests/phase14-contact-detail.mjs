import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contacts = await readFile(path.join(root, 'supabase/functions/admin-auth/contacts.ts'), 'utf8');
const migration = await readFile(path.join(root, 'supabase/migrations/20260914030000_phase_14_contact_admin_api.sql'), 'utf8');

// Exact private detail authority must be the already-verified Phase-14.3 RPC.
assert.match(contacts, /rpc\("get_admin_contact_detail"/);
assert.match(contacts, /p_admin_id: adminId/);
assert.match(contacts, /p_enquiry_id: enquiryId/);
assert.match(migration, /create or replace function public\.get_admin_contact_detail/);

// Detail routing is exact and UUID-bounded; arbitrary suffixes must fall through.
assert.match(contacts, /path\.match\(\/\^\\\/contacts\\\//);
assert.match(contacts, /\[0-9a-f\]\{8\}/i);
assert.match(contacts, /path !== "\/contacts" && !detailMatch/);
assert.match(contacts, /const enquiryId = detailMatch\[1\]\.toLowerCase\(\)/);

// Detail is view-only in 14.5. Opening a record must not mutate read/workflow/archive/note state.
assert.match(contacts, /request\.method !== "GET"/);
assert.match(contacts, /Opening this page does not change read state or workflow status/);
for (const mutation of [
  'admin_set_contact_read_state',
  'admin_transition_contact_enquiry',
  'admin_set_contact_archive_state',
  'admin_add_contact_enquiry_note'
]) assert.equal(contacts.includes(mutation), false, `14.5 leaked mutation authority: ${mutation}`);
assert.doesNotMatch(contacts, /reply composer|send reply/i);

// Original accepted intake is presented only after authorization and escaped before HTML output.
for (const field of ['name', 'email', 'phone', 'company', 'service', 'subject', 'message', 'consent', 'consent_at', 'source']) {
  assert.match(migration, new RegExp(`'${field}'`), `Detail RPC does not project immutable field ${field}`);
}
assert.match(contacts, /fact\("Phone", enquiry\.phone/);
assert.match(contacts, /const message = String\(enquiry\.message/);
assert.match(contacts, /esc\(message \|\| "No message content was stored\."\)/);
assert.match(contacts, /white-space:pre-wrap/);
assert.match(contacts, /Original enquiry/);
assert.match(contacts, /Accepted customer-submitted evidence is immutable after intake/);

// Operational context is visible without prematurely rendering timeline/note/reply bodies.
for (const count of ['history_count', 'note_count', 'message_count']) assert.match(contacts, new RegExp(`context\\.${count}`));
for (const field of ['first_read_at', 'read_at', 'resolved_at', 'closed_at', 'archived_at', 'last_activity_at', 'updated_at', 'version']) {
  assert.match(contacts, new RegExp(`enquiry\\.${field}`), `Operational context missing ${field}`);
}
assert.doesNotMatch(contacts, /context\.history\s*\.map|context\.notes\s*\.map|context\.messages\s*\.map/);
assert.match(contacts, /metadata\.intent/);
assert.match(contacts, /metadata\.job_title/);
assert.match(contacts, /metadata\.submission_type/);
assert.doesNotMatch(contacts, /metadata\.request_id/);

// Explicit failure states must remain truthful.
assert.match(contacts, /context\.code === "NOT_FOUND"/);
assert.match(contacts, /"Enquiry not found"/);
assert.match(contacts, /context\.code === "FORBIDDEN"/);
assert.match(contacts, /"Contact record unavailable"/);
assert.match(contacts, /, 404\)/);
assert.match(contacts, /, 403\)/);
assert.match(contacts, /, 503\)/);

// Inbox and detail share the approved admin shell and provide a clear return path.
assert.match(contacts, /adminHeader\(basePath, session, "contacts"\)/);
assert.match(contacts, /href="\$\{basePath\}\/contacts">Back to contact inbox/);
assert.match(contacts, /detailHref = UUID\.test\(id\)/);
assert.match(contacts, /Immutable intake · operational context/);

console.log('Phase 14.5 enquiry detail workspace, immutable-intake rendering, explicit errors, privacy boundaries and no-auto-mutation contract passed.');

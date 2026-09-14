import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contacts = await readFile(path.join(root, 'supabase/functions/admin-auth/contacts.ts'), 'utf8');
const migration = await readFile(path.join(root, 'supabase/migrations/20260914030000_phase_14_contact_admin_api.sql'), 'utf8');

// 14.6 may request operations but must never replace PostgreSQL workflow authority.
for (const rpc of ['admin_set_contact_read_state', 'admin_transition_contact_enquiry', 'admin_set_contact_archive_state']) {
  assert.match(contacts, new RegExp(`rpc\\("${rpc}"`), `UI adapter does not call ${rpc}`);
  assert.match(migration, new RegExp(`create or replace function public\\.${rpc}`), `Database authority missing ${rpc}`);
}

// Exact POST-only mutation routes and CSRF/version checks.
assert.match(contacts, /read-state\|workflow\|archive-state/);
assert.match(contacts, /Contact mutations require a protected POST request/);
assert.match(contacts, /if \(request\.method !== "POST" \|\| !mutationMatch\)/);
assert.match(contacts, /await csrfOk\(authState, String\(form\.get\("csrf"\)/);
assert.match(contacts, /await shaHex\(submitted\) === state\.csrf_token_hash/);
assert.match(contacts, /expectedVersion\(form\)/);
assert.match(contacts, /p_expected_version: version/);
assert.match(contacts, /p_ip_hash: await requestIpHash\(request\)/);
assert.match(contacts, /p_user_agent:/);

// Read/unread is explicit and separate from workflow.
assert.match(contacts, /name="read" value="\$\{enquiry\.read_at \? "0" : "1"\}"/);
assert.match(contacts, /Mark unread/);
assert.match(contacts, /Mark read/);
assert.match(contacts, /p_read: read/);
assert.match(migration, /set first_read_at = coalesce\(first_read_at, now\(\)\), read_at = now\(\)/);
assert.match(migration, /set read_at = null/);
assert.match(migration, /v_event := 'read'/);
assert.match(migration, /v_event := 'marked_unread'/);

// Browser-visible target choices mirror the database legal-transition graph, while DB remains authoritative.
const transitionGraph = {
  new: ['open', 'in_progress', 'resolved', 'spam'],
  open: ['in_progress', 'resolved', 'closed', 'spam'],
  in_progress: ['open', 'resolved', 'closed', 'spam'],
  resolved: ['open', 'closed'],
  closed: ['open'],
  spam: ['open']
};
for (const [from, targets] of Object.entries(transitionGraph)) {
  const escaped = from === 'in_progress' ? 'in_progress' : from;
  assert.match(contacts, new RegExp(`${escaped}: \\[${targets.map((v) => `"${v}"`).join(', ')}\\]`), `UI transition graph drifted for ${from}`);
  for (const target of targets) assert.ok(migration.includes(`'${target}'`), `Migration no longer contains target ${target}`);
}
assert.match(contacts, /p_target_status: target/);
assert.match(migration, /INVALID_TRANSITION/);
assert.match(contacts, /invalid_transition/);

// Archive is independent, terminal-only, and restore is explicit.
assert.match(contacts, /\["resolved", "closed", "spam"\]\.includes\(status\)/);
assert.match(contacts, /name="archive" value="1"/);
assert.match(contacts, /name="archive" value="0"/);
assert.match(contacts, /Restore enquiry/);
assert.match(contacts, /Archive enquiry/);
assert.match(contacts, /p_archive: archive/);
assert.match(migration, /v_row\.status not in \('resolved','closed','spam'\)/);
assert.match(migration, /INVALID_ARCHIVE_STATE/);

// Archived state cannot silently expose normal mutation controls.
assert.match(contacts, /if \(enquiry\.archived_at\)/);
assert.match(contacts, /Restore it before changing read state or workflow status/);
assert.match(migration, /Restore the enquiry before changing its read state/);

// Optimistic concurrency and explicit error recovery are user-visible.
for (const code of ['STALE_VERSION', 'ARCHIVED', 'INVALID_TRANSITION', 'INVALID_ARCHIVE_STATE', 'VALIDATION', 'NOT_FOUND']) {
  assert.match(contacts, new RegExp(code));
}
assert.match(contacts, /This enquiry changed after the page was loaded/);
assert.match(contacts, /\?error=\$\{mutationErrorCode\(result\?\.code\)\}/);
assert.match(contacts, /status: 303/);

// Success is only acknowledged after authoritative RPC success.
assert.match(contacts, /if \(!result \|\| result\.ok !== true\)/);
assert.match(contacts, /\?notice=\$\{notice\}/);
assert.match(contacts, /Enquiry marked as read/);
assert.match(contacts, /Workflow status updated/);
assert.match(contacts, /Enquiry archived/);

// Audit/history must remain database-side; no direct browser or REST table writes from contacts.ts.
assert.doesNotMatch(contacts, /\/rest\/v1\/audit_logs/);
assert.doesNotMatch(contacts, /\/rest\/v1\/contact_enquiry_history/);
assert.match(migration, /insert into public\.contact_enquiry_history/);
assert.match(migration, /insert into public\.audit_logs/);

// Later subphases are still excluded.
assert.equal(contacts.includes('admin_add_contact_enquiry_note'), false);
assert.doesNotMatch(contacts, /reply composer|send reply/i);

console.log('Phase 14.6 read/unread, legal workflow transitions, archive/restore, CSRF, optimistic concurrency, audit and explicit recovery contract passed.');

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationPath = path.join(root, 'supabase/migrations/20260914023500_phase_14_contact_admin_data_model.sql');
const migration = await readFile(migrationPath, 'utf8');

// Forward-only migration safety: historical/legacy columns are preserved.
assert.doesNotMatch(migration, /drop\s+table\s+public\.contact_enquiries/i);
assert.doesNotMatch(migration, /drop\s+column/i);
assert.match(migration, /source_type/i);
assert.match(migration, /assigned_admin_id/i);
assert.match(migration, /privacy_consent_at/i);
assert.match(migration, /received_at/i);
assert.match(migration, /details/i);
assert.match(migration, /set\s+status\s*=\s*'open'\s+where\s+status\s*=\s*'read'/i);

// Preserve the live workflow vocabulary and keep read/unread separate from status.
for (const status of ['new', 'open', 'in_progress', 'resolved', 'closed', 'spam']) {
  assert.ok(migration.includes(`'${status}'`), `Phase 14 must preserve status ${status}.`);
}
assert.match(migration, /add column if not exists read_at timestamptz/i);
assert.match(migration, /add column if not exists first_read_at timestamptz/i);
assert.match(migration, /add column if not exists resolved_at timestamptz/i);
assert.match(migration, /add column if not exists closed_at timestamptz/i);
assert.match(migration, /add column if not exists archived_at timestamptz/i);
assert.match(migration, /add column if not exists last_activity_at timestamptz/i);
assert.match(migration, /add column if not exists version integer not null default 1/i);
assert.match(migration, /contact_enquiries_archive_terminal_check/i);
assert.match(migration, /archived_at is null or status in \('resolved','closed','spam'\)/i);

// Inbox query support is deliberate and keyset-friendly.
assert.match(migration, /contact_enquiries_active_activity_idx[\s\S]*last_activity_at desc, id desc/i);
assert.match(migration, /contact_enquiries_status_activity_idx[\s\S]*status, last_activity_at desc, id desc/i);
assert.match(migration, /contact_enquiries_unread_activity_idx[\s\S]*read_at is null/i);

// Accepted public intake is immutable after persistence; only operational state changes.
assert.match(migration, /function public\.guard_contact_enquiry_update\(\)/i);
for (const field of ['name', 'email', 'phone', 'company', 'service', 'subject', 'message', 'consent', 'consent_at', 'source', 'metadata', 'created_at']) {
  assert.match(migration, new RegExp(`new\\.${field} is distinct from old\\.${field}`, 'i'), `Immutable intake field not guarded: ${field}`);
}
assert.match(migration, /new\.version\s*:=\s*old\.version\s*\+\s*1/i);

// Workflow history is append-oriented and keeps status transitions auditable.
assert.match(migration, /create table if not exists public\.contact_enquiry_history/i);
assert.match(migration, /event_type text not null check/i);
assert.match(migration, /from_status text check/i);
assert.match(migration, /to_status text check/i);
assert.match(migration, /actor_admin_id uuid references public\.admins/i);
assert.match(migration, /contact_enquiry_history_enquiry_created_idx/i);

// Internal notes are a dedicated domain and have no mail trigger/provider coupling.
assert.match(migration, /create table if not exists public\.contact_enquiry_notes/i);
assert.match(migration, /body text not null check \(char_length\(btrim\(body\)\) between 1 and 10000\)/i);
const notesBlock = migration.match(/create table if not exists public\.contact_enquiry_notes[\s\S]*?\);/i)?.[0] ?? '';
assert.ok(notesBlock.length > 0);
assert.doesNotMatch(notesBlock, /recipient|sender|email_log|provider|template/i);

// Persisted outbound replies do not duplicate provider delivery state.
assert.match(migration, /create table if not exists public\.contact_enquiry_messages/i);
const messagesBlock = migration.match(/create table if not exists public\.contact_enquiry_messages[\s\S]*?\);/i)?.[0] ?? '';
assert.ok(messagesBlock.length > 0);
assert.match(messagesBlock, /direction text not null default 'outbound'/i);
assert.match(messagesBlock, /sender_email text not null default 'contact@rcitcs\.com'/i);
assert.match(messagesBlock, /reply_to_email text not null default 'contact@rcitcs\.com'/i);
assert.match(messagesBlock, /idempotency_key text not null unique/i);
assert.match(messagesBlock, /email_log_id uuid unique references public\.email_logs\(id\) on delete set null/i);
assert.doesNotMatch(messagesBlock, /\bstatus\s+text\b/i);
assert.doesNotMatch(messagesBlock, /provider_message_id/i);
assert.doesNotMatch(messagesBlock, /error_code|error_message/i);

// CR/LF header injection and empty content are constrained at the database edge.
assert.match(messagesBlock, /recipient_email !~ E'\[\\\\r\\\\n\]'/i);
assert.match(messagesBlock, /subject !~ E'\[\\\\r\\\\n\]'/i);
assert.match(messagesBlock, /char_length\(btrim\(body_text\)\) between 1 and 10000/i);

// Note/reply activity updates the parent through the versioned operational boundary.
assert.match(migration, /function public\.touch_contact_enquiry_activity\(\)/i);
assert.match(migration, /contact_enquiry_notes_touch_activity/i);
assert.match(migration, /contact_enquiry_messages_touch_activity/i);
assert.match(migration, /set last_activity_at = greatest\(last_activity_at, new\.created_at\)/i);

// New Phase-14 domains are private, forced-RLS tables. Browser roles get no access.
for (const table of ['contact_enquiry_history', 'contact_enquiry_notes', 'contact_enquiry_messages']) {
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
  assert.match(migration, new RegExp(`create policy deny_browser_access on public\\.${table}`, 'i'));
}
assert.match(migration, /revoke all on table public\.contact_enquiry_history, public\.contact_enquiry_notes, public\.contact_enquiry_messages[\s\S]*from public, anon, authenticated/i);
assert.match(migration, /grant select, insert on table public\.contact_enquiry_history, public\.contact_enquiry_notes, public\.contact_enquiry_messages[\s\S]*to service_role/i);

// Existing private contact boundary is explicitly reasserted; Phase-13 email trigger is not replaced.
assert.match(migration, /revoke all on table public\.contact_enquiries from anon, authenticated/i);
assert.doesNotMatch(migration, /drop trigger[^;]*contact_enquiry_email/i);
assert.doesNotMatch(migration, /RESEND_API_KEY|api\.resend\.com|http_post/i);

console.log('Phase 14.2 contact data-model convergence, immutability, history, notes, replies, RLS and query-index checks passed.');

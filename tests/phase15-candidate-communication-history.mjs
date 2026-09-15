import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const applicationsPath = path.join(root, 'supabase/functions/admin-auth/applications.ts');
const viewPath = path.join(root, 'supabase/functions/admin-auth/candidate-communication.ts');
const migrationPath = path.join(root, 'supabase/migrations/20260915030000_phase_15_candidate_communication_core.sql');
const applications = await readFile(applicationsPath, 'utf8');
const view = await readFile(viewPath, 'utf8');
const migration = await readFile(migrationPath, 'utf8');

// Application detail reads candidate communication only through the service-role RPC.
assert.match(applications, /get_admin_candidate_communication_context/);
assert.match(applications, /p_limit: 100/);
assert.match(applications, /Promise\.all/);
assert.match(applications, /renderCandidateCommunicationHistory\(messages\)/);
assert.match(applications, /Candidate communication/);
assert.match(applications, /raw provider errors are not exposed here/i);
assert.doesNotMatch(applications, /error_message|error_code|provider_message_id/);
assert.doesNotMatch(applications, /SUPABASE_SECRET_KEYS[^\n]*value=|RESEND_API_KEY/);

// The migration enforces bounded history and only returns safe delivery fields.
assert.match(migration, /least\(greatest\(coalesce\(p_limit, 100\), 1\), 100\)/);
assert.match(migration, /'subject', m\.subject/);
assert.match(migration, /'body_text', m\.body_text/);
assert.match(migration, /'sender_email', m\.sender_email/);
assert.match(migration, /'recipient_email', m\.recipient_email/);
assert.match(migration, /'delivery_status', coalesce\(e\.status, m\.status\)/);
assert.match(migration, /'attempt_count', coalesce\(e\.attempt_count, 0\)/);
assert.doesNotMatch(migration, /'error_message'|'error_code'/);

// Renderer is bounded and every message-controlled field is escaped before interpolation.
assert.match(view, /messages\.slice\(0, 100\)/);
assert.match(view, /const subject = String\(message\?\.subject/);
assert.match(view, /const body = String\(message\?\.body_text/);
assert.match(view, /const sender = String\(message\?\.sender_email/);
assert.match(view, /const recipient = String\(message\?\.recipient_email/);
assert.match(view, /esc\(subject\)/);
assert.match(view, /esc\(sender \|\| "—"\)/);
assert.match(view, /esc\(recipient \|\| "—"\)/);
assert.match(view, /esc\(body\)/);
assert.match(view, /SAFE_DELIVERY_STATES/);
assert.match(view, /Math\.min\(messages\.length, 100\)/);
assert.match(view, /No candidate communication has been recorded/);

// Reject dangerous DOM APIs and the exact raw HTML interpolation shapes that would bypass esc().
// Do not reject message values merely because they appear inside an escaping expression such as
// esc(`${direction} candidate email: ${subject}`), which is safe and used for accessible labels.
assert.doesNotMatch(view, /innerHTML\s*=|insertAdjacentHTML\s*\(/);
assert.doesNotMatch(view, /<h3[^>]*>\$\{subject\}<\/h3>/);
assert.doesNotMatch(view, /<strong[^>]*>\$\{sender(?:\s*\|\|[^}]*)?\}<\/strong>/);
assert.doesNotMatch(view, /<strong[^>]*>\$\{recipient(?:\s*\|\|[^}]*)?\}<\/strong>/);
assert.doesNotMatch(view, /white-space:pre-wrap[^>]*>\$\{body\}<\/div>/);

console.log('Phase 15.2 bounded authenticated communication history, safe delivery state and output escaping source contract passed.');
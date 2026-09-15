import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

// Rendering is bounded and every candidate-controlled/message-controlled field is escaped.
assert.match(view, /messages\.slice\(0, 100\)/);
assert.match(view, /esc\(subject\)/);
assert.match(view, /esc\(sender \|\| "—"\)/);
assert.match(view, /esc\(recipient \|\| "—"\)/);
assert.match(view, /esc\(body\)/);
assert.match(view, /SAFE_DELIVERY_STATES/);

const { renderCandidateCommunicationHistory, candidateCommunicationCount } = await import(`${pathToFileURL(viewPath).href}?phase15history=${Date.now()}`);
const html = renderCandidateCommunicationHistory([{
  id: '11111111-1111-4111-8111-111111111111',
  direction: 'outbound',
  subject: '<script>alert(1)</script>',
  body_text: 'Hello <candidate> & team',
  sender_email: 'careers@rcitcs.com',
  recipient_email: 'candidate@example.com',
  delivery_status: 'sent',
  attempt_count: 1,
  created_at: '2026-09-15T03:00:00.000Z',
  sent_at: '2026-09-15T03:00:05.000Z'
}]);
assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
assert.match(html, /Hello &lt;candidate&gt; &amp; team/);
assert.doesNotMatch(html, /Hello <candidate>/);
assert.match(html, /careers@rcitcs\.com/);
assert.match(html, /candidate@example\.com/);
assert.equal(candidateCommunicationCount(new Array(120).fill({})), 100);
assert.match(renderCandidateCommunicationHistory([]), /No candidate communication has been recorded/);

console.log('Phase 15.2 bounded authenticated communication history, safe delivery state and output escaping passed.');

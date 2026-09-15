import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const [phase13ApplicationQueue, convergence, phase15Core] = await Promise.all([
  read('supabase/migrations/20260913212500_phase_13_application_email_queue.sql'),
  read('supabase/migrations/20260915040000_phase_15_application_email_identity_convergence.sql'),
  read('supabase/migrations/20260915030000_phase_15_candidate_communication_core.sql')
]);

// Preserve historical Phase-13 source as migration history; repair it only with a forward migration.
assert.match(phase13ApplicationQueue, /'career@rcitcs\.com'/);
assert.match(convergence, /create or replace function public\.queue_candidate_application_emails\(\)/);
assert.match(convergence, /security invoker/);

// Applicant acknowledgement uses the approved recruitment sender/reply-to.
assert.match(convergence, /'application_acknowledgement'[\s\S]*new\.email,[\s\S]*'careers@rcitcs\.com',[\s\S]*'careers@rcitcs\.com'/);

// Internal application alert is delivered to the approved careers mailbox and still replies to the persisted candidate.
assert.match(convergence, /'internal_application_alert'[\s\S]*'careers@rcitcs\.com',[\s\S]*'noreply@rcitcs\.com',[\s\S]*new\.email/);

// The repaired trigger function must not retain the singular legacy mailbox anywhere.
assert.doesNotMatch(convergence, /'career@rcitcs\.com'/);

// Phase-15 queue authority must approve exactly the mailbox used by the repaired trigger.
assert.match(phase15Core, /'careers@rcitcs\.com'/);
assert.doesNotMatch(phase15Core, /'career@rcitcs\.com'/);

// Browser roles never receive execute authority for the trigger function.
assert.match(convergence, /revoke all on function public\.queue_candidate_application_emails\(\)[\s\S]*from public, anon, authenticated/);
assert.match(convergence, /grant execute on function public\.queue_candidate_application_emails\(\)[\s\S]*to service_role/);

// Queueing remains persistence-first and provider-free.
assert.match(convergence, /public\.enqueue_transactional_email/);
assert.doesNotMatch(convergence, /api\.resend\.com|RESEND_API_KEY|fetch\s*\(/);

console.log('Phase 15.8 application insert email identity converges to careers@rcitcs.com without rewriting historical migrations.');

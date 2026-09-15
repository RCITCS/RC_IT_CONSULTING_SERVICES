import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationPath = path.join(root, 'supabase/migrations/20260915030000_phase_15_candidate_communication_core.sql');
const contractPath = path.join(root, 'supabase/functions/_shared/email-contract.js');
const templatesPath = path.join(root, 'supabase/functions/_shared/email-templates.js');
const migration = await readFile(migrationPath, 'utf8');
const contract = await readFile(contractPath, 'utf8');

// Durable message model: candidate-visible content and authoritative email delivery are correlated.
assert.match(migration, /alter table public\.candidate_messages[\s\S]*sender_email text/);
assert.match(migration, /recipient_email text/);
assert.match(migration, /reply_to_email text/);
assert.match(migration, /template_key text/);
assert.match(migration, /idempotency_key text/);
assert.match(migration, /email_log_id uuid/);
assert.match(migration, /candidate_messages_email_log_id_fkey[\s\S]*references public\.email_logs\(id\)[\s\S]*on delete restrict/);
assert.match(migration, /candidate_messages_idempotency_key_uidx/);
assert.match(migration, /candidate_messages_email_log_id_uidx/);
assert.match(migration, /candidate_messages_application_timeline_idx/);

// Outbound email identity and message limits are database-enforced rather than browser-controlled.
assert.match(migration, /sender_email = 'careers@rcitcs\.com'/);
assert.match(migration, /reply_to_email = 'careers@rcitcs\.com'/);
assert.match(migration, /template_key = 'candidate_admin_reply'/);
assert.match(migration, /char_length\(btrim\(subject\)\) between 1 and 300/);
assert.match(migration, /char_length\(btrim\(body_text\)\) between 1 and 10000/);
assert.doesNotMatch(migration, /sender_email = 'career@rcitcs\.com'/);

// Phase-13 queue is reused and its approved recruitment identity is converged to careers@.
assert.match(migration, /create or replace function public\.enqueue_transactional_email/);
assert.match(migration, /'careers@rcitcs\.com'/);
assert.doesNotMatch(migration, /'career@rcitcs\.com'/);
assert.match(contract, /CANDIDATE_ADMIN_REPLY: 'candidate_admin_reply'/);
assert.match(contract, /address: 'careers@rcitcs\.com'/);
assert.match(contract, /career: CAREERS_IDENTITY/);
assert.match(contract, /careers: CAREERS_IDENTITY/);

// Message queueing is service-role-only, recipient comes from the persisted application and body is not copied into audit/history metadata.
assert.match(migration, /create or replace function public\.admin_queue_candidate_message/);
assert.match(migration, /select \* into v_application[\s\S]*from public\.applications[\s\S]*where id = p_application_id[\s\S]*for update/);
assert.match(migration, /lower\(btrim\(v_application\.email\)\)/);
assert.match(migration, /public\.enqueue_transactional_email/);
assert.match(migration, /insert into public\.candidate_messages/);
assert.match(migration, /'candidate_message_queued'/);
assert.match(migration, /revoke all on function public\.admin_queue_candidate_message\(uuid,uuid,uuid,text,text,text,text\)[\s\S]*from public, anon, authenticated/);
assert.match(migration, /grant execute on function public\.admin_queue_candidate_message\(uuid,uuid,uuid,text,text,text,text\)[\s\S]*to service_role/);
assert.doesNotMatch(migration, /jsonb_build_object\([^;]*(?:v_body|p_body|v_subject|p_subject)[^;]*\)/s);

// Same request id is the message id and email idempotency seed, preventing a double-click from creating a second message.
assert.match(migration, /v_idempotency_key := 'rcitcs\/candidate_admin_reply\/candidate_message\/' \|\| p_request_id::text/);
assert.match(migration, /where idempotency_key = v_idempotency_key/);
assert.match(migration, /'duplicate', true/);
assert.match(migration, /insert into public\.candidate_messages\([\s\S]*p_request_id/);

// Read context is bounded and excludes raw provider error fields.
assert.match(migration, /create or replace function public\.get_admin_candidate_communication_context/);
assert.match(migration, /least\(greatest\(coalesce\(p_limit, 100\), 1\), 100\)/);
assert.match(migration, /left join public\.email_logs e on e\.id = m\.email_log_id/);
assert.match(migration, /'delivery_status', coalesce\(e\.status, m\.status\)/);
assert.doesNotMatch(migration, /'error_message'|'error_code'/);

// Delivery-state duplication in candidate_messages is database-synchronized from email_logs.
assert.match(migration, /create or replace function public\.sync_candidate_message_delivery_state/);
assert.match(migration, /after update of status, provider_message_id, sent_at on public\.email_logs/);
assert.match(migration, /when 'bounced' then 'failed'/);
assert.match(migration, /when 'complained' then 'failed'/);
assert.match(migration, /when 'suppressed' then 'failed'/);

// Browser roles remain denied private communication data/RPCs.
assert.match(migration, /alter table public\.candidate_messages enable row level security/);
assert.match(migration, /alter table public\.candidate_messages force row level security/);
assert.match(migration, /revoke all on table public\.candidate_messages from anon, authenticated/);
assert.match(migration, /revoke all on function public\.get_admin_candidate_communication_context\(uuid,uuid,integer\)[\s\S]*from public, anon, authenticated/);

const { EMAIL_IDENTITIES, EMAIL_TEMPLATE_KEYS, fixedSenderForTemplate } = await import(`${pathToFileURL(contractPath).href}?phase15=${Date.now()}`);
assert.equal(EMAIL_IDENTITIES.careers.address, 'careers@rcitcs.com');
assert.equal(EMAIL_IDENTITIES.career.address, 'careers@rcitcs.com');
assert.equal(fixedSenderForTemplate(EMAIL_TEMPLATE_KEYS.CANDIDATE_ADMIN_REPLY).address, 'careers@rcitcs.com');

// Existing Phase-13 application acknowledgement must also use the corrected mailbox without a broad template rewrite.
const { applicationAcknowledgementTemplate } = await import(`${pathToFileURL(templatesPath).href}?phase15=${Date.now()}`);
const acknowledgement = applicationAcknowledgementTemplate({
  applicationReference: 'RC-APP-26-ABCDEF123456',
  firstName: 'Candidate',
  jobTitle: 'Software Engineer',
  candidateEmail: 'candidate@example.com'
});
assert.equal(acknowledgement.senderEmail, 'careers@rcitcs.com');
assert.equal(acknowledgement.replyTo, 'careers@rcitcs.com');

console.log('Phase 15.1 candidate communication data model, server authority, careers identity, bounded reads, idempotency and delivery-state synchronization passed.');

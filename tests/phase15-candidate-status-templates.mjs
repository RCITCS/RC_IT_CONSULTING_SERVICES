import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const templatePath = path.join(root, 'supabase/functions/_shared/candidate-message-templates.js');
const [migration, communication, templatesSource] = await Promise.all([
  read('supabase/migrations/20260915033000_phase_15_candidate_status_workflow.sql'),
  read('supabase/functions/admin-auth/candidate-communication.ts'),
  read('supabase/functions/_shared/candidate-message-templates.js')
]);

// Status authority is version-locked, service-role-only and server-authoritative.
assert.match(migration, /add column if not exists version integer not null default 1/);
assert.match(migration, /add column if not exists archived_from_status text/);
assert.match(migration, /create or replace function public\.admin_transition_candidate_application/);
assert.match(migration, /a\.status = 'active'/);
assert.match(migration, /a\.role = 'super_admin'/);
assert.match(migration, /where id = p_application_id\s+for update/);
assert.match(migration, /v_row\.version <> p_expected_version/);
assert.match(migration, /where id = p_application_id\s+and version = p_expected_version/);
assert.match(migration, /version = v_row\.version \+ 1/);
assert.match(migration, /'STALE_VERSION'/);
assert.match(migration, /'INVALID_TRANSITION'/);
assert.match(migration, /revoke all on function public\.admin_transition_candidate_application\(uuid,uuid,integer,text,text,text,text\)[\s\S]*from public, anon, authenticated/);
assert.match(migration, /grant execute on function public\.admin_transition_candidate_application\(uuid,uuid,integer,text,text,text,text\)[\s\S]*to service_role/);

// Legal transitions are explicit. Archived records restore to the prior stage instead of guessing a new workflow stage.
for (const status of ['submitted', 'under_review', 'shortlisted', 'interview', 'assessment', 'offer', 'hired', 'rejected', 'withdrawn', 'archived']) {
  assert.ok(migration.includes(`when '${status}'`) || status === 'archived', `Status transition contract missing ${status}.`);
}
assert.match(migration, /if v_requested = 'restore'/);
assert.match(migration, /v_target := coalesce\(v_row\.archived_from_status, 'under_review'\)/);
assert.match(migration, /archived_from_status = case when v_target = 'archived' then v_row\.status else null end/);

// Every transition is recorded in both application history and the audit log.
assert.match(migration, /insert into public\.application_history/);
assert.match(migration, /case when v_restoring then 'application_restored' else 'status_changed' end/);
assert.match(migration, /insert into public\.audit_logs/);
assert.match(migration, /'candidate_application_status_changed'/);
assert.match(migration, /'version_before', v_row\.version/);
assert.match(migration, /'version_after', v_after\.version/);

// Status mutation and candidate communication are deliberately separate operations.
assert.match(migration, /'email_queued', false/);
const statusFunctionStart = migration.indexOf('create or replace function public.admin_transition_candidate_application');
const statusFunctionEnd = migration.indexOf('\n$$;', statusFunctionStart);
const statusFunction = migration.slice(statusFunctionStart, statusFunctionEnd);
for (const forbidden of ['enqueue_transactional_email', 'insert into public.candidate_messages', 'email_logs', 'candidate_admin_reply', 'transactional-email']) {
  assert.ok(!statusFunction.includes(forbidden), `Status transition must not perform email work: ${forbidden}`);
}

// The bounded communication context now carries concurrency state without exposing provider errors.
assert.match(migration, /'version', a\.version/);
assert.match(migration, /'archived_from_status', a\.archived_from_status/);
assert.doesNotMatch(migration, /'error_message'|'error_code'/);

// Controlled templates are a fixed allowlist and use persisted application/job fields only.
const moduleUrl = `${pathToFileURL(templatePath).href}?phase154=${Date.now()}`;
const {
  CANDIDATE_MESSAGE_TEMPLATE_OPTIONS,
  candidateMessageTemplate
} = await import(moduleUrl);
const expectedKeys = ['review_update', 'shortlisted', 'interview', 'assessment', 'offer_update', 'rejection', 'withdrawal_ack'];
assert.deepEqual(CANDIDATE_MESSAGE_TEMPLATE_OPTIONS.map((item) => item.key), expectedKeys);

const application = {
  first_name: 'Asha <Test>',
  job_title: 'Senior API Engineer & Architect',
  public_reference: 'RC-APP-26-ABCDEF123456'
};
for (const key of expectedKeys) {
  const template = candidateMessageTemplate(key, application);
  assert.ok(template, `Template ${key} must exist.`);
  assert.equal(template.key, key);
  assert.ok(template.subject.includes(application.job_title), `${key} subject must use persisted job title.`);
  assert.ok(template.subject.includes(application.public_reference), `${key} subject must use persisted reference.`);
  assert.ok(template.body.includes(application.first_name), `${key} body must use persisted first name.`);
  assert.ok(template.body.includes(application.job_title), `${key} body must use persisted job title.`);
  assert.ok(template.body.includes(application.public_reference), `${key} body must use persisted reference.`);
  assert.ok(template.subject.length <= 300);
  assert.ok(template.body.length <= 10000);
  assert.ok(!/[\r\n]/.test(template.subject));
}
assert.equal(candidateMessageTemplate('not-approved', application), null);

// Templates must not invent operational facts that the application record does not contain.
const interview = candidateMessageTemplate('interview', application);
assert.match(interview.body, /provide the interview format, date, time and any preparation details separately once scheduling is confirmed/i);
assert.doesNotMatch(interview.body, /Zoom|Teams|Monday|Tuesday|Wednesday|Thursday|Friday|\b\d{1,2}:\d{2}\b/i);
const assessment = candidateMessageTemplate('assessment', application);
assert.match(assessment.body, /instructions, deadline and access details separately/i);
const offer = candidateMessageTemplate('offer_update', application);
assert.match(offer.body, /process update only/i);
assert.match(offer.body, /formal employment offer, compensation, conditions or contractual terms will be provided separately/i);

// Template buttons submit only to the existing protected preview path. They never submit intent=send.
assert.match(communication, /CANDIDATE_MESSAGE_TEMPLATE_OPTIONS/);
assert.match(communication, /candidateMessageTemplate\(option\.key, application\)/);
assert.match(communication, /name="intent" value="preview"/);
const templatePickerStart = communication.indexOf('function templatePicker');
const templatePickerEnd = communication.indexOf('\nexport function renderCandidateMessageComposer', templatePickerStart);
const templatePickerSource = communication.slice(templatePickerStart, templatePickerEnd);
assert.ok(templatePickerSource.includes('name="csrf"'));
assert.ok(templatePickerSource.includes('name="request_id"'));
assert.ok(!templatePickerSource.includes('name="intent" value="send"'), 'Controlled templates must never bypass final preview confirmation.');
assert.ok(!templatePickerSource.includes('recipient_email'));
assert.ok(!templatePickerSource.includes('sender_email'));

// The status UI helper is advisory only; it clearly communicates the no-auto-email boundary.
assert.match(communication, /renderCandidateStatusWorkflow/);
assert.match(communication, /Status and email are separate operations/);
assert.match(communication, /Updating the recruitment stage never sends candidate email automatically/);
assert.match(communication, /name="expected_version"/);
assert.match(communication, /name="target_status"/);
assert.match(communication, /maxlength="\$\{CANDIDATE_STATUS_NOTES_MAX\}"/);

// No secrets or provider implementation details belong in template source.
for (const source of [templatesSource, communication, migration]) {
  assert.doesNotMatch(source, /RESEND_API_KEY|api\.resend\.com|sb_secret_[A-Za-z0-9_-]{20,}/);
}

console.log('Phase 15.4 controlled recruitment templates, version-locked status workflow, restore semantics, audit/history and no-auto-email separation passed.');
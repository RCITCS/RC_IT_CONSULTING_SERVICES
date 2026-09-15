import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');

const [
  core,
  idempotency,
  statusWorkflow,
  deliveryConvergence,
  applications,
  communication,
  adminIndex,
  dispatcher,
  emailContract,
  delivery,
  templates,
  previewProof,
  phase13Retry
] = await Promise.all([
  read('supabase/migrations/20260915030000_phase_15_candidate_communication_core.sql'),
  read('supabase/migrations/20260915032000_phase_15_candidate_message_idempotency_hardening.sql'),
  read('supabase/migrations/20260915033000_phase_15_candidate_status_workflow.sql'),
  read('supabase/migrations/20260915034000_phase_15_candidate_delivery_state_convergence.sql'),
  read('supabase/functions/admin-auth/applications.ts'),
  read('supabase/functions/admin-auth/candidate-communication.ts'),
  read('supabase/functions/admin-auth/index.ts'),
  read('supabase/functions/transactional-email/index.ts'),
  read('supabase/functions/_shared/email-contract.js'),
  read('supabase/functions/_shared/candidate-reply-email-delivery.js'),
  read('supabase/functions/_shared/candidate-message-templates.js'),
  read('supabase/functions/_shared/candidate-preview-proof.js'),
  read('supabase/migrations/20260914013000_phase_13_email_runtime_retry_hardening.sql')
]);

const phase15Sql = [core, idempotency, statusWorkflow, deliveryConvergence].join('\n');
const phase15Runtime = [applications, communication, dispatcher, emailContract, delivery, templates, previewProof].join('\n');

// 1. Migration ordering is forward-only and each hardening layer has a distinct source file.
const migrationNames = [
  '20260915030000_phase_15_candidate_communication_core.sql',
  '20260915032000_phase_15_candidate_message_idempotency_hardening.sql',
  '20260915033000_phase_15_candidate_status_workflow.sql',
  '20260915034000_phase_15_candidate_delivery_state_convergence.sql'
];
assert.deepEqual([...migrationNames].sort(), migrationNames, 'Phase 15 migrations must remain forward-only and ordered.');

// 2. Private candidate communication stays behind forced RLS/browser denial and service-role RPCs.
assert.match(core, /alter table public\.candidate_messages enable row level security/);
assert.match(core, /alter table public\.candidate_messages force row level security/);
assert.match(core, /revoke all on table public\.candidate_messages from anon, authenticated/);
for (const signature of [
  'get_admin_candidate_communication_context\\(uuid,uuid,integer\\)',
  'admin_queue_candidate_message\\(uuid,uuid,uuid,text,text,text,text\\)'
]) {
  assert.match(core, new RegExp(`revoke all on function public\\.${signature}[\\s\\S]*from public, anon, authenticated`));
  assert.match(core, new RegExp(`grant execute on function public\\.${signature}[\\s\\S]*to service_role`));
}
assert.match(statusWorkflow, /revoke all on function public\.admin_transition_candidate_application\(uuid,uuid,integer,text,text,text,text\)[\s\S]*from public, anon, authenticated/);
assert.match(statusWorkflow, /grant execute on function public\.admin_transition_candidate_application\(uuid,uuid,integer,text,text,text,text\)[\s\S]*to service_role/);
assert.doesNotMatch(phase15Sql, /security\s+definer/i, 'Phase 15 admin RPCs must not introduce SECURITY DEFINER escalation.');
assert.match(core, /security invoker/);
assert.match(statusWorkflow, /security invoker/);

// 3. Authentication, origin/navigation and CSRF boundaries remain layered.
assert.match(adminIndex, /request\.method === "POST" && !originOk\(request, url\)/);
assert.match(adminIndex, /browserNavigationPostOk/);
assert.match(applications, /authState\.admin\.role !== "super_admin"/);
assert.match(applications, /csrfOk\(authState, String\(form\.get\("csrf"\) \?\? ""\)\)/);
assert.match(applications, /\^\\\/applications\\\/\(\[0-9a-f-\]\{36\}\)\\\/message\$/);
assert.match(applications, /\^\\\/applications\\\/\(\[0-9a-f-\]\{36\}\)\\\/status\$/);

// 4. Preview is a server-enforced integrity boundary. The exact application/admin/request/message/session tuple must be HMAC-proved before queueing.
assert.match(applications, /form\.get\("preview_proof"\)/);
assert.match(applications, /createCandidatePreviewProof\(previewFields\)/);
assert.match(applications, /verifyCandidatePreviewProof\(\{ \.\.\.previewFields, proof: previewProof \}\)/);
for (const binding of ['secret: API_KEY', 'applicationId', 'adminId', 'requestId', 'subject', 'body', 'csrf: String(authState.csrf || "")']) {
  assert.ok(applications.includes(binding), `Preview proof final-acceptance binding missing: ${binding}`);
}
const previewVerify = applications.indexOf('verifyCandidatePreviewProof({');
const queueCandidate = applications.indexOf('rpc("admin_queue_candidate_message"');
assert.ok(previewVerify >= 0 && queueCandidate > previewVerify, 'Candidate queueing must be unreachable until the exact preview proof verifies.');
assert.match(communication, /name="preview_proof" value="\$\{esc\(previewProof\)\}"/);
assert.match(communication, /draft\.preview === true && PREVIEW_PROOF\.test\(previewProof\)/);
assert.match(previewProof, /HMAC/);
assert.match(previewProof, /SHA-256/);
assert.match(previewProof, /crypto\.subtle\.sign/);
assert.match(previewProof, /difference \|=/);
assert.doesNotMatch(communication, /API_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS/);

// 5. Candidate identity and delivery authority are server-owned.
assert.match(core, /lower\(btrim\(v_application\.email\)\)/);
assert.match(core, /'careers@rcitcs\.com'/);
assert.match(emailContract, /address: 'careers@rcitcs\.com'/);
assert.match(emailContract, /CANDIDATE_ADMIN_REPLY: 'candidate_admin_reply'/);
assert.doesNotMatch(communication, /name="(?:recipient_email|sender_email|reply_to_email|provider|email_log_id)"/);
assert.doesNotMatch(applications, /api\.resend\.com|RESEND_API_KEY/);

// 6. Persist-before-deliver and one-message/one-email-log invariants are locked.
assert.match(core, /candidate_messages_email_log_id_fkey[\s\S]*references public\.email_logs\(id\)[\s\S]*on delete restrict/);
assert.match(core, /create unique index if not exists candidate_messages_idempotency_key_uidx/);
assert.match(core, /create unique index if not exists candidate_messages_email_log_id_uidx/);
assert.match(idempotency, /hashtextextended\('rcitcs\/candidate_message\/' \|\| p_request_id::text, 0\)/);
assert.match(idempotency, /'IDEMPOTENCY_CONFLICT'/);
assert.match(applications, /rpc\("admin_queue_candidate_message"/);
assert.ok(
  applications.indexOf('rpc("admin_queue_candidate_message"') < applications.indexOf('dispatchQueuedEmail(emailLogId)'),
  'Candidate message/email queue persistence must precede immediate provider dispatch.'
);
assert.match(dispatcher, /loadCandidateReplyMessage/);
assert.match(dispatcher, /dispatchCandidateReplyEmail/);

// 7. Candidate history is bounded and indexed for the exact application/timeline access path.
assert.match(core, /least\(greatest\(coalesce\(p_limit, 100\), 1\), 100\)/);
assert.match(core, /create index if not exists candidate_messages_application_timeline_idx[\s\S]*application_id, created_at desc, id desc/);
assert.match(core, /left join public\.email_logs e on e\.id = m\.email_log_id/);
assert.match(core, /order by m\.created_at desc, m\.id desc[\s\S]*limit v_limit/);
assert.match(communication, /messages\.slice\(0, 100\)/);
assert.match(communication, /Math\.min\(messages\.length, 100\)/);

// 8. Status workflow is optimistic-concurrency protected and cannot send email as a side effect.
assert.match(statusWorkflow, /add column if not exists version integer not null default 1/);
assert.match(statusWorkflow, /v_row\.version <> p_expected_version/);
assert.match(statusWorkflow, /where id = p_application_id[\s\S]*and version = p_expected_version/);
assert.match(statusWorkflow, /version = v_row\.version \+ 1/);
assert.match(statusWorkflow, /'STALE_VERSION'/);
assert.match(statusWorkflow, /'INVALID_TRANSITION'/);
assert.match(statusWorkflow, /'email_queued', false/);
const statusFunctionStart = statusWorkflow.indexOf('create or replace function public.admin_transition_candidate_application');
const statusFunctionEnd = statusWorkflow.indexOf('\n$$;', statusFunctionStart);
const statusFunction = statusWorkflow.slice(statusFunctionStart, statusFunctionEnd);
for (const forbidden of ['enqueue_transactional_email', 'candidate_admin_reply', 'insert into public.candidate_messages', 'dispatch']) {
  assert.ok(!statusFunction.includes(forbidden), `Status mutation must not perform email work: ${forbidden}`);
}
assert.match(applications, /return redirect\(`\$\{basePath\}\/applications\/\$\{applicationId\}\?notice=status_updated`\)/);

// 9. Templates remain a controlled allowlist and can only enter the preview-first message flow.
for (const key of ['review_update', 'shortlisted', 'interview', 'assessment', 'offer_update', 'rejection', 'withdrawal_ack']) {
  assert.ok(templates.includes(`'${key}'`), `Controlled candidate template missing: ${key}`);
}
assert.match(communication, /candidateMessageTemplate\(option\.key, application\)/);
const templatePickerStart = communication.indexOf('function templatePicker');
const templatePickerEnd = communication.indexOf('\nexport function renderCandidateMessageComposer', templatePickerStart);
const templatePicker = communication.slice(templatePickerStart, templatePickerEnd);
assert.match(templatePicker, /name="intent" value="preview"/);
assert.doesNotMatch(templatePicker, /name="intent" value="send"/);
assert.match(communication, /Send candidate email/);

// 10. Delivery retries are bounded, stale claims recoverable, and the provider receives the durable idempotency key.
assert.match(phase13Retry, /template_key <> 'admin_password_reset'/);
assert.match(phase13Retry, /attempt_count < 5/);
assert.match(phase13Retry, /last_attempt_at <= now\(\) - interval '15 minutes'/);
assert.match(delivery, /retryAtForEmailFailure/);
assert.match(delivery, /markSent/);
assert.match(delivery, /markFailed/);
assert.match(deliveryConvergence, /after update of status, provider_message_id, sent_at on public\.email_logs/);
for (const state of ['queued', 'sending', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'suppressed']) {
  assert.ok(deliveryConvergence.includes(`'${state}'`), `Safe candidate delivery state missing: ${state}`);
}

// 11. Audit/history evidence is retained while candidate-visible content is excluded from audit metadata.
assert.match(idempotency, /insert into public\.application_history/);
assert.match(idempotency, /insert into public\.audit_logs/);
assert.match(statusWorkflow, /insert into public\.application_history/);
assert.match(statusWorkflow, /insert into public\.audit_logs/);
assert.doesNotMatch(idempotency, /jsonb_build_object\([^;]*(?:v_body|p_body|v_subject|p_subject)[^;]*\)/s);

// 12. Browser rendering is escaped and raw provider failures stay out of the admin surface.
for (const expression of ['esc(subject)', 'esc(body)', 'esc(sender || "—")', 'esc(recipient || "—")']) {
  assert.ok(communication.includes(expression), `Escaped candidate renderer expression missing: ${expression}`);
}
assert.doesNotMatch(applications, /error_message|error_code|provider_message_id/);
assert.doesNotMatch(core, /'error_message'|'error_code'/);
assert.doesNotMatch(communication, /innerHTML\s*=|insertAdjacentHTML\s*\(/);

// 13. No credential material or later-phase implementation is introduced by Phase 15 source.
for (const source of [phase15Sql, phase15Runtime, adminIndex]) {
  assert.doesNotMatch(source, /sb_secret_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(source, /RESEND_API_KEY\s*=\s*["'][^"']+["']/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+["']/);
}

console.log('Phase 15.7 integrated acceptance: authorization, mandatory preview proof, browser isolation, bounded/indexed history, durable queueing, idempotency/retry, status-email separation, escaping and audit/privacy contracts passed.');
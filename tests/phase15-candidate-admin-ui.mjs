import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const [applications, communication, statusMigration, adminIndex] = await Promise.all([
  read('supabase/functions/admin-auth/applications.ts'),
  read('supabase/functions/admin-auth/candidate-communication.ts'),
  read('supabase/migrations/20260915033000_phase_15_candidate_status_workflow.sql'),
  read('supabase/functions/admin-auth/index.ts')
]);

// Existing top-level admin origin/navigation POST protection still guards all candidate mutations.
assert.match(adminIndex, /request\.method === "POST" && !originOk\(request, url\)/);
assert.match(adminIndex, /browserNavigationPostOk/);

// Candidate stage mutations have one exact protected endpoint and share the authenticated application authority.
assert.match(applications, /const statusMatch = \/\^\\\/applications\\\/\(\[0-9a-f-\]\{36\}\)\\\/status\$\/i\.exec\(path\)/);
assert.match(applications, /const mutationMatch = messageMatch \|\| statusMatch/);
assert.match(applications, /csrfOk\(authState, String\(form\.get\("csrf"\) \?\? ""\)\)/);
assert.match(applications, /if \(statusMatch\)/);
assert.match(applications, /Number\(form\.get\("expected_version"\) \?\? 0\)/);
assert.match(applications, /CANDIDATE_STATUS_TARGETS\.has\(targetStatus\)/);
assert.match(applications, /notes\.length > CANDIDATE_STATUS_NOTES_MAX/);
assert.match(applications, /rpc\("admin_transition_candidate_application"/);
for (const field of ['p_admin_id', 'p_application_id', 'p_expected_version', 'p_target_status', 'p_notes', 'p_ip_hash', 'p_user_agent']) {
  assert.ok(applications.includes(field), `Status mutation payload missing ${field}.`);
}

// Status transition returns before message queue/dispatch. A stage change cannot implicitly email the candidate.
const statusStart = applications.indexOf('if (statusMatch)');
const messageParseStart = applications.indexOf('const requestId = String(form.get("request_id")', statusStart);
const statusBranch = applications.slice(statusStart, messageParseStart);
assert.ok(statusStart >= 0 && messageParseStart > statusStart);
assert.doesNotMatch(statusBranch, /admin_queue_candidate_message|dispatchQueuedEmail|emailLogId|transactional-email/);
assert.match(statusBranch, /notice=status_updated/);
assert.match(applications, /Recruitment stage was updated and recorded\. No candidate email was sent by the stage change\./);
assert.match(statusMigration, /'email_queued', false/);

// Concurrency and invalid-transition errors are surfaced explicitly instead of fake success.
assert.match(applications, /STALE_VERSION: "stale"/);
assert.match(applications, /INVALID_TRANSITION: "invalid_transition"/);
assert.match(applications, /This application changed after it was loaded/);
assert.match(applications, /not permitted from the current stage/);
assert.match(applications, /No unverified success was recorded/);

// The detail page uses the bounded communication RPC's authoritative application/version state.
assert.match(applications, /communication\?\.application && typeof communication\.application === "object"/);
assert.match(applications, /\{ \.\.\.selected, \.\.\.communication\.application \}/);
assert.match(applications, /renderCandidateStatusWorkflow\(basePath, String\(session\.csrf \|\| ""\), authoritativeApplication\)/);
assert.match(applications, /renderCandidateMessageComposer\(basePath, String\(session\.csrf \|\| ""\), authoritativeApplication, draft\)/);
assert.match(applications, /id="candidate-stage-title"/);
assert.match(applications, /id="candidate-message-compose-title"/);
assert.match(applications, /id="candidate-communication-title"/);

// GET requests to mutation endpoints are rejected; only POST is advertised.
assert.match(applications, /if \(messageMatch \|\| statusMatch\)[\s\S]*allow: "POST"/);
assert.match(applications, /Candidate mutations require a protected POST request/);

// Forms expose labels/help text and no writable authority fields for sender/recipient/provider.
assert.match(communication, /aria-describedby="candidate-stage-help"/);
assert.match(communication, /id="candidate-stage-help"/);
assert.match(communication, /for="candidate-target-status"/);
assert.match(communication, /for="candidate-status-notes"/);
assert.match(communication, /aria-describedby="candidate-message-help"/);
assert.match(communication, /id="candidate-message-help"/);
assert.match(communication, /for="candidate-message-subject"/);
assert.match(communication, /for="candidate-message-body"/);
assert.match(communication, /aria-label="Confirm candidate email delivery"/);
assert.doesNotMatch(communication, /name="(?:recipient_email|sender_email|reply_to_email|provider|email_log_id)"/);

// Mobile layouts collapse naturally rather than forcing two-column content off-screen.
const autoFitMatches = communication.match(/repeat\(auto-fit,minmax\(min\(100%,\d+px\),1fr\)\)/g) ?? [];
assert.ok(autoFitMatches.length >= 3, 'Candidate communication/status UI must use responsive auto-fit grids.');
assert.match(applications, /repeat\(auto-fit,minmax\(min\(100%,210px\),1fr\)\)/);
assert.match(applications, /repeat\(auto-fit,minmax\(min\(100%,180px\),1fr\)\)/);
assert.match(applications, /tabindex="0" aria-label="Candidate private documents table"/);
assert.match(applications, /tabindex="0" aria-label="Application history table"/);
assert.match(communication, /overflow-wrap:anywhere/);

// Status controls explicitly preserve the separate-operation mental model.
assert.match(communication, /Status and email are separate operations/);
assert.match(communication, /Updating the recruitment stage never sends candidate email automatically/);
assert.match(applications, /Stage changes and candidate emails are separate actions/);

console.log('Phase 15.6 protected candidate stage UI, responsive layout, accessibility semantics and status/email separation passed.');
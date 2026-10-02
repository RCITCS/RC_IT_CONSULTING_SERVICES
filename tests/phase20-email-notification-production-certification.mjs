import assert from "node:assert/strict";
import fs from "node:fs";

const contract = fs.readFileSync("supabase/functions/_shared/email-contract.js","utf8");
const dispatcher = fs.readFileSync("supabase/functions/transactional-email/index.ts","utf8");
const application = fs.readFileSync("tests/phase13-application-emails.mjs","utf8");
const contact = fs.readFileSync("tests/phase13-contact-emails.mjs","utf8");
const reliability = fs.readFileSync("tests/phase13-email-reliability.mjs","utf8");
const contactReply = fs.readFileSync("supabase/functions/_shared/contact-reply-email-delivery.js","utf8");
const candidateReply = fs.readFileSync("supabase/functions/_shared/candidate-reply-email-delivery.js","utf8");

for (const key of [
  "CONTACT_ACKNOWLEDGEMENT","INTERNAL_CONTACT_ALERT","CONTACT_ADMIN_REPLY",
  "APPLICATION_ACKNOWLEDGEMENT","INTERNAL_APPLICATION_ALERT","CANDIDATE_ADMIN_REPLY",
  "ADMIN_PASSWORD_RESET","ADMIN_PASSWORD_CHANGED"
]) assert.ok(contract.includes(key), `missing email template: ${key}`);

for (const sender of ["contact@rcitcs.com","careers@rcitcs.com","noreply@rcitcs.com"]) {
  assert.ok(contract.includes(sender), `missing approved sender: ${sender}`);
}

assert.match(dispatcher,/provider:\s*"resend"/);
assert.match(dispatcher,/providerConfigured/);
assert.match(dispatcher,/applicationNotifications:\s*true/);
assert.match(dispatcher,/contactNotifications:\s*true/);
assert.match(dispatcher,/contactAdminReplies:\s*true/);
assert.match(dispatcher,/candidateAdminReplies:\s*true/);
assert.match(dispatcher,/retryScheduler:\s*true/);
assert.match(dispatcher,/monitoring:\s*true/);

for (const fn of ["claim_transactional_email","mark_transactional_email_sent","mark_transactional_email_failed","list_due_transactional_email_ids"]) {
  assert.ok(dispatcher.includes(fn), `dispatcher missing persistence authority: ${fn}`);
}

assert.match(application,/Fifth failed application attempt must become dead-letter/);
assert.match(contact,/Fifth failed contact attempt must become dead-letter/);
assert.match(reliability,/bounded retries/i);
assert.match(contactReply,/retryAtForEmailFailure/);
assert.match(candidateReply,/retryAtForEmailFailure/);

for (const source of [contract,dispatcher,contactReply,candidateReply]) {
  assert.doesNotMatch(source,/re_[A-Za-z0-9_-]{20,}/, "Resend secret-like value committed to source");
  assert.doesNotMatch(source,/RESEND_API_KEY\s*=\s*["'][^"']+["']/, "hard-coded RESEND_API_KEY detected");
}

console.log("Phase 20.14 email and notification source certification: PASS");

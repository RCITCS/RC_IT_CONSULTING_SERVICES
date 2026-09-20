import assert from "node:assert/strict";
import fs from "node:fs";

const router = fs.readFileSync("src/backend/api/router.js","utf8");
const careers = fs.readFileSync("src/backend/runtime/public-careers.js","utf8");
const phase12 = fs.readFileSync("tests/phase12-candidate-contract.mjs","utf8");
const jobAdmin = fs.readFileSync("tests/admin-job-management.mjs","utf8");
const contact = fs.readFileSync("tests/phase14-contact-final-acceptance.mjs","utf8");
const candidate = fs.readFileSync("tests/phase15-candidate-final-acceptance.mjs","utf8");

for (const route of ["contact","career-application"]) assert.ok(router.includes(route), `missing critical API route: ${route}`);
assert.match(careers,/action="\/api\/career-application"/);
assert.match(careers,/Submit application/);
assert.match(careers,/private storage/i);
assert.match(jobAdmin,/admin_save_job/);
assert.match(jobAdmin,/admin_transition_job/);
assert.match(contact,/admin_transition_contact_enquiry/);
assert.match(contact,/admin_add_contact_enquiry_note/);
assert.match(candidate,/admin_transition_candidate_application/);
assert.match(candidate,/email_queued', false/);
assert.match(phase12,/candidate/i);

console.log("Phase 20.13 critical business-flow source certification: PASS");

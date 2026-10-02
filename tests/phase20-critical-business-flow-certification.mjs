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

const workflow = fs.readFileSync(".github/workflows/phase20-critical-business-flow-acceptance.yml","utf8");
assert.ok(workflow.includes('name=\\"rc-deployment-sha\\" content=\\"${EXPECTED_SHA}\\"'), "exact-SHA workflow must preserve quoted HTML meta attributes without literal backslashes");
assert.ok(workflow.includes("careers/jobs/[^<]+"), "production flow must discover a currently published job from the live sitemap");
assert.ok(workflow.includes('job_path="${job_url#${BASE}}"'), "production flow must derive the real job path from the discovered sitemap URL");
assert.ok(!workflow.includes("/careers/jobs/senior-data-engineer"), "production flow must not hardcode mutable business job slugs");
assert.ok(workflow.includes("for job_attempt in $(seq 1 24)"), "production flow must retry transient sitemap projection gaps");
assert.ok(workflow.includes("sed -n '1p' || true"), "published-job discovery must not abort early under pipefail");
assert.ok(workflow.includes('grep -q \'action="/api/career-application"\' /tmp/apply.html'), "production flow must assert the real application form");
assert.ok(!workflow.includes('action="/api/career-application"\' /tmp/page.html || true'), "application-entry acceptance must not be a fail-open no-op");

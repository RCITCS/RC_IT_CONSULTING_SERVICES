import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync(new URL("../supabase/functions/admin-auth/index.ts", import.meta.url), "utf8");
const jobs = fs.readFileSync(new URL("../supabase/functions/admin-auth/job-routes.ts", import.meta.url), "utf8");
const applications = fs.readFileSync(new URL("../supabase/functions/admin-auth/applications.ts", import.meta.url), "utf8");
const contacts = fs.readFileSync(new URL("../supabase/functions/admin-auth/contacts.ts", import.meta.url), "utf8");

for (const fragment of [
  'const FORM_MEDIA_TYPES = new Set([',
  '"application/x-www-form-urlencoded"',
  '"multipart/form-data"',
  'const STATIC_MUTATION_PATHS = new Set([',
  '"/login"',
  '"/forgot-password"',
  '"/reset-password"',
  '"/logout"',
  '"/change-password"',
  '"/jobs/create"',
  'new RegExp(`^/jobs/${MUTATION_UUID}/(?:update|transition|duplicate|delete)$`, "i")',
  'new RegExp(`^/applications/${MUTATION_UUID}/(?:message|status)$`, "i")',
  'new RegExp(`^/contacts/${MUTATION_UUID}/(?:read-state|workflow|archive-state|note|reply|assignment)$`, "i")',
  'function allowedMutationPath(path: string): boolean',
  'function formMediaTypeOk(request: Request): boolean',
  'request.method === "POST" && !allowedMutationPath(path)',
  'request.method === "POST" && !formMediaTypeOk(request)',
  'request.method === "POST" && !originOk(request, url)',
  'requestTooLarge(request, path)'
]) assert.ok(index.includes(fragment), `missing Phase 16.7 request-integrity control: ${fragment}`);

const allowlistGate = index.indexOf('request.method === "POST" && !allowedMutationPath(path)');
const mediaGate = index.indexOf('request.method === "POST" && !formMediaTypeOk(request)');
const originGate = index.indexOf('request.method === "POST" && !originOk(request, url)');
const sizeGate = index.indexOf('requestTooLarge(request, path)');
assert.ok(allowlistGate > 0 && allowlistGate < mediaGate && mediaGate < originGate && originGate < sizeGate,
  "POST allowlist, media type, origin and size checks must execute in fail-closed order");

for (const [name, source] of [["jobs", jobs], ["applications", applications], ["contacts", contacts]]) {
  assert.ok(source.includes('authState.admin.role !== "super_admin"'), `${name} mutations must independently require super-admin authority`);
  assert.ok(source.includes("csrfOk"), `${name} mutations must independently verify CSRF`);
  assert.ok(source.includes('request.method === "POST"') || source.includes('request.method !== "POST"'), `${name} must constrain mutation methods`);
}

assert.ok(applications.includes('const mutationMatch = messageMatch || statusMatch;'), "candidate mutations must remain explicitly enumerated");
assert.ok(contacts.includes('const MUTATION_ACTIONS = new Set(["read-state", "workflow", "archive-state", "note", "reply", "assignment"]);'), "contact mutation actions must remain explicitly enumerated");
assert.ok(jobs.includes('["publish","unpublish","close","archive","restore"].includes(action)'), "job transitions must remain explicitly enumerated");

assert.ok(index.includes('request.headers.get("sec-fetch-site") === "same-origin"'), "proxied browser mutations must keep same-origin Fetch Metadata enforcement");
assert.ok(index.includes('ADMIN_PUBLIC_ORIGINS.has(parsedOrigin)'), "proxied browser mutations must keep approved-origin enforcement when Origin is present");
assert.ok(!index.includes('Access-Control-Allow-Origin: *'), "admin runtime must not introduce wildcard CORS");

console.log("Phase 16.7 request integrity / CSRF / origin / mutation boundary: PASS");

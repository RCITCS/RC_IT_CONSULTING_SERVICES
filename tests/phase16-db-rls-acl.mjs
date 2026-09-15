import assert from "node:assert/strict";
import fs from "node:fs";

const convergence = fs.readFileSync(new URL("../supabase/migrations/20260915110000_phase_16_rls_force_convergence.sql", import.meta.url), "utf8");
const phase8Schema = fs.readFileSync(new URL("../supabase/migrations/20260908183500_phase_8_schema.sql", import.meta.url), "utf8");
const storageProvisioner = fs.readFileSync(new URL("../scripts/provision-supabase-storage.mjs", import.meta.url), "utf8");
const rateLimitDeny = fs.readFileSync(new URL("../supabase/migrations/20260915101500_phase_16_auth_rate_limit_rls_deny.sql", import.meta.url), "utf8");

for (const fragment of [
  "alter table public.application_intake_sessions force row level security",
  "alter table public.job_code_registry force row level security",
  "revoke all on table public.application_intake_sessions from public, anon, authenticated",
  "revoke all on table public.job_code_registry from public, anon, authenticated"
]) assert.ok(convergence.includes(fragment), `missing Phase 16.12 RLS convergence: ${fragment}`);

for (const fragment of [
  "candidate-documents",
  "20971520",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]) assert.ok(phase8Schema.includes(fragment), `candidate document database contract lost: ${fragment}`);

for (const fragment of [
  "public: false",
  "file_size_limit: MAX_CANDIDATE_DOCUMENT_BYTES",
  "allowed_mime_types: Object.values(CANDIDATE_DOCUMENT_TYPES)"
]) assert.ok(storageProvisioner.includes(fragment), `private storage provisioning contract lost: ${fragment}`);

assert.ok(phase8Schema.includes("from anon, authenticated"), "Phase 8 application tables must retain browser-role revocation");
assert.ok(phase8Schema.includes("to service_role"), "Phase 8 application tables must retain server-role authority");
assert.ok(rateLimitDeny.includes("admin_auth_rate_limits_browser_deny"), "Phase 16 rate limiter must retain explicit browser deny policy");

console.log("Phase 16.12 database RLS/ACL and private-storage source contract: PASS");

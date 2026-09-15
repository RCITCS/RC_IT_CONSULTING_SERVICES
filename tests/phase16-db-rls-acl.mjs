import assert from "node:assert/strict";
import fs from "node:fs";

const convergence = fs.readFileSync(new URL("../supabase/migrations/20260915110000_phase_16_rls_force_convergence.sql", import.meta.url), "utf8");
const phase8 = fs.readFileSync(new URL("../supabase/migrations/20260908230736_phase_8_candidate_documents_bucket.sql", import.meta.url), "utf8");
const phase8Deny = fs.readFileSync(new URL("../supabase/migrations/20260908231650_phase_8_explicit_browser_deny_policies.sql", import.meta.url), "utf8");
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
]) assert.ok(phase8.includes(fragment), `candidate private-storage contract lost: ${fragment}`);

assert.ok(phase8Deny.includes("anon"), "Phase 8 browser-deny migration must remain present");
assert.ok(phase8Deny.includes("authenticated"), "Phase 8 browser-deny migration must remain present");
assert.ok(rateLimitDeny.includes("admin_auth_rate_limits_browser_deny"), "Phase 16 rate limiter must retain explicit browser deny policy");

console.log("Phase 16.12 database RLS/ACL and private-storage source contract: PASS");

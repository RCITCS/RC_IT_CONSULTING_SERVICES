import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  new URL("../supabase/migrations/20260915044500_phase_16_critical_audit_coverage.sql", import.meta.url),
  "utf8"
);
const doc = fs.readFileSync(
  new URL("../docs/PHASE_16_AUDIT_COVERAGE.md", import.meta.url),
  "utf8"
);
const applications = fs.readFileSync(
  new URL("../supabase/functions/admin-auth/applications.ts", import.meta.url),
  "utf8"
);
const auth = fs.readFileSync(
  new URL("../supabase/functions/admin-auth/index.ts", import.meta.url),
  "utf8"
);

for (const fragment of [
  "create or replace function public.audit_admin_session_lifecycle()",
  "after insert or update of revoked_at on public.sessions",
  "'admin_session_created'",
  "'admin_session_revoked'",
  "create or replace function public.audit_auth_throttle_activation()",
  "'admin_login_throttle_activated'",
  "'admin_password_reset_throttle_activated'",
  "interval '15 minutes'",
  "interval '1 hour'",
  "'threshold', 5",
  "'threshold', 3",
  "security invoker",
  "set search_path = ''",
  "from public, anon, authenticated",
  "to service_role"
]) {
  assert.ok(migration.includes(fragment), `missing Phase 16.2 database coverage: ${fragment}`);
}

assert.ok(
  migration.includes("when (new.action in ('admin_login_failed', 'admin_password_reset_requested'))"),
  "throttle trigger must be scoped to the two threshold source events"
);
assert.ok(
  migration.includes("not exists (") &&
  migration.includes("admin_login_throttle_activated") &&
  migration.includes("admin_password_reset_throttle_activated"),
  "throttle activation must be bounded to one event per active window"
);
assert.ok(!migration.includes("security definer"), "Phase 16.2 trigger functions must remain SECURITY INVOKER");

for (const event of [
  "admin_login_success",
  "admin_login_failed",
  "admin_logout",
  "admin_password_reset_requested",
  "admin_password_reset_completed",
  "admin_password_change_failed",
  "admin_password_changed"
]) {
  assert.ok(auth.includes(`\"${event}\"`), `existing authentication audit coverage missing ${event}`);
}

assert.ok(
  applications.includes('action: "candidate_document_downloaded"'),
  "private candidate-document download must remain audited"
);

for (const rule of [
  "Rate-limit **activation**",
  "audit ledger itself",
  "Security-policy denials",
  "Phase 16.7",
  "Phase 16.3"
]) {
  assert.ok(doc.includes(rule), `coverage document is missing boundary rule: ${rule}`);
}

console.log("Phase 16.2 critical audit coverage contract: PASS");

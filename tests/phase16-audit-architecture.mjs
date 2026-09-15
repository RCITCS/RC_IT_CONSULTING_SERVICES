import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  new URL("../supabase/migrations/20260915043000_phase_16_audit_logging_architecture.sql", import.meta.url),
  "utf8"
);
const doc = fs.readFileSync(
  new URL("../docs/PHASE_16_AUDIT_ARCHITECTURE.md", import.meta.url),
  "utf8"
);
const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const requiredMigrationFragments = [
  "add column if not exists request_id uuid",
  "add column if not exists session_id uuid",
  "add column if not exists outcome text",
  "add column if not exists event_version smallint",
  "check (outcome in ('success', 'failure', 'denied'))",
  "check (event_version = 1)",
  "audit_logs_request_created_idx",
  "audit_logs_session_created_idx",
  "create or replace function public.audit_json_has_sensitive_keys",
  "create or replace function public.append_audit_event",
  "security invoker",
  "set search_path = ''",
  "s.id = p_session_id",
  "s.admin_id = p_admin_id",
  "sensitive audit payload key rejected",
  "from public, anon, authenticated",
  "to service_role"
];

for (const fragment of requiredMigrationFragments) {
  assert.ok(migration.includes(fragment), `missing Phase 16.1 contract fragment: ${fragment}`);
}

assert.match(
  migration,
  /action\s+~ '\^\[a-z0-9\]\[a-z0-9\._-\]\*\$'/,
  "audit action must use the bounded stable-key format"
);
assert.match(
  migration,
  /ip_hash is null or ip_hash ~ '\^\[0-9a-f\]\{64\}\$'/,
  "raw or malformed IP values must not satisfy the audit schema"
);

for (const sensitiveKey of [
  "password",
  "token",
  "csrf",
  "authorization",
  "cookie",
  "api_key",
  "service_role",
  "secret",
  "document_content",
  "resume_content",
  "cover_letter_content",
  "message_body",
  "email_body"
]) {
  assert.ok(migration.includes(sensitiveKey), `sensitive-key guard is missing ${sensitiveKey}`);
}

assert.ok(
  !/grant\s+(?:all|update|delete|truncate)[\s\S]{0,120}audit_logs/i.test(migration),
  "Phase 16.1 must not broaden audit mutation authority"
);
assert.ok(
  !migration.includes("security definer"),
  "Phase 16.1 audit helpers must not become SECURITY DEFINER"
);

for (const rule of [
  "not a second source of truth",
  "minimum state needed",
  "raw client IP",
  "request_id",
  "outcome",
  "Phase 16.3",
  "forward-only"
]) {
  assert.ok(doc.includes(rule), `architecture document is missing rule: ${rule}`);
}

assert.equal(
  pkg.scripts["check:phase16-audit-architecture"],
  "node tests/phase16-audit-architecture.mjs",
  "package.json must expose the Phase 16.1 executable gate"
);

console.log("Phase 16.1 audit architecture contract: PASS");

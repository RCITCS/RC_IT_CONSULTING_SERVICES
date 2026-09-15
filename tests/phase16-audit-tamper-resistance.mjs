import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  new URL("../supabase/migrations/20260915050000_phase_16_audit_tamper_resistance.sql", import.meta.url),
  "utf8"
);
const doc = fs.readFileSync(
  new URL("../docs/PHASE_16_AUDIT_TAMPER_RESISTANCE.md", import.meta.url),
  "utf8"
);

for (const fragment of [
  "on delete restrict",
  "revoke all on table public.audit_logs from anon, authenticated",
  "revoke update, delete, truncate, references, trigger on table public.audit_logs from service_role",
  "grant select, insert on table public.audit_logs to service_role",
  "create or replace function public.reject_audit_log_mutation()",
  "current_user <> 'postgres'",
  "audit ledger is append-only",
  "before update or delete on public.audit_logs",
  "before truncate on public.audit_logs",
  "from public, anon, authenticated, service_role"
]) {
  assert.ok(migration.includes(fragment), `missing Phase 16.3 integrity control: ${fragment}`);
}

assert.ok(!migration.includes("security definer"), "tamper-resistance trigger must remain SECURITY INVOKER");
assert.ok(
  !/grant\s+(?:update|delete|truncate|all)\s+on\s+table\s+public\.audit_logs\s+to\s+service_role/i.test(migration),
  "service_role mutation authority must not be reintroduced"
);

for (const rule of [
  "append-only ledger",
  "`SELECT`",
  "`INSERT`",
  "`UPDATE`",
  "`DELETE`",
  "`TRUNCATE`",
  "ON DELETE RESTRICT",
  "database owner"
]) {
  assert.ok(doc.includes(rule), `tamper-resistance document missing ${rule}`);
}

console.log("Phase 16.3 audit tamper-resistance contract: PASS");

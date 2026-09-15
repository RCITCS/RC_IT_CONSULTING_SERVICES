import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(new URL("../supabase/migrations/20260915051500_phase_16_audit_activity_view.sql", import.meta.url), "utf8");
const data = fs.readFileSync(new URL("../supabase/functions/admin-auth/security-data.ts", import.meta.url), "utf8");
const ui = fs.readFileSync(new URL("../supabase/functions/admin-auth/security.ts", import.meta.url), "utf8");

for (const fragment of [
  "audit_logs_created_id_idx",
  "create or replace function public.get_admin_audit_activity",
  "least(greatest(coalesce(p_limit, 100), 1), 100)",
  "and a.role = 'super_admin'",
  "lower(a.email) = 'rcitcservices@gmail.com'",
  "left(l.id::text, 8) as event_ref",
  "left(l.entity_id::text, 8)",
  "(l.ip_hash is not null) as has_network_context",
  "projection', 'phase_16_redacted_v1'",
  "from public, anon, authenticated",
  "to service_role"
]) assert.ok(migration.includes(fragment), `missing Phase 16.4 projection control: ${fragment}`);

for (const forbidden of ["l.ip_hash as", "l.user_agent", "l.before_data", "l.after_data", "l.metadata as"]) {
  assert.ok(!migration.includes(forbidden), `raw audit payload must not be projected: ${forbidden}`);
}

assert.ok(data.includes("p_limit: 100"), "server adapter must request a bounded projection");
assert.ok(data.includes("AbortSignal.timeout(8000)"), "security activity fetch must be bounded by timeout");
assert.ok(!data.includes("SUPABASE_ANON_KEY"), "viewer must not use a browser/anon data path");

for (const fragment of [
  "export async function securityPage",
  "securityAuditContext(adminId)",
  "Latest ${events.length} · max 100",
  "Twenty-five rows per page",
  "Denied and failed events",
  "Authentication and sessions",
  "Operational administration",
  "raw IP hashes",
  "full internal UUIDs"
]) assert.ok(ui.includes(fragment), `security activity UI missing: ${fragment}`);

assert.ok(!ui.includes("<script"), "Phase 16.4 must not weaken CSP with inline scripting");
assert.ok(!ui.includes("before_data"), "raw before-data must not reach the UI renderer");
assert.ok(!ui.includes("after_data"), "raw after-data must not reach the UI renderer");
assert.ok(!ui.includes("user_agent"), "raw user-agent must not reach the UI renderer");
assert.ok(!ui.includes("ip_hash"), "raw IP hash must not reach the UI renderer");

console.log("Phase 16.4 bounded audit activity viewer: PASS");

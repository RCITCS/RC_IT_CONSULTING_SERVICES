import assert from "node:assert/strict";
import fs from "node:fs";

const baseMigration = fs.readFileSync(new URL("../supabase/migrations/20260915051500_phase_16_audit_activity_view.sql", import.meta.url), "utf8");
const convergenceMigration = fs.readFileSync(new URL("../supabase/migrations/20260915052500_phase_16_audit_activity_filter_pagination.sql", import.meta.url), "utf8");
const data = fs.readFileSync(new URL("../supabase/functions/admin-auth/security-data.ts", import.meta.url), "utf8");
const ui = fs.readFileSync(new URL("../supabase/functions/admin-auth/security.ts", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../supabase/functions/admin-auth/index.ts", import.meta.url), "utf8");

for (const fragment of [
  "audit_logs_created_id_idx",
  "create or replace function public.get_admin_audit_activity",
  "and a.role = 'super_admin'",
  "lower(a.email) = 'rcitcservices@gmail.com'",
  "projection', 'phase_16_redacted_v1'",
  "from public, anon, authenticated",
  "to service_role"
]) assert.ok(baseMigration.includes(fragment), `missing Phase 16.4 base projection control: ${fragment}`);

for (const fragment of [
  "audit_logs_action_prefix_idx",
  "audit_logs_entity_type_prefix_idx",
  "create or replace function public.get_admin_audit_activity_page",
  "p_page integer default 1",
  "p_page_size integer default 25",
  "p_action text default null",
  "p_entity_type text default null",
  "p_outcome text default null",
  "p_actor text default 'all'",
  "p_from_date date default null",
  "p_to_date date default null",
  "p_search text default null",
  "v_page > 20",
  "v_page_size > 50",
  "(p_to_date - p_from_date) > 366",
  "Europe/London",
  "limit v_page_size + 1",
  "offset v_offset",
  "projection', 'phase_16_redacted_v2'",
  "from public, anon, authenticated",
  "to service_role"
]) assert.ok(convergenceMigration.includes(fragment), `missing Phase 16.4 filtered-page control: ${fragment}`);

for (const forbidden of ["'user_agent',", "'before_data',", "'after_data',", "'metadata',", "'ip_hash',"]) {
  assert.ok(!convergenceMigration.includes(forbidden), `raw audit payload must not be projected: ${forbidden}`);
}

for (const fragment of [
  "get_admin_audit_activity_page",
  "p_page: filters.page",
  "p_page_size: 25",
  "p_search: filters.search || null",
  "p_action: filters.action || null",
  "p_entity_type: filters.entityType || null",
  "p_outcome: filters.outcome || null",
  "p_actor: filters.actor",
  "p_from_date: filters.fromDate || null",
  "p_to_date: filters.toDate || null",
  "AbortSignal.timeout(8000)"
]) assert.ok(data.includes(fragment), `server adapter missing bounded viewer behavior: ${fragment}`);
assert.ok(!data.includes("SUPABASE_ANON_KEY"), "viewer must not use a browser/anon data path");

for (const fragment of [
  "export async function securityPage",
  "securityAuditContext(adminId, filters)",
  "Search action or area",
  "Exact action",
  "Resource area",
  "All outcomes",
  "All actors",
  "From date",
  "To date",
  "Apply filters",
  "Previous page",
  "Next page",
  "20 pages × 25 rows",
  "Invalid or overlong date ranges are safely reset.",
  "const spanDays = Math.floor((toTime - fromTime) / 86400000)",
  "if (toTime < fromTime || spanDays > 366)",
  "Recruitment publishing is managed from the Jobs workspace.",
  "tabindex=\"0\"",
  "raw IP hashes",
  "full internal UUIDs"
]) assert.ok(ui.includes(fragment), `security activity UI missing: ${fragment}`);

assert.ok(index.includes("securityPage(basePath, authState, \"\", false, 200, url.searchParams)"), "GET security route must pass sanitized query parameters to the server renderer");
assert.ok(!ui.includes("<script"), "Phase 16.4 must not weaken CSP with inline scripting");
assert.ok(!ui.includes("before_data"), "raw before-data must not reach the UI renderer");
assert.ok(!ui.includes("after_data"), "raw after-data must not reach the UI renderer");
assert.ok(!ui.includes("user_agent"), "raw user-agent must not reach the UI renderer");
assert.ok(!ui.includes("ip_hash"), "raw IP hash must not reach the UI renderer");

console.log("Phase 16.4 bounded, filtered and paginated audit activity viewer: PASS");

import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(new URL("../supabase/migrations/20260915053500_phase_16_authentication_hardening.sql", import.meta.url), "utf8");
const convergence = fs.readFileSync(new URL("../supabase/migrations/20260915054500_phase_16_authentication_reset_convergence.sql", import.meta.url), "utf8");
const runtime = fs.readFileSync(new URL("../supabase/functions/admin-auth/index.ts", import.meta.url), "utf8");

for (const fragment of [
  "char_length(p_password) < 12",
  "and role = 'super_admin'",
  "lower(email) = 'rcitcservices@gmail.com'",
  "and password_hash is null",
  "encode(extensions.digest(p_password, 'sha256'), 'hex')",
  "extensions.gen_salt('bf', 12)",
  "char_length(p_password) between 1 and 256",
  "p_requested_ip_hash !~ '^[0-9a-f]{64}$'",
  "p_expires_at > now() + interval '30 minutes'",
  "revoke execute on function public.rcitcs_verify_admin_password",
  "revoke execute on function public.rcitcs_change_admin_password"
]) assert.ok(migration.includes(fragment), `missing Phase 16.5 hardening control: ${fragment}`);

for (const fragment of [
  "password_reset_tokens_requested_ip_hash_shape_check",
  "requested_ip_hash ~ '^[0-9a-f]{64}$'",
  "password_reset_tokens_max_lifetime_check",
  "expires_at <= created_at + interval '30 minutes'",
  "password_reset_tokens_one_unused_per_admin_uidx",
  "where used_at is null",
  "p_current_password is null",
  "char_length(p_current_password) < 1",
  "char_length(p_current_password) > 256",
  "and role = 'super_admin'",
  "lower(email) = 'rcitcservices@gmail.com'",
  "update public.sessions",
  "revoke execute on function public.change_admin_password",
  "grant execute on function public.change_admin_password"
]) assert.ok(convergence.includes(fragment), `missing Phase 16.5 convergence control: ${fragment}`);

for (const runtimeContract of [
  'const SESSION_TTL = 8 * 60 * 60;',
  'const IDLE_TTL = 30 * 60;',
  'if (await failedCount(clientHash) >= 5)',
  'return loginPage(basePath, "Invalid email or password.", true);',
  'await revokeSession(authState.id);',
  'if (next === current || next !== confirm || !strong(next)'
]) assert.ok(runtime.includes(runtimeContract), `current admin runtime lost authentication contract: ${runtimeContract}`);

assert.ok(!migration.includes("security definer"), "authentication helpers must remain SECURITY INVOKER");
assert.ok(!convergence.includes("security definer"), "authentication convergence helper must remain SECURITY INVOKER");
assert.ok(!runtime.includes("Invalid email."), "login response must not become an account-enumeration oracle");
assert.ok(!runtime.includes("Invalid password."), "login response must not become a password oracle");

console.log("Phase 16.5 authentication and reset-lifecycle hardening contract: PASS");

import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(new URL("../supabase/migrations/20260915100000_phase_16_auth_rate_limit_authority.sql", import.meta.url), "utf8");
const convergence = fs.readFileSync(new URL("../supabase/migrations/20260915101500_phase_16_auth_rate_limit_rls_deny.sql", import.meta.url), "utf8");
const adapter = fs.readFileSync(new URL("../supabase/functions/admin-auth/rate-limit.ts", import.meta.url), "utf8");
const runtime = fs.readFileSync(new URL("../supabase/functions/admin-auth/index.ts", import.meta.url), "utf8");

for (const fragment of [
  "create table if not exists public.admin_auth_rate_limits",
  "primary key (scope, bucket_key)",
  "login_ip",
  "login_global",
  "reset_ip",
  "reset_global",
  "force row level security",
  "create or replace function public.consume_admin_auth_rate_limit",
  "on conflict (scope, bucket_key) do update",
  "v_attempts = p_limit + 1",
  "revoke all on table public.admin_auth_rate_limits from public, anon, authenticated",
  "to service_role"
]) assert.ok(migration.includes(fragment), `missing Phase 16.8 database throttle control: ${fragment}`);

for (const fragment of [
  "create policy admin_auth_rate_limits_browser_deny",
  "to anon, authenticated",
  "using (false)",
  "with check (false)",
  "revoke all on table public.admin_auth_rate_limits from public, anon, authenticated",
  "grant execute on function public.consume_admin_auth_rate_limit"
]) assert.ok(convergence.includes(fragment), `missing Phase 16.8 explicit RLS deny convergence: ${fragment}`);

for (const fragment of [
  'export async function consumeAuthRateLimit(',
  'rpc/consume_admin_auth_rate_limit',
  'AbortSignal.timeout(5000)',
  'if (!SUPABASE_URL || !API_KEY) throw new Error("rate limit authority unavailable")'
]) assert.ok(adapter.includes(fragment), `missing Phase 16.8 server throttle adapter: ${fragment}`);
assert.ok(!adapter.includes("SUPABASE_ANON_KEY"), "auth rate limiter must not use browser authority");

for (const fragment of [
  'const LOGIN_IP_ATTEMPT_LIMIT = 10;',
  'const LOGIN_GLOBAL_ATTEMPT_LIMIT = 25;',
  'const LOGIN_WINDOW_SECONDS = 15 * 60;',
  'const RESET_IP_ATTEMPT_LIMIT = 6;',
  'const RESET_GLOBAL_ATTEMPT_LIMIT = 10;',
  'const RESET_WINDOW_SECONDS = 60 * 60;',
  'consumeAuthRateLimit("login_ip", clientHash, LOGIN_IP_ATTEMPT_LIMIT, LOGIN_WINDOW_SECONDS)',
  'consumeAuthRateLimit("login_global", "global", LOGIN_GLOBAL_ATTEMPT_LIMIT, LOGIN_WINDOW_SECONDS)',
  'consumeAuthRateLimit("reset_ip", clientHash, RESET_IP_ATTEMPT_LIMIT, RESET_WINDOW_SECONDS)',
  'consumeAuthRateLimit("reset_global", "global", RESET_GLOBAL_ATTEMPT_LIMIT, RESET_WINDOW_SECONDS)',
  'if (await failedCount(clientHash) >= 5)',
  'await resetRequestCount(clientHash) < 3',
  'admin_login_rate_limit_blocked',
  'admin_password_reset_rate_limit_blocked',
  'return forgotPage(basePath, true);'
]) assert.ok(runtime.includes(fragment), `missing Phase 16.8 runtime abuse control: ${fragment}`);

const loginAtomic = runtime.indexOf('consumeAuthRateLimit("login_ip"');
const passwordLookup = runtime.indexOf('const password = String(form.get("password")');
assert.ok(loginAtomic > 0 && loginAtomic < passwordLookup, "atomic login limits must be consumed before password verification");

const resetAtomic = runtime.indexOf('consumeAuthRateLimit("reset_ip"');
const resetQueue = runtime.indexOf('await queueResetRequest(admin.id, admin.email)');
assert.ok(resetAtomic > 0 && resetAtomic < resetQueue, "atomic reset limits must be consumed before reset email queueing");

assert.ok(!runtime.includes("Your reset request was rate limited"), "password reset throttling must not become an account-enumeration signal");
console.log("Phase 16.8 atomic authentication/reset abuse resistance: PASS");

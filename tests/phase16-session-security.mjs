import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(new URL("../supabase/migrations/20260915060000_phase_16_session_security_hardening.sql", import.meta.url), "utf8");
const runtime = fs.readFileSync(new URL("../supabase/functions/admin-auth/index.ts", import.meta.url), "utf8");
const cryptoSource = fs.readFileSync(new URL("../supabase/functions/admin-auth/crypto.js", import.meta.url), "utf8");

for (const fragment of [
  "alter table public.sessions alter column last_seen_at set not null",
  "sessions_ip_hash_shape_check",
  "sessions_user_agent_length_check",
  "sessions_absolute_lifetime_check",
  "expires_at <= created_at + interval '8 hours'",
  "sessions_last_seen_window_check",
  "last_seen_at >= created_at and last_seen_at <= expires_at",
  "sessions_revocation_time_check",
  "sessions_one_active_per_admin_uidx",
  "where revoked_at is null",
  "create or replace function public.create_admin_session",
  "p_token_hash !~ '^[0-9a-f]{64}$'",
  "p_csrf_token_hash !~ '^[0-9a-f]{64}$'",
  "p_ip_hash !~ '^[0-9a-f]{64}$'",
  "char_length(p_user_agent) > 500",
  "p_expires_at > now() + interval '8 hours'",
  "lower(email) = 'rcitcservices@gmail.com'",
  "set revoked_at = coalesce(revoked_at, now())",
  "create or replace function public.get_admin_session_context",
  "greatest(",
  "now() - interval '30 minutes'",
  "s.last_seen_at > v_idle_cutoff",
  "and expires_at > now()",
  "return null",
  "from public, anon, authenticated",
  "to service_role"
]) assert.ok(migration.includes(fragment), `missing Phase 16.6 session control: ${fragment}`);

assert.ok(!migration.includes("security definer"), "session authority functions must remain SECURITY INVOKER");
assert.ok(!/update\s+public\.sessions[\s\S]*set\s+expires_at/i.test(migration), "activity refresh must never slide absolute session expiry");

for (const contract of [
  "const SESSION_TTL = 8 * 60 * 60;",
  "const IDLE_TTL = 30 * 60;",
  "Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict; Priority=High",
  "await createSession({",
  "await revokeSession(authState.id);"
]) assert.ok(runtime.includes(contract), `runtime lost session security contract: ${contract}`);

assert.ok(cryptoSource.includes("crypto.getRandomValues(new Uint8Array(32))"), "session and CSRF material must use 256-bit CSPRNG values");
assert.ok(cryptoSource.includes("crypto.subtle.digest(\"SHA-256\""), "session/CSRF material must be hashed before database persistence");

console.log("Phase 16.6 session lifecycle security contract: PASS");

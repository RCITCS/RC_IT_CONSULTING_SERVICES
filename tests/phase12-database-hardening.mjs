import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migration = await readFile(path.join(root, 'supabase/migrations/20260910204500_phase_12_candidate_application_hardening.sql'), 'utf8');

for (const contract of [
  'cleanup_claimed_at timestamptz',
  'cleanup_completed_at timestamptz',
  'application_intake_sessions_cleanup_state_check',
  'applications_require_cover_letter',
  'application_documents_preserve_cover_letter',
  'deferrable initially deferred',
  'claim_expired_candidate_intakes',
  'complete_expired_candidate_intake_cleanup',
  'for update skip locked',
  "interval '10 minutes'",
  "kind = 'cover_letter'",
  "grant execute on function public.claim_expired_candidate_intakes(integer) to service_role",
  "grant execute on function public.complete_expired_candidate_intake_cleanup(uuid,text) to service_role"
]) assert.ok(migration.toLowerCase().includes(contract.toLowerCase()), `Phase 12 hardening contract missing: ${contract}`);

assert.ok(migration.includes("nullif(btrim(a.cover_letter_text), '') is null"), 'Migration must reject pre-existing applications with neither cover-letter text nor document.');
assert.ok(migration.includes("cleanup_completed_at is null or cancelled_at is not null"), 'Cleanup completion must imply the intake is cancelled.');
assert.ok(migration.includes('cleanup_claimed_at <= now() - interval \'10 minutes\''), 'Failed cleanup claims must become retryable.');
assert.ok(migration.includes('limit v_limit'), 'Expired-session claiming must be bounded.');
assert.ok(migration.includes('greatest(1, least(coalesce(p_limit, 10), 50))'), 'Cleanup batch size must be clamped server-side.');
assert.ok(!/grant\s+execute[\s\S]{0,180}\bto\s+(?:anon|authenticated)\b/i.test(migration), 'Browser roles must never receive cleanup RPC execution.');
assert.ok(!/security\s+definer/i.test(migration), 'Phase 12 cleanup and constraint functions must not bypass RLS through SECURITY DEFINER.');

console.log('PASS: Phase 12 persistence enforces cover-letter/message presence and retry-safe bounded cleanup of expired private upload sessions.');

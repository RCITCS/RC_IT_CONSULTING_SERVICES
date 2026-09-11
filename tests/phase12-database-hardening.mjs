import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [contractMigration, hardeningMigration, edge] = await Promise.all([
  readFile(path.join(root, 'supabase/migrations/20260910203000_phase_12_candidate_application_contract.sql'), 'utf8'),
  readFile(path.join(root, 'supabase/migrations/20260910204500_phase_12_candidate_application_hardening.sql'), 'utf8'),
  readFile(path.join(root, 'supabase/functions/candidate-applications/index.ts'), 'utf8')
]);

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
]) assert.ok(hardeningMigration.toLowerCase().includes(contract.toLowerCase()), `Phase 12 hardening contract missing: ${contract}`);

assert.ok(hardeningMigration.includes("nullif(btrim(a.cover_letter_text), '') is null"), 'Migration must reject pre-existing applications with neither cover-letter text nor document.');
assert.ok(hardeningMigration.includes("cleanup_completed_at is null or cancelled_at is not null"), 'Cleanup completion must imply the intake is cancelled.');
assert.ok(hardeningMigration.includes("cleanup_claimed_at <= now() - interval '10 minutes'"), 'Failed cleanup claims must become retryable.');
assert.ok(hardeningMigration.includes('limit v_limit'), 'Expired-session claiming must be bounded.');
assert.ok(hardeningMigration.includes('greatest(1, least(coalesce(p_limit, 10), 50))'), 'Cleanup batch size must be clamped server-side.');
assert.ok(!/grant\s+execute[\s\S]{0,180}\bto\s+(?:anon|authenticated)\b/i.test(hardeningMigration), 'Browser roles must never receive cleanup RPC execution.');
assert.ok(!/security\s+definer/i.test(hardeningMigration), 'Phase 12 cleanup and constraint functions must not bypass RLS through SECURITY DEFINER.');

assert.match(
  contractMigration,
  /add constraint application_documents_sha256_check\s+check \(sha256 is not null and sha256 ~ '\^\[0-9a-f\]\{64\}\$'\) not valid;/i,
  'Phase 12 must preserve truthful Phase 8 rows whose content hash was never recorded while enforcing hashes for new/updated documents.'
);
assert.ok(contractMigration.includes("if v_cover_letter_text is null"), 'SQL finalization must reassert the cover-letter requirement.');
assert.ok(contractMigration.includes("d->>'kind' = 'cover_letter'"), 'SQL finalization must accept a private cover-letter document as the alternative to message text.');
assert.ok(edge.includes('/storage/v1/upload/resumable`'), 'Signed TUS uploads must use the documented direct resumable endpoint.');
assert.ok(!edge.includes('/storage/v1/upload/resumable/sign'), 'Undocumented TUS /sign endpoint must not return.');
assert.ok(edge.includes('hasCoverLetterDocument'), 'Edge finalization must revalidate cover-letter presence after loading the intake session.');
assert.ok(edge.includes('COVER_LETTER_REQUIRED'), 'Missing final cover-letter content must produce an explicit validation result.');

console.log('PASS: Phase 12 persistence preserves legacy document truth, enforces verified hashes/new cover-letter invariants, and owns retry-safe cleanup of expired private upload sessions.');

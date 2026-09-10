import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const [migration, repository, runtime] = await Promise.all([
  read('supabase/migrations/20260910162500_phase_11_legacy_content_preservation.sql'),
  read('src/backend/repositories/public-jobs-repository.js'),
  read('src/backend/runtime/public-careers.js')
]);

for (const column of [
  'industries jsonb',
  'preferred_qualifications jsonb',
  'working_style_details jsonb',
  'location_details text'
]) assert.ok(migration.includes(column), `Preserved Careers field missing from database migration: ${column}`);

for (const projection of [
  "'industries', e.industries",
  "'preferred_qualifications', e.preferred_qualifications",
  "'working_style_details', e.working_style_details",
  "'location_details', e.location_details"
]) assert.ok(migration.includes(projection), `Preserved Careers field missing from public projection: ${projection}`);

for (const copied of [
  'v_job.industries',
  'v_job.preferred_qualifications',
  'v_job.working_style_details',
  'v_job.location_details'
]) assert.ok(migration.includes(copied), `Duplicate workflow would lose approved Careers content: ${copied}`);

assert.ok(/security invoker/gi.test(migration));
assert.ok(!/security\s+definer/i.test(migration));
assert.ok(!/grant\s+execute[\s\S]{0,180}\bto\s+(?:anon|authenticated)\b/i.test(migration));

for (const adapterField of ['industries', 'preferredQualifications', 'workingStyleDetails', 'locationDetails']) {
  assert.ok(repository.includes(adapterField), `Public repository drops approved Careers field: ${adapterField}`);
}
for (const visibleSection of ['Industry context', 'Preferred qualifications', 'Nature of working style', 'job.locationDetails']) {
  assert.ok(runtime.includes(visibleSection), `Public Careers runtime drops approved content: ${visibleSection}`);
}

console.log('PASS: Phase 11 preserves approved industry, preferred-qualification, working-style and location-detail content across database, duplicate and public-runtime boundaries.');

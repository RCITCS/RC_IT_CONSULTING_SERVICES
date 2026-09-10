import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = await mkdtemp(path.join(tmpdir(), 'rcitcs-phase11-seed-'));
const generatedSql = path.join(temp, 'seed.sql');
const generatedManifest = path.join(temp, 'manifest.json');
const checkedMigration = path.join(root, 'supabase/migrations/20260910164000_phase_11_legacy_job_catalog_seed.sql');

try {
  await execFileAsync(process.execPath, [
    path.join(root, 'scripts/export-phase11-legacy-job-seed.mjs'),
    generatedSql,
    generatedManifest
  ], { cwd: root });

  const [expected, actual, manifestText] = await Promise.all([
    readFile(generatedSql, 'utf8'),
    readFile(checkedMigration, 'utf8'),
    readFile(generatedManifest, 'utf8')
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(actual, expected, 'Checked Phase 11 seed migration must exactly match the approved source catalog exporter.');
  assert.equal(manifest.totalJobs, 46);
  assert.equal(manifest.statuses.published, 46);
  assert.equal(manifest.statuses.draft, 0);
  assert.equal(manifest.statuses.closed, 0);
  assert.equal(manifest.statuses.archived, 0);
  assert.equal(manifest.categories, 18);
  assert.equal(manifest.firstSlug, 'senior-data-engineer');
  assert.equal(manifest.lastSlug, 'media-platform-engineer');
  assert.equal((actual.match(/insert into public\.jobs \(/g) || []).length, 46);
  assert.equal((actual.match(/insert into public\.job_categories /g) || []).length, 18);
  assert.ok(actual.includes("'job_catalog_migrated'"));
  assert.ok(actual.includes("'phase_11_legacy_catalog_migration'"));
  assert.ok(!/sb_secret_|SUPABASE_SERVICE_ROLE_KEY|ADMIN_BOOTSTRAP_PASSWORD_VERIFIER/.test(actual));
} finally {
  await rm(temp, { recursive: true, force: true });
}

console.log('PASS: checked Phase 11 seed exactly matches the approved 46-job/18-category source catalog and contains migration audit evidence without secrets.');

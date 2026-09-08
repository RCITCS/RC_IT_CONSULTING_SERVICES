import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'src/backend/config/persistence.js',
  'src/backend/providers/supabase-http.js',
  'src/backend/providers/database-provider.js',
  'src/backend/providers/storage-provider.js',
  'src/backend/repositories/submission-repository.js',
  'supabase/config.toml',
  'supabase/migrations/20260908183500_phase_8_schema.sql',
  'scripts/provision-supabase-storage.mjs',
  'tests/persistence-storage.mjs',
  'docs/DATABASE_STORAGE_ARCHITECTURE.md'
];
for (const relative of required) await access(path.join(root, relative));

const tables = [
  'admins', 'sessions', 'password_reset_tokens', 'job_categories', 'jobs', 'applications',
  'application_documents', 'application_history', 'contact_enquiries', 'candidate_messages',
  'notifications', 'email_logs', 'audit_logs'
];
const migration = await readFile(path.join(root, 'supabase/migrations/20260908183500_phase_8_schema.sql'), 'utf8');
for (const table of tables) {
  if (!migration.includes(`create table if not exists public.${table}`)) throw new Error(`Phase 8 migration missing table: ${table}`);
  if (!migration.includes(`alter table public.${table} enable row level security`)) throw new Error(`Phase 8 migration missing RLS: ${table}`);
}
if (!migration.includes('from anon, authenticated') || !migration.includes('to service_role')) {
  throw new Error('Phase 8 migration must revoke browser roles and explicitly grant the server role.');
}
if (!migration.includes('size_bytes <= 20971520')) throw new Error('Application document metadata must enforce the 20 MiB limit.');
if (/\b(insert\s+into|update|delete\s+from)\s+storage\./i.test(migration)) {
  throw new Error('Storage service metadata must not be mutated directly from the application migration.');
}

const storageConfig = await readFile(path.join(root, 'supabase/config.toml'), 'utf8');
for (const contract of ['public = false', 'file_size_limit = "20MiB"', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']) {
  if (!storageConfig.includes(contract)) throw new Error(`Private storage config missing contract: ${contract}`);
}

const storageProvider = await readFile(path.join(root, 'src/backend/providers/storage-provider.js'), 'utf8');
for (const contract of ['MAX_CANDIDATE_DOCUMENT_BYTES = 20 * 1024 * 1024', 'createSignedDownloadUrl', 'buildCandidateDocumentPath', 'signatureMatches']) {
  if (!storageProvider.includes(contract)) throw new Error(`Storage provider missing Phase 8 contract: ${contract}`);
}
if (storageProvider.includes('/object/public/')) throw new Error('Phase 8 candidate storage must never expose public-object URLs.');

const databaseProvider = await readFile(path.join(root, 'src/backend/providers/database-provider.js'), 'utf8');
if (!databaseProvider.includes('/rest/v1/${table}?select=id')) throw new Error('Supabase database writes must request persisted IDs.');
if (!databaseProvider.includes("prefer: 'return=representation'")) throw new Error('Database writes must require return=representation.');

const application = await readFile(path.join(root, 'src/backend/application.js'), 'utf8');
if (!application.includes('createDatabaseSubmissionRepository(providerRegistry.database)')) {
  throw new Error('Phase 8 durable repository must be wired through the Phase 7 composition root.');
}

async function scanDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await scanDirectory(target));
    else files.push(target);
  }
  return files;
}
for (const file of await scanDirectory(path.join(root, 'src/frontend'))) {
  const source = await readFile(file, 'utf8');
  for (const forbidden of ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_']) {
    if (source.includes(forbidden)) throw new Error(`Server Supabase credential reference leaked into frontend source: ${path.relative(root, file)}`);
  }
}

const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (!packageJson.scripts?.['test:persistence'] || !packageJson.scripts?.test?.includes('test:persistence')) {
  throw new Error('Phase 8 persistence tests must be part of the default regression suite.');
}
if (!packageJson.scripts?.['check:persistence-architecture'] || !packageJson.scripts?.['check:architecture']?.includes('check:persistence-architecture')) {
  throw new Error('Phase 8 persistence architecture checks must be part of the architecture gate.');
}

console.log(`PASS: Phase 8 database/storage architecture, ${tables.length} private data domains, RLS/grants, 20 MiB private-document constraints, server-only Supabase credentials and durable repository wiring verified.`);

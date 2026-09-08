import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'src/backend/application.js',
  'src/backend/api/router.js',
  'src/backend/api/handlers.js',
  'src/backend/config/environment.js',
  'src/backend/core/errors.js',
  'src/backend/core/logger.js',
  'src/backend/core/payload.js',
  'src/backend/core/request-context.js',
  'src/backend/core/response.js',
  'src/backend/providers/database-provider.js',
  'src/backend/providers/storage-provider.js',
  'src/backend/providers/email-provider.js',
  'src/backend/providers/provider-registry.js',
  'src/backend/repositories/submission-repository.js',
  'src/backend/services/submission-service.js',
  'src/backend/validation/common.js',
  'src/backend/validation/submissions.js',
  'src/backend/runtime/worker.js',
  'tests/backend-foundation.mjs',
  'docs/BACKEND_ARCHITECTURE.md'
];

for (const relative of required) await access(path.join(root, relative));

const runtimeWorker = await readFile(path.join(root, 'src/backend/runtime/worker.js'), 'utf8');
for (const requiredImport of ['createBackendApplication', 'routeNeedsJsonBody', 'parseJsonText']) {
  if (!runtimeWorker.includes(requiredImport)) throw new Error(`Cloudflare runtime is missing Phase 7 adapter dependency: ${requiredImport}`);
}
for (const forbidden of ['function isEmail', 'function isPhone', "return json(202", 'validated successfully']) {
  if (runtimeWorker.includes(forbidden)) throw new Error(`Cloudflare runtime regained backend business logic: ${forbidden}`);
}

const workerFacade = await readFile(path.join(root, 'worker/index.js'), 'utf8');
if (!workerFacade.includes("../src/backend/runtime/worker.js")) {
  throw new Error('worker/index.js must remain a thin facade over the canonical Phase 7 runtime worker.');
}

const nodeServer = await readFile(path.join(root, 'server.mjs'), 'utf8');
for (const requiredImport of ['createBackendApplication', 'routeNeedsJsonBody', 'parseJsonText']) {
  if (!nodeServer.includes(requiredImport)) throw new Error(`Node adapter is missing Phase 7 backend dependency: ${requiredImport}`);
}
for (const forbidden of ['appendRecord(', 'resume-submissions.json', 'contact-submissions.json', 'MAX_RESUME_BYTES']) {
  if (nodeServer.includes(forbidden)) throw new Error(`Node runtime still owns persistence/business logic: ${forbidden}`);
}

const vercelAdapter = await readFile(path.join(root, 'api/[action].js'), 'utf8');
if (!vercelAdapter.includes('createBackendApplication') || !vercelAdapter.includes('validateParsedJsonBody')) {
  throw new Error('Vercel fallback must delegate to the shared Phase 7 backend application.');
}
for (const forbidden of ['function email(', 'function phone(', 'allowedResumeExt', 'return respond(res, 202']) {
  if (vercelAdapter.includes(forbidden)) throw new Error(`Vercel adapter still owns backend business logic: ${forbidden}`);
}

const submissionService = await readFile(path.join(root, 'src/backend/services/submission-service.js'), 'utf8');
if (!submissionService.includes('await submissions.create(record)') || !submissionService.includes('persisted.id !== record.id')) {
  throw new Error('Submission service must require repository confirmation before reporting success.');
}

const unavailableRepository = await readFile(path.join(root, 'src/backend/repositories/submission-repository.js'), 'utf8');
if (!unavailableRepository.includes("providerUnavailable(\n        'persistence'")) {
  throw new Error('Unconfigured persistence must fail explicitly rather than report success.');
}

const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (!packageJson.scripts?.['test:backend'] || !packageJson.scripts?.test?.includes('test:backend')) {
  throw new Error('Phase 7 backend tests must be part of the default regression suite.');
}
if (!packageJson.scripts?.['check:backend-architecture'] || !packageJson.scripts?.['check:architecture']?.includes('check:backend-architecture')) {
  throw new Error('Phase 7 backend architecture check must be part of the architecture gate.');
}

console.log(`PASS: Phase 7 layered backend ownership, runtime adapters, provider/repository boundaries and no-fake-success contract verified (${required.length} required paths).`);
